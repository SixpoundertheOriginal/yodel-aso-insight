import { supabase } from '@/integrations/supabase/client';
import { inputDetectionService, SearchParameters } from './input-detection.service';
import { bypassPatternsService } from './bypass-patterns.service';
import { correlationTracker } from './correlation-tracker.service';
import { directItunesService, SearchResultsResponse } from './direct-itunes.service';
import { requestTransmissionService } from './request-transmission.service';
import { AmbiguousSearchError } from '@/types/search-errors';
import { ScrapedMetadata } from '@/types/aso';
import { CircuitBreaker } from '@/lib/utils/circuit-breaker';

// Import new bulletproof error handling services
import { retryStrategyService, RetryResult } from './retry-strategy.service';
import { multiLevelCircuitBreakerService } from './multi-level-circuit-breaker.service';
import { cacheFallbackService } from './cache-fallback.service';
import { userExperienceShieldService, LoadingState, UserFriendlyError } from './user-experience-shield.service';
import { failureAnalyticsService } from './failure-analytics.service';

export interface SearchResult {
  targetApp: ScrapedMetadata;
  competitors: ScrapedMetadata[];
  searchContext: {
    query: string;
    type: 'url' | 'keyword' | 'brand';
    totalResults: number;
    category: string;
    country: string;
    source: 'primary' | 'fallback' | 'cache' | 'similar';
    responseTime: number;
    backgroundRetries: number;
  };
  intelligence: {
    keywordDifficulty?: number;
    marketSaturation?: number;
    trendingScore?: number;
    opportunities: string[];
  };
}

export interface SearchConfig {
  organizationId: string;
  includeIntelligence?: boolean;
  cacheResults?: boolean;
  debugMode?: boolean;
  onLoadingUpdate?: (state: LoadingState) => void;
}

class AsoSearchService {
  private maxRetries = 2;
  private baseDelay = 1000;
  
  // Legacy circuit breaker (keeping for compatibility)
  private edgeFunctionCircuitBreaker = new CircuitBreaker({
    maxFailures: 5,
    resetTimeMs: 60000,
    name: 'EdgeFunction'
  });

  /**
   * Bulletproof search with comprehensive error handling and fallback chain
   */
  async search(input: string, config: SearchConfig): Promise<SearchResult> {
    const correlationContext = correlationTracker.createContext('aso-search', config.organizationId);
    const startTime = Date.now();
    
    console.group(`🚀 [ASO-SEARCH] Bulletproof search starting`);
    console.log('Input:', input);
    console.log('Config:', config);
    
    // Start UX shield
    const loadingState = userExperienceShieldService.startLoading(input);
    config.onLoadingUpdate?.(loadingState);

    correlationTracker.log('info', 'Bulletproof ASO search initiated', { input, config });

    try {
      // Check cache first for instant results
      const cachedResult = cacheFallbackService.retrieve(input, config.organizationId);
      if (cachedResult) {
        const result = this.wrapCachedResult(cachedResult, input);
        
        const feedback = {
          searchTerm: input,
          resultSource: 'cache' as const,
          responseTime: Date.now() - startTime,
          userVisible: true,
          backgroundRetries: 0
        };
        
        const completeState = userExperienceShieldService.completeLoading(feedback);
        config.onLoadingUpdate?.(completeState);
        
        console.groupEnd();
        return result;
      }

      // Execute bulletproof search chain
      const result = await this.executeBulletproofSearchChain(input, config, startTime);
      
      // Cache successful result
      if (config.cacheResults !== false) {
        cacheFallbackService.store(input, result.targetApp, config.organizationId);
      }

      console.groupEnd();
      return result;

    } catch (error: any) {
      console.groupEnd();
      
      // Record failure for analytics
      failureAnalyticsService.recordFailure({
        component: 'aso-search-orchestrator',
        method: 'bulletproof-search',
        error: error.message,
        searchTerm: input,
        organizationId: config.organizationId,
        context: { config, startTime }
      });

      // Handle with UX shield
      if (error instanceof AmbiguousSearchError) {
        userExperienceShieldService.reset();
        throw error; // Let ambiguous errors bubble up for user selection
      }

      const userError = userExperienceShieldService.handleError(error, {
        searchTerm: input,
        attempts: 3 // Assuming full fallback chain was attempted
      });
      config.onLoadingUpdate?.(userExperienceShieldService.getCurrentState());

      // Try one final fallback to similar cached results
      const similarResults = cacheFallbackService.findSimilarResults(input, config.organizationId, 1);
      if (similarResults.length > 0) {
        console.log(`🔍 [ASO-SEARCH] Emergency fallback to similar cached result`);
        
        const result = this.wrapCachedResult(similarResults[0], input, 'similar');
        const feedback = {
          searchTerm: input,
          resultSource: 'similar' as const,
          responseTime: Date.now() - startTime,
          userVisible: true,
          backgroundRetries: 3
        };
        
        const completeState = userExperienceShieldService.completeLoading(feedback);
        config.onLoadingUpdate?.(completeState);
        
        return result;
      }

      throw new Error(userError.message);
    }
  }

