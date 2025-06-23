
import { supabase } from '@/integrations/supabase/client';
import { inputDetectionService, SearchParameters } from './input-detection.service';
import { bypassPatternsService } from './bypass-patterns.service';
import { correlationTracker } from './correlation-tracker.service';
import { directItunesService, SearchResultsResponse } from './direct-itunes.service';
import { AmbiguousSearchError } from '@/types/search-errors';
import { ScrapedMetadata } from '@/types/aso';
import { CircuitBreaker } from '@/lib/utils/circuit-breaker';

export interface SearchResult {
  targetApp: ScrapedMetadata;
  competitors: ScrapedMetadata[];
  searchContext: {
    query: string;
    type: 'url' | 'keyword' | 'brand';
    totalResults: number;
    category: string;
    country: string;
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
}

class AsoSearchService {
  private maxRetries = 2;
  private baseDelay = 1000;
  
  // Circuit breaker for edge function failures
  private edgeFunctionCircuitBreaker = new CircuitBreaker({
    maxFailures: 5,
    resetTimeMs: 60000, // 1 minute
    name: 'EdgeFunction'
  });

  /**
   * Enhanced search with comprehensive fallback mechanisms
   */
  async search(input: string, config: SearchConfig): Promise<SearchResult> {
    const correlationContext = correlationTracker.createContext('aso-search', config.organizationId);
    
    console.group(`🚀 [ASO-SEARCH] Enhanced reliable search starting`);
    console.log('Input:', input);
    console.log('Config:', config);
    console.log('Circuit Breaker State:', this.edgeFunctionCircuitBreaker.getState());
    
    correlationTracker.log('info', 'Enhanced ASO search initiated', { input, config });

    try {
      // PHASE 1: Enhanced bypass analysis
      const bypassAnalysis = bypassPatternsService.analyzeForBypass(input);
      correlationTracker.log('info', 'Enhanced bypass analysis completed', bypassAnalysis);

      // ROUTE 1: Enhanced bypass path for high-confidence patterns
      if (bypassAnalysis.shouldBypass && bypassAnalysis.confidence > 0.7) {
        console.log(`🎯 [BYPASS] Taking enhanced bypass path (confidence: ${bypassAnalysis.confidence})`);
        return await this.executeBypassSearch(input, config, bypassAnalysis);
      }

      // ROUTE 2: Edge function with circuit breaker protection
      if (!this.edgeFunctionCircuitBreaker.isOpen()) {
        console.log('🔄 [EDGE-FUNCTION] Attempting edge function with circuit breaker protection');
        try {
          const result = await this.executeEdgeFunctionSearch(input, config);
          this.edgeFunctionCircuitBreaker.recordSuccess();
          console.groupEnd();
          return result;
        } catch (error: any) {
          console.warn('⚠️ [EDGE-FUNCTION] Edge function failed, checking for fallback', error.message);
          
          // Check if it's an empty body error (400)
          if (error.message.includes('400') || error.message.includes('empty') || error.message.includes('validation')) {
            console.log('🚫 [CIRCUIT-BREAKER] Recording edge function failure');
            this.edgeFunctionCircuitBreaker.recordFailure();
            bypassPatternsService.addFailurePattern(input, 'edge-function-400-error');
          }
          
          // Fall through to bypass fallback
        }
      } else {
        console.log('🚫 [CIRCUIT-BREAKER] Edge function circuit breaker is OPEN, bypassing to direct API');
      }

      // ROUTE 3: Automatic fallback to direct iTunes API
      console.log('🔄 [FALLBACK] Using direct iTunes API fallback');
      return await this.executeFallbackSearch(input, config);

    } catch (error: any) {
      console.groupEnd();
      
      // Re-throw AmbiguousSearchError without modification
      if (error instanceof AmbiguousSearchError) {
        throw error;
      }
      
      correlationTracker.log('error', 'All search paths failed', { error: error.message });
      throw new Error(this.getUserFriendlyError(error));
    }
  }

