
import { supabase } from '@/integrations/supabase/client';
import { asoSearchService } from './aso-search.service';
import { keywordIntelligenceService } from './keyword-intelligence.service';
import { keywordValidationService } from './keyword-validation.service';
import { keywordCacheService } from './keyword-cache.service';
import { keywordRankingCalculatorService } from './keyword-ranking-calculator.service';
import { securityService } from './security.service';
import { CircuitBreaker } from '@/lib/utils/circuit-breaker';
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
  cacheEnabled?: boolean;
  batchProcessing?: boolean;
}

export interface KeywordAnalysisResult {
  rankings: KeywordRanking[];
  metadata: {
    totalProcessed: number;
    actualRankings: number;
    estimatedRankings: number;
    cacheHits: number;
    processingTime: number;
    circuitBreakerTripped: boolean;
  };
}

class KeywordRankingService {
  private circuitBreaker = new CircuitBreaker({
    maxFailures: 3,
    resetTimeMs: 30000,
    name: 'KeywordRankingService'
  });

  /**
   * Enhanced keyword ranking check with validation and caching
   */
  async checkKeywordRanking(
    keyword: string, 
    targetAppId: string, 
    config: KeywordAnalysisConfig
  ): Promise<KeywordRanking | null> {
    const startTime = Date.now();

    try {
      // Validate and sanitize keyword
      const validation = keywordValidationService.validateKeyword(keyword, {
        organizationId: config.organizationId,
        maxKeywordLength: 100,
        allowSpecialChars: false
      });

      if (!validation.isValid) {
        console.warn(`⚠️ [KEYWORD-RANKING] Invalid keyword "${keyword}":`, validation.errors);
        return null;
      }

      const sanitizedKeyword = validation.sanitizedKeyword;
      const cacheKey = `ranking:${sanitizedKeyword}:${targetAppId}`;

      // Check cache first if enabled
      if (config.cacheEnabled) {
        const cached = keywordCacheService.get<KeywordRanking>(cacheKey, config.organizationId);
        if (cached) {
          console.log(`💾 [KEYWORD-RANKING] Cache hit for "${sanitizedKeyword}"`);
          return cached;
        }
      }

      // Check circuit breaker
      if (this.circuitBreaker.isOpen()) {
        console.log(`🚫 [KEYWORD-RANKING] Circuit breaker open, skipping search for "${sanitizedKeyword}"`);
        return null;
      }

      // Log audit entry for security
      await securityService.logAuditEntry({
        organizationId: config.organizationId,
        userId: 'system',
        action: 'keyword_ranking_check',
        resourceType: 'keyword_analysis',
        resourceId: sanitizedKeyword,
        details: {
          keyword: sanitizedKeyword,
          targetAppId,
          originalKeyword: keyword,
          sanitized: validation.metadata.wasModified
        },
        ipAddress: '127.0.0.1',
        userAgent: 'KeywordRankingService'
      });

      console.log(`🔍 [KEYWORD-RANKING] Checking ranking for "${sanitizedKeyword}" for app ${targetAppId}`);

      // Use existing search service
      const searchResult = await asoSearchService.search(sanitizedKeyword, {
        organizationId: config.organizationId,
        includeIntelligence: false,
        debugMode: config.debugMode
      });

      // Calculate ranking using the dedicated calculator
      const allApps = [searchResult.targetApp, ...searchResult.competitors];
      const calculationResult = keywordRankingCalculatorService.calculateRanking(
        sanitizedKeyword,
        targetAppId,
        allApps,
        {
          includeCompetitorAnalysis: config.includeCompetitors || false,
          maxResultsToAnalyze: 20,
          confidenceThreshold: 0.7,
          volumeEstimationAlgorithm: 'balanced'
        }
      );

      if (!calculationResult.ranking) {
        this.circuitBreaker.recordSuccess(); // Not a failure, just no result
        return null;
      }

      const ranking = calculationResult.ranking;

      // Cache the result if enabled
      if (config.cacheEnabled) {
        keywordCacheService.set(cacheKey, ranking, config.organizationId, 1800000); // 30 minutes
      }

      // Record success
      this.circuitBreaker.recordSuccess();

      console.log(`✅ [KEYWORD-RANKING] Found ranking for "${sanitizedKeyword}": position ${ranking.position}`);
      return ranking;

    } catch (error) {
      console.error(`❌ [KEYWORD-RANKING] Failed to check ranking for "${keyword}":`, error);
      this.circuitBreaker.recordFailure();
      return null;
    }
  }

