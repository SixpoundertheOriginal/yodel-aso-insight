
import { supabase } from '@/integrations/supabase/client';
import { asoSearchService } from './aso-search.service';
import { keywordIntelligenceService } from './keyword-intelligence.service';
import { ScrapedMetadata } from '@/types/aso';

export interface KeywordRanking {
  keyword: string;
  position: number;
  volume: 'Low' | 'Medium' | 'High';
  trend: 'up' | 'down' | 'stable';
  searchResults: number;
  lastChecked: Date;
  confidence: 'estimated' | 'actual';
  priority?: 'high' | 'medium' | 'low';
  type?: string;
  reason?: string;
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
   * Enhanced keyword analysis using smart keyword intelligence
   */
  async analyzeAppKeywords(app: ScrapedMetadata, config: KeywordAnalysisConfig): Promise<KeywordRanking[]> {
    console.log(`🎯 [KEYWORD-RANKING] Starting smart keyword analysis for ${app.name}`);
    
    // Generate smart keywords using the intelligence service
    const smartKeywords = keywordIntelligenceService.generateSmartKeywords(app);
    const rankings = keywordIntelligenceService.convertToRankingFormat(smartKeywords);
    
    console.log(`📊 [KEYWORD-RANKING] Generated ${rankings.length} intelligent keyword rankings`);
    
    // Try to get actual rankings for a few high-priority keywords
    let actualRankingsChecked = 0;
    const maxActualChecks = 3; // Limit actual checks to prevent failures
    
    for (const ranking of rankings) {
      if (actualRankingsChecked >= maxActualChecks) break;
      if (ranking.priority !== 'high') continue;
      if (this.circuitBreaker.isOpen()) break;
      
      try {
        const actualRanking = await this.checkKeywordRanking(ranking.keyword, app.appId, config);
        if (actualRanking) {
          // Update with actual data
          ranking.position = actualRanking.position;
          ranking.confidence = 'actual';
          ranking.searchResults = actualRanking.searchResults;
          actualRankingsChecked++;
        }
        
        // Rate limiting between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.warn(`⚠️ [KEYWORD-RANKING] Failed to check actual ranking for "${ranking.keyword}":`, error);
        break; // Stop trying actual checks on error
      }
    }
    
    // Sort by ranking position (best first)
    rankings.sort((a, b) => a.position - b.position);
    
    console.log(`✅ [KEYWORD-RANKING] Analysis complete: ${actualRankingsChecked} actual, ${rankings.length - actualRankingsChecked} estimated rankings`);
    return rankings;
  }
  
  /**
   * Get keyword rankings with smart analysis and fallbacks
   */
  async getAppKeywordRankings(app: ScrapedMetadata, config: KeywordAnalysisConfig): Promise<KeywordRanking[]> {
    try {
      return await this.analyzeAppKeywords(app, config);
    } catch (error) {
      console.error('❌ [KEYWORD-RANKING] Complete analysis failure, providing fallback rankings:', error);
      
      // Provide basic fallback rankings with proper typing
      const fallbackKeywords: Array<{ keyword: string; priority: 'high' | 'medium' | 'low' }> = [
        { keyword: app.name.toLowerCase(), priority: 'high' },
        { keyword: 'mobile app', priority: 'low' },
        { keyword: app.applicationCategory?.toLowerCase() || 'app', priority: 'medium' }
      ];
      
      return fallbackKeywords.map((item, index) => ({
        keyword: item.keyword,
        position: (index + 1) * 10,
        volume: 'Low' as const,
        trend: 'stable' as const,
        searchResults: 100,
        lastChecked: new Date(),
        confidence: 'estimated' as const,
        priority: item.priority,
        type: 'fallback',
        reason: 'Fallback keyword due to analysis failure'
      }));
    }
  }
}

export const keywordRankingService = new KeywordRankingService();