  /**
   * Execute bypass search with ambiguity detection
   */
  private async executeBypassSearch(input: string, config: SearchConfig, bypassAnalysis: any): Promise<SearchResult> {
    correlationTracker.log('info', 'Executing enhanced bypass search', { reason: bypassAnalysis.reason });
    
    try {
      const ambiguityResult: SearchResultsResponse = await directItunesService.searchWithAmbiguityDetection(input, {
        organizationId: config.organizationId,
        country: 'us',
        limit: 25,
        bypassReason: bypassAnalysis.reason
      });

      // Handle ambiguous results
      if (ambiguityResult.isAmbiguous) {
        correlationTracker.log('info', 'Ambiguous search detected in bypass', {
          candidateCount: ambiguityResult.results.length
        });
        throw new AmbiguousSearchError(ambiguityResult.results, ambiguityResult.searchTerm);
      }

      // Single result - wrap and return
      return this.wrapDirectResult(ambiguityResult.results[0], input, bypassAnalysis.pattern);

    } catch (error: any) {
      if (error instanceof AmbiguousSearchError) {
        throw error;
      }
      
      console.warn('⚠️ [BYPASS] Bypass search failed, trying fallback', error.message);
      throw error; // Let it fall through to main fallback
    }
  }

  /**
   * Execute edge function search with validation
   */
  private async executeEdgeFunctionSearch(input: string, config: SearchConfig): Promise<SearchResult> {
    const requestBody = {
      searchTerm: input.trim(),
      searchType: 'keyword' as const,
      organizationId: config.organizationId,
      includeCompetitorAnalysis: true,
      searchParameters: {
        country: 'us',
        limit: 25
      }
    };

    // VALIDATION: Ensure request body is valid before transmission
    this.validateRequestBody(requestBody);

    console.log('📤 [EDGE-FUNCTION] Validated request body, calling edge function');

    const { data, error } = await supabase.functions.invoke('app-store-scraper', {
      body: requestBody,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationTracker.getContext()?.id || crypto.randomUUID()
      }
    });

    if (error) {
      throw new Error(`Edge function error: ${error.message}`);
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Edge function returned unsuccessful response');
    }

    // Transform and return result
    return this.transformEdgeFunctionResult(data, input);
  }

  /**
   * Execute fallback search using direct iTunes API
   */
  private async executeFallbackSearch(input: string, config: SearchConfig): Promise<SearchResult> {
    correlationTracker.log('info', 'Executing fallback search via direct iTunes API');
    
    try {
      const ambiguityResult: SearchResultsResponse = await directItunesService.searchWithAmbiguityDetection(input, {
        organizationId: config.organizationId,
        country: 'us',
        limit: 15,
        bypassReason: 'fallback-from-edge-function-failure'
      });

      if (ambiguityResult.isAmbiguous) {
        throw new AmbiguousSearchError(ambiguityResult.results, ambiguityResult.searchTerm);
      }

      if (ambiguityResult.results.length === 0) {
        throw new Error(`No apps found for "${input}". Try different keywords or check the spelling.`);
      }

      return this.wrapDirectResult(ambiguityResult.results[0], input, 'fallback-search');

    } catch (error: any) {
      if (error instanceof AmbiguousSearchError) {
        throw error;
      }
      
      correlationTracker.log('error', 'Fallback search failed', { error: error.message });
      throw new Error(`All search methods failed for "${input}". Please try different keywords.`);
    }
  }

  /**
   * Validate request body before transmission
   */
  private validateRequestBody(requestBody: any): void {
    if (!requestBody.searchTerm || requestBody.searchTerm.trim() === '') {
      throw new Error('Search term cannot be empty');
    }

    if (!requestBody.organizationId) {
      throw new Error('Organization ID is required');
    }

    // Test JSON serialization
    try {
      const serialized = JSON.stringify(requestBody);
      if (serialized.length === 0) {
        throw new Error('Request body serialization failed');
      }
      console.log(`✅ [VALIDATION] Request body validated (${serialized.length} bytes)`);
    } catch (serError) {
      throw new Error('Request body cannot be serialized');
    }
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
        country: 'us'
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
        country: 'us'
      },
      intelligence: {
        opportunities: [
          pattern.includes('fallback') ? 
            `Direct match found via fallback for "${input}"` : 
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
