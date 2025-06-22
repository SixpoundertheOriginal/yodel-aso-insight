
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
}

export interface KeywordAnalysisConfig {
  organizationId: string;
  maxKeywords?: number;
  includeCompetitors?: boolean;
  debugMode?: boolean;
}

class KeywordRankingService {
  
  /**
   * Extract potential keywords from app metadata
   */
  private extractKeywordsFromMetadata(app: ScrapedMetadata): string[] {
    const keywords: string[] = [];
    
    // Extract from title
    if (app.title) {
      keywords.push(...this.tokenizeText(app.title));
    }
    
    // Extract from subtitle
    if (app.subtitle) {
      keywords.push(...this.tokenizeText(app.subtitle));
    }
    
    // Extract from description (first 200 chars to avoid noise)
    if (app.description) {
      const shortDescription = app.description.substring(0, 200);
      keywords.push(...this.tokenizeText(shortDescription));
    }
    
    // Add category-based keywords
    if (app.applicationCategory) {
      keywords.push(app.applicationCategory.toLowerCase());
      keywords.push(...this.getCategoryKeywords(app.applicationCategory));
    }
    
    // Remove duplicates and filter
    return this.filterAndCleanKeywords(keywords);
  }
  
  /**
   * Tokenize text into potential keywords
   */
  private tokenizeText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .concat(this.extractPhrases(text));
  }
  
  /**
   * Extract 2-3 word phrases from text
   */
  private extractPhrases(text: string): string[] {
    const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/);
    const phrases: string[] = [];
    
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i].length > 2 && words[i + 1].length > 2) {
        phrases.push(`${words[i]} ${words[i + 1]}`);
      }
      
      if (i < words.length - 2 && words[i + 2].length > 2) {
        phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
      }
    }
    
    return phrases;
  }
  
  /**
   * Get common keywords for app category
   */
  private getCategoryKeywords(category: string): string[] {
    const categoryMap: Record<string, string[]> = {
      'education': ['learn', 'study', 'course', 'lesson', 'tutorial'],
      'productivity': ['work', 'organize', 'manage', 'task', 'efficient'],
      'health': ['fitness', 'workout', 'health', 'wellness', 'exercise'],
      'entertainment': ['fun', 'game', 'play', 'enjoy', 'entertainment'],
      'social': ['social', 'chat', 'connect', 'friends', 'community'],
      'finance': ['money', 'budget', 'finance', 'banking', 'invest'],
    };
    
    const normalizedCategory = category.toLowerCase();
    return categoryMap[normalizedCategory] || [];
  }
  
  /**
   * Filter and clean keyword list
   */
  private filterAndCleanKeywords(keywords: string[]): string[] {
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 
      'her', 'was', 'one', 'our', 'day', 'get', 'has', 'him', 'how', 'man',
      'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'its', 'let',
      'put', 'say', 'she', 'too', 'use', 'app', 'apps'
    ]);
    
    return [...new Set(keywords)]
      .filter(keyword => {
        const trimmed = keyword.trim();
        return trimmed.length > 2 && 
               !stopWords.has(trimmed) && 
               !trimmed.match(/^\d+$/) &&
               trimmed.length < 50;
      })
      .slice(0, 50); // Limit to top 50 potential keywords
  }
  
  /**
   * Check app ranking for a specific keyword
   */
  async checkKeywordRanking(keyword: string, targetAppId: string, config: KeywordAnalysisConfig): Promise<KeywordRanking | null> {
    try {
      console.log(`🔍 [KEYWORD-RANKING] Checking ranking for "${keyword}" for app ${targetAppId}`);
      
      // Use existing search service to find apps for this keyword
      const searchResult = await asoSearchService.search(keyword, {
        organizationId: config.organizationId,
        includeIntelligence: false,
        debugMode: config.debugMode
      });
      
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
        trend: 'stable', // TODO: Implement trend tracking
        searchResults: searchResult.competitors.length + 1,
        lastChecked: new Date()
      };
      
    } catch (error) {
      console.error(`❌ [KEYWORD-RANKING] Failed to check ranking for "${keyword}":`, error);
      return null;
    }
  }
  
  /**
   * Estimate search volume based on competition
   */
  private estimateSearchVolume(keyword: string, competitorCount: number): 'Low' | 'Medium' | 'High' {
    // Simple heuristic based on keyword characteristics and competition
    const wordCount = keyword.split(' ').length;
    
    if (competitorCount > 15 && wordCount <= 2) return 'High';
    if (competitorCount > 8 || (wordCount <= 2 && competitorCount > 5)) return 'Medium';
    return 'Low';
  }
  
  /**
   * Analyze keyword rankings for an app
   */
  async analyzeAppKeywords(app: ScrapedMetadata, config: KeywordAnalysisConfig): Promise<KeywordRanking[]> {
    console.log(`🎯 [KEYWORD-RANKING] Starting keyword analysis for ${app.name}`);
    
    // Extract potential keywords
    const keywords = this.extractKeywordsFromMetadata(app);
    console.log(`📝 [KEYWORD-RANKING] Found ${keywords.length} potential keywords:`, keywords.slice(0, 10));
    
    const rankings: KeywordRanking[] = [];
    const maxKeywords = Math.min(keywords.length, config.maxKeywords || 20);
    
    // Check rankings for each keyword (with rate limiting)
    for (let i = 0; i < maxKeywords; i++) {
      const keyword = keywords[i];
      
      try {
        const ranking = await this.checkKeywordRanking(keyword, app.appId, config);
        if (ranking && ranking.position <= 50) { // Only keep rankings in top 50
          rankings.push(ranking);
        }
        
        // Rate limiting - wait between requests
        if (i < maxKeywords - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.warn(`⚠️ [KEYWORD-RANKING] Failed to check keyword "${keyword}":`, error);
        continue;
      }
    }
    
    // Sort by ranking position (best first)
    rankings.sort((a, b) => a.position - b.position);
    
    console.log(`✅ [KEYWORD-RANKING] Analysis complete: found ${rankings.length} ranked keywords`);
    return rankings.slice(0, 20); // Return top 20 rankings
  }
  
  /**
   * Get cached rankings or perform fresh analysis
   */
  async getAppKeywordRankings(app: ScrapedMetadata, config: KeywordAnalysisConfig): Promise<KeywordRanking[]> {
    // TODO: Implement caching logic
    // For now, always perform fresh analysis
    return this.analyzeAppKeywords(app, config);
  }
}

export const keywordRankingService = new KeywordRankingService();