  /**
   * Execute the bulletproof search chain with intelligent fallbacks
   */
  private async executeBulletproofSearchChain(input: string, config: SearchConfig, startTime: number): Promise<SearchResult> {
    const searchMethods = [
      { name: 'enhanced-edge-function', handler: () => this.executeEnhancedEdgeFunctionSearch(input, config) },
      { name: 'direct-itunes-api', handler: () => this.executeDirectApiSearch(input, config) },
      { name: 'bypass-search', handler: () => this.executeBypassSearch(input, config) }
    ];

    let lastError: Error | undefined;
    let totalRetries = 0;

    for (const method of searchMethods) {
      const isAvailable = multiLevelCircuitBreakerService.isAvailable(method.name);
      
      if (!isAvailable) {
        console.log(`🚫 [BULLETPROOF-SEARCH] Skipping ${method.name} - circuit breaker open`);
        continue;
      }

      // Update loading stage
      const stage = method.name === 'enhanced-edge-function' ? 'searching' : 'fallback';
      const stageState = userExperienceShieldService.updateStage(stage);
      config.onLoadingUpdate?.(stageState);

      console.log(`🎯 [BULLETPROOF-SEARCH] Attempting ${method.name}`);

      try {
        const retryResult: RetryResult<SearchResult> = await retryStrategyService.executeWithRetry(
          method.handler,
          method.name
        );

        if (retryResult.success && retryResult.data) {
          // Record success
          multiLevelCircuitBreakerService.recordSuccess(method.name);
          
          // Calculate final response time and retries
          const responseTime = Date.now() - startTime;
          totalRetries += retryResult.attempts - 1;

          // Update search context with recovery info
          retryResult.data.searchContext.source = method.name === 'enhanced-edge-function' ? 'primary' : 'fallback';
          retryResult.data.searchContext.responseTime = responseTime;
          retryResult.data.searchContext.backgroundRetries = totalRetries;

          // Complete loading
          const feedback = {
            searchTerm: input,
            resultSource: retryResult.data.searchContext.source,
            responseTime,
            userVisible: true,
            backgroundRetries: totalRetries
          };

          const completeState = userExperienceShieldService.completeLoading(feedback);
          config.onLoadingUpdate?.(completeState);

          // Record recovery if there were previous failures
          if (lastError) {
            failureAnalyticsService.recordRecovery(
              { component: method.name, searchTerm: input },
              method.name,
              responseTime
            );
          }

          console.log(`✅ [BULLETPROOF-SEARCH] Success via ${method.name} (${retryResult.attempts} attempts, ${responseTime}ms)`);
          return retryResult.data;
        }

        // Handle retry failure
        lastError = retryResult.error || new Error(`${method.name} failed after retries`);
        multiLevelCircuitBreakerService.recordFailure(method.name, lastError);
        
        // Record failure
        failureAnalyticsService.recordFailure({
          component: method.name,
          method: 'bulletproof-search-method',
          error: lastError.message,
          searchTerm: input,
          organizationId: config.organizationId,
          context: { attempts: retryResult.attempts, totalTime: retryResult.totalTime }
        });

        totalRetries += retryResult.attempts;
        console.log(`❌ [BULLETPROOF-SEARCH] ${method.name} failed after ${retryResult.attempts} attempts: ${lastError.message}`);

      } catch (error: any) {
        lastError = error;
        multiLevelCircuitBreakerService.recordFailure(method.name, error);
        
        failureAnalyticsService.recordFailure({
          component: method.name,
          method: 'bulletproof-search-method',
          error: error.message,
          searchTerm: input,
          organizationId: config.organizationId,
          context: { totalRetries }
        });

        console.log(`💥 [BULLETPROOF-SEARCH] ${method.name} threw exception: ${error.message}`);
      }
    }

    // All methods failed
    throw lastError || new Error('All search methods exhausted');
  }

