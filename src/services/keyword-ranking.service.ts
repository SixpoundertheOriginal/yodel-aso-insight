
import { supabase } from '@/integrations/supabase/client';
import { asoSearchService } from './aso-search.service';
import { ScrapedMetadata } from '@/types/aso';

export interface KeywordRanking {
  keyword: string;
  position: number;
  volume: 'Low' | 'Medium' | 'High';
  trend: 'up' | 'down' | 'stable';
  searchResults: number;
  lastChecked: Date;
  confidence: 'estimated' | 'actual';
}

export interface KeywordAnalysisConfig {
  organizationId: string;
  maxKeywords?: number;
  includeCompetitors?: boolean;
  debugMode?: boolean;
}

// Circuit breaker to prevent infinite failure loops
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly maxFailures = 3;
  private readonly resetTimeMs = 30000; // 30 seconds

  isOpen(): boolean {
    if (this.failures >= this.maxFailures) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure < this.resetTimeMs) {
        return true; // Circuit is open
      } else {
        // Reset circuit breaker
        this.failures = 0;
        return false;
      }
    }
    return false;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  recordSuccess(): void {
    this.failures = 0;
  }
}

class KeywordRankingService {
  private circuitBreaker = new CircuitBreaker();
  
  /**
   * Enhanced stop words list to filter out generic terms
   */
  private stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 
    'her', 'was', 'one', 'our', 'day', 'get', 'has', 'him', 'how', 'man',
    'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'its', 'let',
    'put', 'say', 'she', 'too', 'use', 'app', 'apps', 'with', 'your', 'from',
    'they', 'this', 'have', 'will', 'been', 'that', 'what', 'more', 'make',
    'when', 'time', 'very', 'than', 'just', 'like', 'good', 'into', 'over',
    'think', 'also', 'back', 'after', 'first', 'well', 'way', 'even', 'want',
    'work', 'life', 'only', 'come', 'right', 'down', 'help', 'through', 
    'much', 'before', 'move', 'try', 'such', 'because', 'turn', 'here',
    'where', 'why', 'again', 'being', 'both', 'few', 'while', 'same',
    'each', 'most', 'those', 'people', 'take', 'year', 'still', 'place',
    'world', 'should', 'never', 'system', 'between', 'some', 'part',
    'during', 'without', 'might', 'almost', 'every', 'today', 'toward',
    'progress', 'nutrition'
  ]);

  /**
   * Extract and filter potential keywords from app metadata
   */
  private extractKeywordsFromMetadata(app: ScrapedMetadata): string[] {
    const keywords: string[] = [];
    
    // Extract from title (prioritize app name components)
    if (app.title) {
      keywords.push(...this.tokenizeText(app.title));
    }
    
    // Extract from subtitle
    if (app.subtitle) {
      keywords.push(...this.tokenizeText(app.subtitle));
    }
    
    // Extract from description (first 150 chars only)
    if (app.description) {
      const shortDescription = app.description.substring(0, 150);
      keywords.push(...this.tokenizeText(shortDescription));
    }
    
    // Add category-based keywords
    if (app.applicationCategory) {
      keywords.push(app.applicationCategory.toLowerCase());
      keywords.push(...this.getCategoryKeywords(app.applicationCategory));
    }
    
    // Filter and prioritize meaningful keywords
    return this.filterAndPrioritizeKeywords(keywords);
  }
  
  /**
   * Tokenize text with focus on meaningful phrases
   */
  private tokenizeText(text: string): string[] {
    const cleaned = text.toLowerCase().replace(/[^\w\s]/g, ' ');
    const words = cleaned.split(/\s+/).filter(word => word.length > 2);
    const keywords: string[] = [];
    
    // Add 2-3 word phrases (more meaningful than single words)
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i].length > 2 && words[i + 1].length > 2) {
        keywords.push(`${words[i]} ${words[i + 1]}`);
      }
      
      if (i < words.length - 2 && words[i + 2].length > 2) {
        keywords.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
      }
    }
    
    // Add single meaningful words (4+ characters, not stop words)
    keywords.push(...words.filter(word => 
      word.length >= 4 && 
      !this.stopWords.has(word) && 
      !word.match(/^\d+$/)
    ));
    
    return keywords;
  }
  
  /**
   * Get category-specific relevant keywords
   */
  private getCategoryKeywords(category: string): string[] {
    const categoryMap: Record<string, string[]> = {
      'education': ['learn', 'study', 'course', 'tutorial', 'education'],
      'productivity': ['organize', 'manage', 'task', 'efficient', 'productivity'],
      'health': ['fitness', 'workout', 'health', 'wellness', 'medical'],
      'entertainment': ['game', 'play', 'enjoy', 'entertainment', 'fun'],
      'social': ['social', 'chat', 'connect', 'friends', 'community'],
      'finance': ['money', 'budget', 'finance', 'banking', 'invest'],
      'food': ['food', 'recipe', 'cooking', 'restaurant', 'meal'],
      'travel': ['travel', 'trip', 'hotel', 'flight', 'vacation'],
      'shopping': ['shop', 'buy', 'store', 'deal', 'shopping'],
      'business': ['business', 'work', 'team', 'company', 'professional']
    };
    
    const normalizedCategory = category.toLowerCase();
    return categoryMap[normalizedCategory] || [];
  }
  
  /**
   * Filter and prioritize keywords for better search success
   */
  private filterAndPrioritizeKeywords(keywords: string[]): string[] {
    // Remove duplicates and filter
    const uniqueKeywords = [...new Set(keywords)]
      .filter(keyword => {
        const trimmed = keyword.trim();
        return trimmed.length > 3 && 
               !this.stopWords.has(trimmed) && 
               !trimmed.match(/^\d+$/) &&
               trimmed.length < 30 &&
               !trimmed.includes('app') && // Avoid generic "app" terms
               trimmed.split(' ').length <= 3; // Max 3 words
      });
    
    // Prioritize longer phrases (more specific)
    return uniqueKeywords
      .sort((a, b) => {
        const aWords = a.split(' ').length;
        const bWords = b.split(' ').length;
        if (aWords !== bWords) return bWords - aWords; // More words first
        return b.length - a.length; // Longer phrases first
      })
      .slice(0, 10); // Limit to top 10 meaningful keywords
  }
  
  /**
   * Create estimated rankings when actual search fails
   */
  private createEstimatedRanking(keyword: string, index: number): KeywordRanking {
    const wordCount = keyword.split(' ').length;
    const keywordLength = keyword.length;
    
    // Estimate position based on keyword specificity
    let estimatedPosition: number;
    if (wordCount >= 3 || keywordLength > 15) {
      estimatedPosition = Math.floor(Math.random() * 20) + 1; // 1-20 for specific terms
    } else if (wordCount === 2) {
      estimatedPosition = Math.floor(Math.random() * 30) + 10; // 10-40 for medium terms
    } else {
      estimatedPosition = Math.floor(Math.random() * 50) + 20; // 20-70 for generic terms
    }
    
    // Estimate volume based on keyword characteristics
    let volume: 'Low' | 'Medium' | 'High';
    if (wordCount === 1 && keywordLength < 8) {
      volume = 'High';
    } else if (wordCount === 2) {
      volume = 'Medium';
    } else {
      volume = 'Low';
    }
    
    return {
      keyword,
      position: estimatedPosition,
      volume,
      trend: 'stable',
      searchResults: Math.floor(Math.random() * 1000) + 100,
      lastChecked: new Date(),
      confidence: 'estimated'
    };
  }
  
  /**
   * Check app ranking for a specific keyword with circuit breaker
   */
  async checkKeywordRanking(keyword: string, targetAppId: string, config: KeywordAnalysisConfig): Promise<KeywordRanking | null> {
    // Check circuit breaker
    if (this.circuitBreaker.isOpen()) {
      console.log(`🚫 [KEYWORD-RANKING] Circuit breaker open, skipping search for "${keyword}"`);
      return null;
    }
    
    try {
      console.log(`🔍 [KEYWORD-RANKING] Checking ranking for "${keyword}" for app ${targetAppId}`);
      
      // Use existing search service to find apps for this keyword
      const searchResult = await asoSearchService.search(keyword, {
        organizationId: config.organizationId,
        includeIntelligence: false,
        debugMode: config.debugMode
      });
      
      // Record success
      this.circuitBreaker.recordSuccess();
      
      // Check if target app appears in search results
      const allApps = [searchResult.targetApp, ...searchResult.competitors];
      const appPosition = allApps.findIndex(app => 
        app.appId === targetAppId || 
        app.name.toLowerCase().includes(targetAppId.toLowerCase())
      );
      
      if (appPosition === -1) {
        return null; // App not found in top results
      }
      
      const position = appPosition + 1;
      
      return {
        keyword,
        position,
        volume: this.estimateSearchVolume(keyword, searchResult.competitors.length),
        trend: 'stable',
        searchResults: searchResult.competitors.length + 1,
        lastChecked: new Date(),
        confidence: 'actual'
      };
      
    } catch (error) {
      console.error(`❌ [KEYWORD-RANKING] Failed to check ranking for "${keyword}":`, error);
      
      // Record failure
      this.circuitBreaker.recordFailure();
      
      return null;
    }
  }
  
  /**
   * Estimate search volume based on competition and keyword characteristics
   */
  private estimateSearchVolume(keyword: string, competitorCount: number): 'Low' | 'Medium' | 'High' {
    const wordCount = keyword.split(' ').length;
    
    if (competitorCount > 15 && wordCount <= 2) return 'High';
    if (competitorCount > 8 || (wordCount <= 2 && competitorCount > 5)) return 'Medium';
    return 'Low';
  }
  
  /**
   * Analyze keyword rankings with enhanced error handling and fallbacks
   */
  async analyzeAppKeywords(app: ScrapedMetadata, config: KeywordAnalysisConfig): Promise<KeywordRanking[]> {
    console.log(`🎯 [KEYWORD-RANKING] Starting enhanced keyword analysis for ${app.name}`);
    
    // Extract and filter keywords
    const keywords = this.extractKeywordsFromMetadata(app);
    console.log(`📝 [KEYWORD-RANKING] Found ${keywords.length} filtered keywords:`, keywords);
    
    if (keywords.length === 0) {
      console.log('⚠️ [KEYWORD-RANKING] No suitable keywords found, using app name');
      keywords.push(app.name.toLowerCase());
    }
    
    const rankings: KeywordRanking[] = [];
    const maxKeywords = Math.min(keywords.length, config.maxKeywords || 5); // Limit to 5 max
    let successCount = 0;
    let failureCount = 0;
    
    // Check rankings for each keyword with limits
    for (let i = 0; i < maxKeywords; i++) {
      const keyword = keywords[i];
      
      try {
        // Check if circuit breaker is open
        if (this.circuitBreaker.isOpen()) {
          console.log('🚫 [KEYWORD-RANKING] Circuit breaker open, falling back to estimated rankings');
          break;
        }
        
        const ranking = await this.checkKeywordRanking(keyword, app.appId, config);
        
        if (ranking) {
          rankings.push(ranking);
          successCount++;
        } else {
          failureCount++;
        }
        
        // Stop if too many failures
        if (failureCount >= 3) {
          console.log('⚠️ [KEYWORD-RANKING] Too many failures, stopping actual searches');
          break;
        }
        
        // Rate limiting between requests
        if (i < maxKeywords - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s delay
        }
        
      } catch (error) {
        console.warn(`⚠️ [KEYWORD-RANKING] Failed to check keyword "${keyword}":`, error);
        failureCount++;
        
        // Stop on repeated failures
        if (failureCount >= 3) {
          break;
        }
      }
    }
    
    // If we have very few actual rankings, supplement with estimated ones
    if (rankings.length < 3) {
      console.log(`📊 [KEYWORD-RANKING] Only ${rankings.length} actual rankings found, adding estimated ones`);
      
      const remainingKeywords = keywords.slice(rankings.length, Math.min(keywords.length, 5));
      remainingKeywords.forEach((keyword, index) => {
        rankings.push(this.createEstimatedRanking(keyword, index));
      });
    }
    
    // Sort by ranking position (best first)
    rankings.sort((a, b) => a.position - b.position);
    
    console.log(`✅ [KEYWORD-RANKING] Analysis complete: ${successCount} actual, ${rankings.length - successCount} estimated rankings`);
    return rankings.slice(0, 10); // Return top 10 rankings
  }
  
  /**
   * Get cached rankings or perform analysis with fallbacks
   */
  async getAppKeywordRankings(app: ScrapedMetadata, config: KeywordAnalysisConfig): Promise<KeywordRanking[]> {
    try {
      return await this.analyzeAppKeywords(app, config);
    } catch (error) {
      console.error('❌ [KEYWORD-RANKING] Complete analysis failure, providing fallback rankings:', error);
      
      // Provide basic fallback rankings based on app metadata
      const fallbackKeywords = [
        app.name.toLowerCase(),
        app.applicationCategory?.toLowerCase() || 'app',
        'mobile app'
      ];
      
      return fallbackKeywords.map((keyword, index) => 
        this.createEstimatedRanking(keyword, index)
      );
    }
  }
}

export const keywordRankingService = new KeywordRankingService();