  /**
   * Enhanced keyword analysis with batch processing and caching
   */
  async analyzeAppKeywords(app: ScrapedMetadata, config: KeywordAnalysisConfig): Promise<KeywordAnalysisResult> {
    const startTime = Date.now();
    console.log(`🎯 [KEYWORD-RANKING] Starting enhanced keyword analysis for ${app.name}`);

    let cacheHits = 0;
    let actualRankingsChecked = 0;
    const maxActualChecks = 3;

    try {
      // Generate smart keywords using intelligence service
      const smartKeywords = keywordIntelligenceService.generateSmartKeywords(app);
      const rankings = keywordIntelligenceService.convertToRankingFormat(smartKeywords);

      // Process high-priority keywords for actual ranking checks
      const highPriorityKeywords = rankings
        .filter(r => r.priority === 'high')
        .slice(0, maxActualChecks);

      // Batch process if enabled
      if (config.batchProcessing && highPriorityKeywords.length > 1) {
        console.log(`🔄 [KEYWORD-RANKING] Batch processing ${highPriorityKeywords.length} high-priority keywords`);
        
        const batchPromises = highPriorityKeywords.map(async (ranking, index) => {
          // Add delay between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, index * 1000));
          
          const actualRanking = await this.checkKeywordRanking(ranking.keyword, app.appId, config);
          if (actualRanking) {
            // Update with actual data
            ranking.position = actualRanking.position;
            ranking.confidence = 'actual';
            ranking.searchResults = actualRanking.searchResults;
            return true;
          }
          return false;
        });

        const results = await Promise.allSettled(batchPromises);
        actualRankingsChecked = results.filter(r => r.status === 'fulfilled' && r.value).length;

      } else {
        // Sequential processing for backward compatibility
        for (const ranking of highPriorityKeywords) {
          if (actualRankingsChecked >= maxActualChecks) break;
          if (this.circuitBreaker.isOpen()) break;

          try {
            const actualRanking = await this.checkKeywordRanking(ranking.keyword, app.appId, config);
            if (actualRanking) {
              ranking.position = actualRanking.position;
              ranking.confidence = 'actual';
              ranking.searchResults = actualRanking.searchResults;
              actualRankingsChecked++;
            }

            // Rate limiting between requests
            await new Promise(resolve => setTimeout(resolve, 1000));

          } catch (error) {
            console.warn(`⚠️ [KEYWORD-RANKING] Failed to check actual ranking for "${ranking.keyword}":`, error);
            break;
          }
        }
      }

      // Sort by ranking position (best first)
      rankings.sort((a, b) => a.position - b.position);

      const processingTime = Date.now() - startTime;
      const estimatedRankings = rankings.length - actualRankingsChecked;

      console.log(`✅ [KEYWORD-RANKING] Enhanced analysis complete: ${actualRankingsChecked} actual, ${estimatedRankings} estimated rankings (${processingTime}ms)`);

      return {
        rankings,
        metadata: {
          totalProcessed: rankings.length,
          actualRankings: actualRankingsChecked,
          estimatedRankings,
          cacheHits,
          processingTime,
          circuitBreakerTripped: this.circuitBreaker.getState().isOpen
        }
      };

    } catch (error) {
      console.error('❌ [KEYWORD-RANKING] Enhanced analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get keyword rankings with enhanced features and fallback
   */
  async getAppKeywordRankings(app: ScrapedMetadata, config: KeywordAnalysisConfig): Promise<KeywordRanking[]> {
    try {
      // Set default configuration
      const enhancedConfig: KeywordAnalysisConfig = {
        cacheEnabled: true,
        batchProcessing: true,
        ...config
      };

      const result = await this.analyzeAppKeywords(app, enhancedConfig);
      return result.rankings;

    } catch (error) {
      console.error('❌ [KEYWORD-RANKING] Complete analysis failure, providing secure fallback rankings:', error);

      // Provide basic fallback rankings with proper typing and validation
      const fallbackKeywords: Array<{ keyword: string; priority: 'high' | 'medium' | 'low' }> = [
        { keyword: app.name.toLowerCase(), priority: 'high' },
        { keyword: 'mobile app', priority: 'low' },
        { keyword: app.applicationCategory?.toLowerCase() || 'app', priority: 'medium' }
      ];

      // Validate fallback keywords
      const validatedKeywords = fallbackKeywords
        .map(item => {
          const validation = keywordValidationService.validateKeyword(item.keyword, {
            organizationId: config.organizationId,
            maxKeywordLength: 100
          });
          return validation.isValid ? { ...item, keyword: validation.sanitizedKeyword } : null;
        })
        .filter(Boolean) as Array<{ keyword: string; priority: 'high' | 'medium' | 'low' }>;

      return validatedKeywords.map((item, index) => ({
        keyword: item.keyword,
        position: (index + 1) * 10,
        volume: 'Low' as const,
        trend: 'stable' as const,
        searchResults: 100,
        lastChecked: new Date(),
        confidence: 'estimated' as const,
        priority: item.priority,
        type: 'fallback',
        reason: 'Secure fallback keyword due to analysis failure'
      }));
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    const circuitBreakerState = this.circuitBreaker.getState();
    const cacheStats = keywordCacheService.getStats();

    return {
      circuitBreaker: circuitBreakerState,
      cache: cacheStats,
      status: circuitBreakerState.isOpen ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset circuit breaker manually
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
    console.log('🔄 [KEYWORD-RANKING] Circuit breaker manually reset');
  }

  /**
   * Clear cache for organization
   */
  clearCache(organizationId: string): number {
    return keywordCacheService.clearOrganization(organizationId);
  }
}

export const keywordRankingService = new KeywordRankingService();