  /**
   * Enhanced direct API search with retry logic
   */
  private async executeDirectApiSearch(input: string, config: SearchConfig): Promise<SearchResult> {
    correlationTracker.log('info', 'Executing bulletproof direct API search');
    
    try {
      const ambiguityResult: SearchResultsResponse = await directItunesService.searchWithAmbiguityDetection(input, {
        organizationId: config.organizationId,
        country: 'us',
        limit: 15,
        bypassReason: 'bulletproof-fallback-direct-api'
      });

      if (ambiguityResult.isAmbiguous) {
        throw new AmbiguousSearchError(ambiguityResult.results, ambiguityResult.searchTerm);
      }

      if (ambiguityResult.results.length === 0) {
        throw new Error(`No apps found for "${input}". Try different keywords or check the spelling.`);
      }

      return this.wrapDirectResult(ambiguityResult.results[0], input, 'bulletproof-direct-api');

    } catch (error: any) {
      if (error instanceof AmbiguousSearchError) {
        throw error;
      }
      
      correlationTracker.log('error', 'Bulletproof direct API search failed', { error: error.message });
      throw new Error(`Direct API search failed: ${error.message}`);
    }
  }

  /**
   * Enhanced bypass search with retry logic
   */
  private async executeBypassSearch(input: string, config: SearchConfig): Promise<SearchResult> {
    const bypassAnalysis = bypassPatternsService.analyzeForBypass(input);
    correlationTracker.log('info', 'Executing bulletproof bypass search', bypassAnalysis);
    
    try {
      const ambiguityResult: SearchResultsResponse = await directItunesService.searchWithAmbiguityDetection(input, {
        organizationId: config.organizationId,
        country: 'us',
        limit: 25,
        bypassReason: 'bulletproof-bypass-search'
      });

      if (ambiguityResult.isAmbiguous) {
        throw new AmbiguousSearchError(ambiguityResult.results, ambiguityResult.searchTerm);
      }

      return this.wrapDirectResult(ambiguityResult.results[0], input, 'bulletproof-bypass');

    } catch (error: any) {
      if (error instanceof AmbiguousSearchError) {
        throw error;
      }
      
      throw error;
    }
  }

  /**
   * FIXED: Enhanced edge function search with proper ambiguity handling
   */
  private async executeEnhancedEdgeFunctionSearch(input: string, config: SearchConfig): Promise<SearchResult> {
    const requestPayload = {
      searchTerm: input.trim(),
      searchType: 'keyword' as const,
      organizationId: config.organizationId,
      includeCompetitorAnalysis: true,
      searchParameters: {
        country: 'us',
        limit: 25
      }
    };

    console.log('📡 [BULLETPROOF-EDGE] Starting enhanced transmission with debugging');

    const transmissionResult = await requestTransmissionService.transmitRequest(
      'app-store-scraper',
      requestPayload,
      correlationTracker.getContext()?.id || crypto.randomUUID()
    );

    if (!transmissionResult.success) {
      console.error('❌ [BULLETPROOF-EDGE] All transmission methods failed:', transmissionResult.error);
      throw new Error(`Transmission failed: ${transmissionResult.error}`);
    }

    console.log('✅ [BULLETPROOF-EDGE] Success via method:', transmissionResult.method);

    const data = transmissionResult.data;
    if (!data || !data.success) {
      throw new Error(data?.error || 'Edge function returned unsuccessful response');
    }

    // FIXED: Handle ambiguous search responses properly - treat as SUCCESS with multiple candidates
    if (data.isAmbiguous) {
      console.log('🎯 [BULLETPROOF-EDGE] Ambiguous search detected - handling gracefully');
      
      const candidates = data.data.results || [];
      if (candidates.length === 0) {
        throw new Error('No candidates returned from ambiguous search');
      }
      
      console.log(`📋 [BULLETPROOF-EDGE] Throwing AmbiguousSearchError with ${candidates.length} candidates for user selection`);
      throw new AmbiguousSearchError(candidates, data.data.searchTerm || input);
    }

    return this.transformEdgeFunctionResult(data, input);
  }

  /**
   * Wrap cached result for consistent interface
   */
  private wrapCachedResult(app: ScrapedMetadata, input: string, source: 'cache' | 'similar' = 'cache'): SearchResult {
    return {
      targetApp: app,
      competitors: [],
      searchContext: {
        query: input,
        type: 'keyword',
        totalResults: 1,
        category: app.applicationCategory || 'Unknown',
        country: 'us',
        source,
        responseTime: 0,
        backgroundRetries: 0
      },
      intelligence: {
        opportunities: [
          source === 'similar' ? 
            `Similar cached result for "${input}"` : 
            `Cached result for "${input}"`
        ]
      }
    };
  }

