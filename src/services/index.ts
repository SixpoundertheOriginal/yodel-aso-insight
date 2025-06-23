export { appStoreService } from './app-store.service';
export { competitorAnalysisService } from './competitor-analysis.service';
export { competitiveIntelligenceService } from './competitive-intelligence.service';
export { exportService } from './export.service';
export { securityService } from './security.service';
export { dataValidationService } from './data-validation.service';
export { cppStrategyService } from './cpp-strategy.service';
export { inputDetectionService } from './input-detection.service';
export { bypassPatternsService } from './bypass-patterns.service';
export { correlationTracker } from './correlation-tracker.service';
export { directItunesService } from './direct-itunes.service';
export { asoSearchService } from './aso-search.service';
export { keywordRankingService } from './keyword-ranking.service';
export { keywordIntelligenceService } from './keyword-intelligence.service';
export { keywordValidationService } from './keyword-validation.service';
export { keywordCacheService } from './keyword-cache.service';
export { keywordRankingCalculatorService } from './keyword-ranking-calculator.service';

// Add new bulletproof error handling services
export { retryStrategyService } from './retry-strategy.service';
export { multiLevelCircuitBreakerService } from './multi-level-circuit-breaker.service';
export { cacheFallbackService } from './cache-fallback.service';
export { userExperienceShieldService } from './user-experience-shield.service';
export { failureAnalyticsService } from './failure-analytics.service';
export { requestTransmissionService } from './request-transmission.service';

// Re-export types for convenience
export type { SearchResult, SearchConfig } from './aso-search.service';
export type { SearchParameters } from './input-detection.service';
export type { SearchResultsResponse } from './direct-itunes.service';
export type { KeywordRanking, KeywordAnalysisConfig } from './keyword-ranking.service';
export type { KeywordValidationResult } from './keyword-validation.service';
export type { CacheConfig } from './keyword-cache.service';
export type { RankingCalculationConfig } from './keyword-ranking-calculator.service';

// Re-export new types
export type { RetryConfig, RetryResult } from './retry-strategy.service';
export type { CircuitBreakerState as MultiLevelCircuitBreakerState, ComponentHealth } from './multi-level-circuit-breaker.service';
export type { CachedSearchResult, CacheStats } from './cache-fallback.service';
export type { LoadingState, UserFriendlyError, SearchFeedback } from './user-experience-shield.service';
export type { FailureEvent, FailurePattern, SystemHealth } from './failure-analytics.service';
export type { TransmissionResult, RequestPayload } from './request-transmission.service';

// Re-export utilities
export { CircuitBreaker } from '@/lib/utils/circuit-breaker';

// Re-export new persistence and monitoring services
export { keywordPersistenceService } from './keyword-persistence.service';
export { keywordJobProcessorService } from './keyword-job-processor.service';

// Re-export new types
export type { KeywordRankingHistory, ServiceMetric } from './keyword-persistence.service';
export type { KeywordJob, BatchAnalysisInput, CompetitorResearchInput } from './keyword-job-processor.service';

// Add new advanced keyword intelligence services
export { competitorKeywordAnalysisService } from './competitor-keyword-analysis.service';

// Re-export new types
export type { 
  KeywordVolumeHistory, 
  CompetitorKeyword, 
  KeywordDifficultyScore, 
  KeywordCluster, 
  KeywordGapAnalysis 
} from './competitor-keyword-analysis.service';
