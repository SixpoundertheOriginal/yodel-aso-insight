
import { supabase } from '@/integrations/supabase/client';
import { inputDetectionService, SearchParameters } from './input-detection.service';
import { bypassPatternsService } from './bypass-patterns.service';
import { correlationTracker } from './correlation-tracker.service';
import { directItunesService, SearchResultsResponse } from './direct-itunes.service';
import { AmbiguousSearchError } from '@/types/search-errors';
import { ScrapedMetadata } from '@/types/aso';

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

  /**
   * Enhanced request debugging utility
   */
  private logRequestDetails(stage: string, data: any) {
    console.group(`🔍 [REQUEST-DEBUG] ${stage}`);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Stage:', stage);
    console.log('Data type:', typeof data);
    console.log('Data keys:', data && typeof data === 'object' ? Object.keys(data) : 'N/A');
    
    if (data && typeof data === 'object') {
      console.log('Data details:', JSON.stringify(data, null, 2));
      console.log('JSON stringified length:', JSON.stringify(data).length);
      
      // Test serialization
      try {
        const serialized = JSON.stringify(data);
        const deserialized = JSON.parse(serialized);
        console.log('✅ Serialization test passed');
        console.log('Serialized matches original:', JSON.stringify(data) === JSON.stringify(deserialized));
      } catch (serError) {
        console.error('❌ Serialization test failed:', serError);
      }
    }
    console.groupEnd();
  }

  /**
   * Enhanced Supabase client debugging
   */
  private logSupabaseClientState() {
    console.group('🔍 [SUPABASE-DEBUG] Client State');
    
    // Log client configuration (safely without accessing protected properties)
    console.log('Supabase client exists:', !!supabase);
    console.log('Client type:', typeof supabase);
    console.log('Client constructor name:', supabase.constructor.name);
    
    // Test client connectivity
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('Auth session exists:', !!session);
      console.log('Auth error:', error?.message || 'None');
      console.log('User ID:', session?.user?.id || 'Not authenticated');
    }).catch(authError => {
      console.error('Auth check failed:', authError);
    });
    
    console.groupEnd();
  }

  /**
   * Stabilized search with comprehensive error handling and debugging
   */
  async search(input: string, config: SearchConfig): Promise<SearchResult> {
    // Create correlation context for request tracing
    const correlationContext = correlationTracker.createContext('aso-search', config.organizationId);
    
    console.group(`🚀 [ASO-SEARCH] Starting search with enhanced debugging`);
    console.log('Input:', input);
    console.log('Config:', config);
    console.log('Correlation ID:', correlationContext.id);
    
    correlationTracker.log('info', 'ASO search initiated with comprehensive debugging', { input, config });

    try {
      // PHASE 1: Bypass analysis for direct iTunes calls
      const bypassAnalysis = bypassPatternsService.analyzeForBypass(input);
      correlationTracker.log('info', 'Bypass analysis completed', bypassAnalysis);

      // ENHANCED BYPASS PATH: Check for ambiguity first
      if (bypassAnalysis.shouldBypass && bypassAnalysis.confidence > 0.8) {
        correlationTracker.log('info', 'Taking enhanced bypass path with ambiguity detection', { reason: bypassAnalysis.reason });
        
        try {
          const ambiguityResult: SearchResultsResponse = await directItunesService.searchWithAmbiguityDetection(input, {
            organizationId: config.organizationId,
            country: 'us',
            limit: 25,
            bypassReason: bypassAnalysis.reason
          });

          // If ambiguous, throw error with candidates for modal selection
          if (ambiguityResult.isAmbiguous) {
            correlationTracker.log('info', 'Ambiguous search detected, throwing selection error', {
              candidateCount: ambiguityResult.results.length,
              searchTerm: ambiguityResult.searchTerm
            });
            
            throw new AmbiguousSearchError(ambiguityResult.results, ambiguityResult.searchTerm);
          }

          // Single result - proceed normally
          return this.wrapDirectResult(ambiguityResult.results[0], input, bypassAnalysis.pattern);

        } catch (error) {
          // If it's an AmbiguousSearchError, re-throw it
          if (error instanceof AmbiguousSearchError) {
            throw error;
          }
          
          correlationTracker.log('warn', 'Enhanced bypass path failed, falling back to edge function', {
            error: error.message
          });
          // Fall through to edge function
        }
      }

      // MAIN PATH: Use edge function with comprehensive debugging
      console.log('🔍 [DEBUG] Using edge function with comprehensive request debugging');
      const result = await this.searchWithComprehensiveDebugging(input, config);
      console.groupEnd();
      return result;

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
   * Comprehensive debugging version of edge function call
   */
  private async searchWithComprehensiveDebugging(input: string, config: SearchConfig): Promise<SearchResult> {
    const correlationId = correlationTracker.getContext()?.id || crypto.randomUUID();
    
    console.group(`🔍 [COMPREHENSIVE-DEBUG] Edge Function Request`);
    
    // PHASE 1: PRE-REQUEST VALIDATION AND DEBUGGING
    console.log('🔍 [PHASE-1] Pre-Request Validation');
    
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

    // Log request construction
    this.logRequestDetails('Request Body Construction', requestBody);

    // VALIDATION 1: Basic input validation
    if (!requestBody.searchTerm || requestBody.searchTerm.trim() === '') {
      console.error('❌ [VALIDATION] Empty search term');
      throw new Error('Search term cannot be empty');
    }

    if (!requestBody.organizationId) {
      console.error('❌ [VALIDATION] Missing organization ID');
      throw new Error('Organization ID is required');
    }

    // VALIDATION 2: JSON serialization test
    console.log('🔍 [VALIDATION] Testing JSON serialization...');
    let serializedBody: string;
    try {
      serializedBody = JSON.stringify(requestBody);
      console.log('✅ [VALIDATION] JSON serialization successful');
      console.log('📊 [VALIDATION] Serialized body length:', serializedBody.length);
      console.log('📝 [VALIDATION] Serialized body preview:', serializedBody.substring(0, 200));
      
      // Test deserialization
      const testDeserialized = JSON.parse(serializedBody);
      console.log('✅ [VALIDATION] JSON round-trip test passed');
      console.log('🔍 [VALIDATION] Round-trip keys match:', 
        Object.keys(requestBody).sort().join(',') === Object.keys(testDeserialized).sort().join(','));
        
    } catch (serializationError) {
      console.error('❌ [VALIDATION] JSON serialization failed:', serializationError);
      throw new Error('Failed to serialize request body');
    }

    // PHASE 2: SUPABASE CLIENT STATE DEBUGGING
    console.log('🔍 [PHASE-2] Supabase Client State');
    this.logSupabaseClientState();

    // PHASE 3: REQUEST HEADERS DEBUGGING
    console.log('🔍 [PHASE-3] Request Headers Preparation');
    const requestHeaders = {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId
    };
    
    console.log('📋 [HEADERS] Request headers:', requestHeaders);
    console.log('📋 [HEADERS] Content-Type set:', requestHeaders['Content-Type']);
    console.log('📋 [HEADERS] Correlation ID set:', requestHeaders['X-Correlation-ID']);

    // PHASE 4: EDGE FUNCTION INVOCATION WITH DEBUGGING
    console.log('🔍 [PHASE-4] Edge Function Invocation');
    console.log('🚀 [INVOKE] Calling supabase.functions.invoke...');
    console.log('🚀 [INVOKE] Function name: app-store-scraper');
    console.log('🚀 [INVOKE] Body type:', typeof requestBody);
    console.log('🚀 [INVOKE] Body size (bytes):', new Blob([serializedBody]).size);

    let invokeStartTime = Date.now();
    
    try {
      console.log('📡 [NETWORK] Making edge function request...');
      
      const { data, error } = await supabase.functions.invoke('app-store-scraper', {
        body: requestBody,
        headers: requestHeaders
      });

      const invokeEndTime = Date.now();
      const invokeDuration = invokeEndTime - invokeStartTime;
      
      // PHASE 5: RESPONSE DEBUGGING
      console.log('🔍 [PHASE-5] Response Analysis');
      console.log('⏱️ [TIMING] Edge function call duration:', invokeDuration + 'ms');
      console.log('📥 [RESPONSE] Has data:', !!data);
      console.log('📥 [RESPONSE] Has error:', !!error);
      
      if (error) {
        console.error('❌ [RESPONSE] Edge function error details:');
        console.error('   Error message:', error.message);
        console.error('   Error context:', error.context);
        console.error('   Error stack:', error.stack);
        
        // Detailed error analysis
        if (error.message?.includes('Edge Function returned a non-2xx status code')) {
          console.error('🚨 [ERROR-ANALYSIS] Non-2xx status code detected');
          console.error('   This typically indicates the edge function received the request but returned an error');
          console.error('   Check edge function logs for detailed error information');
        }
        if (error.message?.includes('Invalid JSON')) {
          console.error('🚨 [ERROR-ANALYSIS] JSON parsing error detected');
          console.error('   Request body may be corrupted during transmission');
        }
        if (error.message?.includes('timeout')) {
          console.error('🚨 [ERROR-ANALYSIS] Timeout error detected');
          console.error('   Edge function may be taking too long to respond');
        }
        
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!data) {
        console.error('❌ [RESPONSE] No data received from edge function');
        console.error('   This indicates the edge function may have failed silently');
        throw new Error('No response received from edge function');
      }

      // SUCCESS DEBUGGING
      console.log('✅ [RESPONSE] Edge function response received successfully');
      console.log('📊 [RESPONSE] Response data type:', typeof data);
      console.log('📊 [RESPONSE] Response success:', data?.success);
      
      if (data.success) {
        console.log('✅ [SUCCESS] Edge function call completed successfully');
        console.log('📋 [SUCCESS] Response data keys:', Object.keys(data));
        console.log('📋 [SUCCESS] Has search data:', !!data.data);
        console.log('📋 [SUCCESS] Search context:', data.searchContext);
      } else {
        console.error('❌ [RESPONSE] Edge function returned unsuccessful response');
        console.error('   Success flag is false, but no error thrown');
        console.error('   Response data:', data);
      }

      if (!data.success) {
        const errorMessage = data?.error || 'Edge function returned unsuccessful response';
        console.error('❌ [FAILURE] Edge function failed:', errorMessage);
        
        // Enhanced error messages based on the response
        if (errorMessage.includes('No apps found')) {
          throw new Error(`No apps found for "${input}". Try different keywords or check the spelling.`);
        }
        if (errorMessage.includes('Invalid request')) {
          throw new Error('Search request was invalid. Please try again.');
        }
        if (errorMessage.includes('temporarily unavailable') || errorMessage.includes('Service temporarily unavailable')) {
          throw new Error('App Store search is temporarily unavailable. Please try again in a few minutes.');
        }
        
        throw new Error(errorMessage);
      }

      console.log('✅ [SUCCESS] Edge function call successful, transforming response...');

      // Transform response - handle both single app and app with competitors
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

      const result = {
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

      console.log('✅ [FINAL] Search result transformed successfully');
      console.groupEnd();
      
      return result;

    } catch (networkError: any) {
      const invokeEndTime = Date.now();
      const invokeDuration = invokeEndTime - invokeStartTime;
      
      console.error('💥 [NETWORK-ERROR] Edge function call failed');
      console.error('⏱️ [TIMING] Failed after:', invokeDuration + 'ms');
      console.error('📋 [ERROR] Error type:', networkError.constructor.name);
      console.error('📋 [ERROR] Error message:', networkError.message);
      console.error('📋 [ERROR] Stack trace:', networkError.stack);
      
      // Network-level error analysis
      if (networkError.message?.includes('fetch')) {
        console.error('🚨 [NETWORK-ANALYSIS] Network fetch error detected');
        console.error('   This indicates a problem with the HTTP request itself');
      }
      if (networkError.message?.includes('timeout')) {
        console.error('🚨 [NETWORK-ANALYSIS] Network timeout detected');
        console.error('   The request may have taken too long to complete');
      }
      
      console.groupEnd();
      
      // Re-throw with preserved error message if it's already user-friendly
      if (networkError.message?.includes('No apps found') || 
          networkError.message?.includes('temporarily unavailable') ||
          networkError.message?.includes('try again')) {
        throw networkError;
      }
      
      // Otherwise, provide a generic user-friendly message
      throw new Error('Edge function call failed. Please try again with different keywords.');
    }
  }

  /**
   * Wrap direct iTunes result into SearchResult format
   */
  private wrapDirectResult(app: ScrapedMetadata, input: string, pattern: string): SearchResult {
    correlationTracker.log('info', 'Wrapping direct iTunes result', {
      appName: app.name,
      pattern
    });

    return {
      targetApp: app,
      competitors: [], // Direct results don't include competitors
      searchContext: {
        query: input,
        type: pattern.includes('brand') ? 'brand' : 'keyword',
        totalResults: 1,
        category: app.applicationCategory || 'Unknown',
        country: 'us'
      },
      intelligence: {
        opportunities: [`Direct match found for "${input}"`]
      }
    };
  }

  /**
   * Simplified search execution with retry logic
   */
  private async executeSearchWithRetry(params: SearchParameters, config: SearchConfig, attempt = 1): Promise<SearchResult> {
    try {
      correlationTracker.log('info', `Search attempt ${attempt}/${this.maxRetries + 1}`, params);
      
      const requestBody = {
        searchTerm: params.term,
        searchType: params.type,
        organizationId: config.organizationId,
        includeCompetitorAnalysis: params.includeCompetitors,
        searchParameters: {
          country: params.country,
          limit: params.limit
        }
      };

      const { data, error } = await supabase.functions.invoke('app-store-scraper', {
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationTracker.getContext()?.id || 'unknown'
        }
      });

      if (error) {
        correlationTracker.log('error', 'Edge function error', error);
        throw new Error(`Search service error: ${error.message}`);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Search failed without specific error');
      }

      // Transform response
      return {
        targetApp: data.data,
        competitors: data.data.competitors || [],
        searchContext: {
          query: params.term,
          type: params.type,
          totalResults: (data.data.competitors?.length || 0) + 1,
          category: data.data.applicationCategory || 'Unknown',
          country: params.country
        },
        intelligence: { opportunities: [] }
      };

    } catch (error: any) {
      if (attempt <= this.maxRetries) {
        const delay = this.baseDelay * Math.pow(2, attempt - 1);
        correlationTracker.log('warn', `Retrying in ${delay}ms`, { attempt, error: error.message });
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeSearchWithRetry(params, config, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Simplified fallback search strategy
   */
  private async fallbackSearch(input: string, config: SearchConfig): Promise<SearchResult> {
    correlationTracker.log('info', 'Executing fallback search', { input });
    
    const fallbackParams: SearchParameters = {
      term: input.trim(),
      type: 'keyword',
      country: 'us',
      limit: 10,
      includeCompetitors: true
    };

    try {
      return await this.executeSearchWithRetry(fallbackParams, config);
    } catch (fallbackError) {
      correlationTracker.log('error', 'Fallback search failed', { error: fallbackError.message });
      
      return {
        targetApp: {
          name: `Search results for "${input}"`,
          url: '',
          appId: `fallback-${Date.now()}`,
          title: `Search: ${input}`,
          subtitle: 'No results found',
          locale: 'en-US',
          description: `No apps found for the search term "${input}". Please try different keywords.`
        } as ScrapedMetadata,
        competitors: [],
        searchContext: {
          query: input,
          type: 'keyword',
          totalResults: 0,
          category: 'No Results',
          country: 'us'
        },
        intelligence: {
          opportunities: ['Try different keywords', 'Check spelling', 'Use more specific terms']
        }
      };
    }
  }

  /**
   * Generate basic intelligence without complex calculations
   */
  private async generateBasicIntelligence(searchResult: SearchResult, params: SearchParameters) {
    const opportunities: string[] = [];
    
    const competitorCount = searchResult.competitors.length;
    const marketSaturation = Math.min((competitorCount / 20) * 100, 100);
    
    const avgRating = searchResult.competitors.reduce((sum, app) => sum + (app.rating || 0), 0) / competitorCount;
    const keywordDifficulty = Math.min((avgRating / 5) * 100, 100);
    
    if (marketSaturation < 40) {
      opportunities.push('Low competition detected - good opportunity for new apps');
    }
    if (avgRating < 4.0) {
      opportunities.push('Room for improvement in app quality based on competitor ratings');
    }
    if (params.type === 'keyword') {
      opportunities.push('Consider long-tail keyword variations for better targeting');
    }
    
    return {
      keywordDifficulty: Math.round(keywordDifficulty),
      marketSaturation: Math.round(marketSaturation),
      trendingScore: Math.round(Math.random() * 100),
      opportunities
    };
  }

  private getUserFriendlyError(error: any): string {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('no apps found')) {
      return error.message; // Already user-friendly from edge function
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
