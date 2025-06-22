
import { ScrapedMetadata } from '@/types/aso';
import { KeywordRanking } from './keyword-ranking.service';

export interface RankingCalculationConfig {
  includeCompetitorAnalysis: boolean;
  maxResultsToAnalyze: number;
  confidenceThreshold: number;
  volumeEstimationAlgorithm: 'conservative' | 'optimistic' | 'balanced';
}

export interface RankingCalculationResult {
  ranking: KeywordRanking | null;
  metadata: {
    calculationTime: number;
    competitorsAnalyzed: number;
    algorithmUsed: string;
    confidence: number;
  };
}

class KeywordRankingCalculatorService {
  private readonly defaultConfig: RankingCalculationConfig = {
    includeCompetitorAnalysis: true,
    maxResultsToAnalyze: 20,
    confidenceThreshold: 0.7,
    volumeEstimationAlgorithm: 'balanced'
  };

  /**
   * Calculate keyword ranking based on search results
   */
  calculateRanking(
    keyword: string,
    targetAppId: string,
    searchResults: ScrapedMetadata[],
    config: Partial<RankingCalculationConfig> = {}
  ): RankingCalculationResult {
    const startTime = Date.now();
    const finalConfig = { ...this.defaultConfig, ...config };
    
    try {
      // Find target app position
      const position = this.findAppPosition(targetAppId, searchResults);
      
      if (position === -1) {
        return {
          ranking: null,
          metadata: {
            calculationTime: Date.now() - startTime,
            competitorsAnalyzed: searchResults.length,
            algorithmUsed: 'position_search',
            confidence: 0
          }
        };
      }

      const ranking: KeywordRanking = {
        keyword,
        position: position + 1, // Convert to 1-based position
        volume: this.estimateSearchVolume(keyword, searchResults, finalConfig),
        trend: this.estimateTrend(keyword, position, searchResults),
        searchResults: Math.min(searchResults.length, finalConfig.maxResultsToAnalyze),
        lastChecked: new Date(),
        confidence: 'actual'
      };

      const confidence = this.calculateConfidence(ranking, searchResults, finalConfig);

      return {
        ranking,
        metadata: {
          calculationTime: Date.now() - startTime,
          competitorsAnalyzed: searchResults.length,
          algorithmUsed: finalConfig.volumeEstimationAlgorithm,
          confidence
        }
      };

    } catch (error) {
      console.error('❌ [RANKING-CALCULATOR] Calculation failed:', error);
      return {
        ranking: null,
        metadata: {
          calculationTime: Date.now() - startTime,
          competitorsAnalyzed: 0,
          algorithmUsed: 'error',
          confidence: 0
        }
      };
    }
  }

  /**
   * Find app position in search results
   */
  private findAppPosition(targetAppId: string, searchResults: ScrapedMetadata[]): number {
    return searchResults.findIndex(app => {
      // Multiple ways to match the app
      return (
        app.appId === targetAppId ||
        app.name.toLowerCase().includes(targetAppId.toLowerCase()) ||
        app.url?.includes(targetAppId)
      );
    });
  }

  /**
   * Estimate search volume based on competition and keyword characteristics
   */
  private estimateSearchVolume(
    keyword: string,
    searchResults: ScrapedMetadata[],
    config: RankingCalculationConfig
  ): 'Low' | 'Medium' | 'High' {
    const competitorCount = searchResults.length;
    const wordCount = keyword.split(' ').length;
    const keywordLength = keyword.length;

    // Algorithm selection based on config
    switch (config.volumeEstimationAlgorithm) {
      case 'conservative':
        return this.conservativeVolumeEstimation(competitorCount, wordCount, keywordLength);
      case 'optimistic':
        return this.optimisticVolumeEstimation(competitorCount, wordCount, keywordLength);
      default:
        return this.balancedVolumeEstimation(competitorCount, wordCount, keywordLength);
    }
  }

  private conservativeVolumeEstimation(competitorCount: number, wordCount: number, keywordLength: number): 'Low' | 'Medium' | 'High' {
    if (competitorCount > 20 && wordCount <= 2 && keywordLength <= 15) return 'High';
    if (competitorCount > 12 || (wordCount <= 2 && competitorCount > 8)) return 'Medium';
    return 'Low';
  }

  private optimisticVolumeEstimation(competitorCount: number, wordCount: number, keywordLength: number): 'Low' | 'Medium' | 'High' {
    if (competitorCount > 10 && wordCount <= 3) return 'High';
    if (competitorCount > 5 || wordCount <= 3) return 'Medium';
    return 'Low';
  }

  private balancedVolumeEstimation(competitorCount: number, wordCount: number, keywordLength: number): 'Low' | 'Medium' | 'High' {
    if (competitorCount > 15 && wordCount <= 2) return 'High';
    if (competitorCount > 8 || (wordCount <= 2 && competitorCount > 5)) return 'Medium';
    return 'Low';
  }

  /**
   * Estimate trend based on position and competitive analysis
   */
  private estimateTrend(keyword: string, position: number, searchResults: ScrapedMetadata[]): 'up' | 'down' | 'stable' {
    // For now, return stable as we don't have historical data
    // This can be enhanced with actual trend analysis later
    if (position <= 3) return 'up';
    if (position > 15) return 'down';
    return 'stable';
  }

  /**
   * Calculate confidence score for the ranking
   */
  private calculateConfidence(
    ranking: KeywordRanking,
    searchResults: ScrapedMetadata[],
    config: RankingCalculationConfig
  ): number {
    let confidence = 0.8; // Base confidence for actual search

    // Adjust based on position
    if (ranking.position <= 5) confidence += 0.1;
    if (ranking.position > 20) confidence -= 0.2;

    // Adjust based on search results quality
    if (searchResults.length >= config.maxResultsToAnalyze) confidence += 0.1;
    if (searchResults.length < 5) confidence -= 0.3;

    // Adjust based on keyword characteristics
    const wordCount = ranking.keyword.split(' ').length;
    if (wordCount <= 2) confidence += 0.05;
    if (wordCount > 4) confidence -= 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Batch calculate rankings for multiple keywords
   */
  calculateBatchRankings(
    keywords: string[],
    targetAppId: string,
    searchResultsMap: Map<string, ScrapedMetadata[]>,
    config: Partial<RankingCalculationConfig> = {}
  ): Map<string, RankingCalculationResult> {
    const results = new Map<string, RankingCalculationResult>();

    for (const keyword of keywords) {
      const searchResults = searchResultsMap.get(keyword) || [];
      const result = this.calculateRanking(keyword, targetAppId, searchResults, config);
      results.set(keyword, result);
    }

    return results;
  }
}

export const keywordRankingCalculatorService = new KeywordRankingCalculatorService();