  /**
   * Transform edge function result
   */
  private transformEdgeFunctionResult(data: any, input: string): SearchResult {
    const responseData = data.data;
    const targetApp = {
      name: responseData.name || responseData.title,
      appId: responseData.appId,
      title: responseData.title,
      subtitle: responseData.subtitle || '',
      description: responseData.description || '',
      url: responseData.url || '',
      icon: responseData.icon || '',
      rating: responseData.rating || 0,
      reviews: responseData.reviews || 0,
      developer: responseData.developer || '',
      applicationCategory: responseData.applicationCategory || 'Unknown',
      locale: responseData.locale || 'en-US'
    } as ScrapedMetadata;

    return {
      targetApp,
      competitors: responseData.competitors || [],
      searchContext: {
        query: input,
        type: 'keyword' as const,
        totalResults: (responseData.competitors?.length || 0) + 1,
        category: responseData.applicationCategory || 'Unknown',
        country: 'us',
        source: 'primary',
        responseTime: 0,
        backgroundRetries: 0
      },
      intelligence: { 
        opportunities: data.searchContext?.includeCompetitors ? 
          [`Found ${responseData.competitors?.length || 0} competitors for analysis`] : 
          ['App successfully imported for analysis']
      }
    };
  }

  /**
   * Wrap direct iTunes result
   */
  private wrapDirectResult(app: ScrapedMetadata, input: string, pattern: string): SearchResult {
    correlationTracker.log('info', 'Wrapping direct iTunes result', {
      appName: app.name,
      pattern
    });

    return {
      targetApp: app,
      competitors: [],
      searchContext: {
        query: input,
        type: pattern.includes('brand') ? 'brand' : 'keyword',
        totalResults: 1,
        category: app.applicationCategory || 'Unknown',
        country: 'us',
        source: 'fallback',
        responseTime: 0,
        backgroundRetries: 0
      },
      intelligence: {
        opportunities: [
          pattern.includes('fallback') ? 
            `Fallback match found for "${input}"` : 
            `Direct match found for "${input}"`
        ]
      }
    };
  }

  /**
   * Get circuit breaker state for debugging
   */
  getCircuitBreakerState() {
    return this.edgeFunctionCircuitBreaker.getState();
  }

  /**
   * Reset circuit breaker (for manual recovery)
   */
  resetCircuitBreaker() {
    this.edgeFunctionCircuitBreaker.reset();
    console.log('🔄 [MANUAL-RESET] Circuit breaker manually reset');
  }

  /**
   * Get transmission statistics
   */
  getTransmissionStats() {
    return requestTransmissionService.getTransmissionStats();
  }

  /**
   * Get comprehensive system health
   */
  getSystemHealth() {
    return {
      circuitBreakers: multiLevelCircuitBreakerService.getSummary(),
      failureAnalytics: failureAnalyticsService.getSystemHealth(),
      recoveryStats: failureAnalyticsService.getRecoveryStats(),
      cacheStats: cacheFallbackService.getStats(),
      retryStats: retryStrategyService.getRetryStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get failure predictions
   */
  getFailurePredictions() {
    return failureAnalyticsService.predictFailures();
  }

  /**
   * Manual recovery operations
   */
  triggerRecovery() {
    // Reset circuit breakers
    const components = ['edge-function', 'direct-itunes-api', 'transmission-json', 'transmission-url-params'];
    components.forEach(component => {
      multiLevelCircuitBreakerService.reset(component);
    });

    // Clean up cache
    cacheFallbackService.cleanup();

    console.log('🔄 [BULLETPROOF-RECOVERY] Manual recovery triggered');
    
    return {
      message: 'Recovery operations completed',
      timestamp: new Date().toISOString(),
      resetComponents: components.length
    };
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyError(error: any): string {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('no apps found')) {
      return error.message;
    }
    if (message.includes('rate limit')) {
      return 'You have made too many requests. Please wait a few minutes before trying again.';
    }
    if (message.includes('invalid') || message.includes('validation')) {
      return 'Please enter a valid app name, keywords, or App Store URL.';
    }
    if (message.includes('network') || message.includes('unavailable') || message.includes('temporarily')) {
      return 'Search service is temporarily unavailable. Please try again in a few minutes.';
    }
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return 'Authentication required. Please log in and try again.';
    }
    if (message.includes('edge function') || message.includes('service error')) {
      return 'Search service encountered an error. Please try again with different keywords.';
    }
    
    return 'Search failed. Please try again with different keywords or check your internet connection.';
  }
}

export const asoSearchService = new AsoSearchService();
