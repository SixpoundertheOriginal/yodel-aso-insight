
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
   * Enhanced search with improved error handling and routing
   */
  async search(input: string, config: SearchConfig): Promise<SearchResult> {
    // Create correlation context for request tracing
    const correlationContext = correlationTracker.createContext('aso-search', config.organizationId);
    
    correlationTracker.log('info', 'ASO search initiated with enhanced routing', { input, config });

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

      // MAIN PATH: Use edge function with enhanced error handling
      correlationTracker.log('info', 'Using edge function with enhanced error handling');
      return await this.searchWithEnhancedErrorHandling(input, config);

    } catch (error: any) {
      // Re-throw AmbiguousSearchError without modification
      if (error instanceof AmbiguousSearchError) {
        throw error;
      }
      
      correlationTracker.log('error', 'All search paths failed', { error: error.message });
      throw new Error(this.getUserFriendlyError(error));
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
   * Enhanced edge function call with better error handling
   */
  private async searchWithEnhancedErrorHandling(input: string, config: SearchConfig): Promise<SearchResult> {
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

    // Enhanced debug logging
    console.log('🔍 [FRONTEND] Preparing enhanced edge function request:', {
      requestBody,
      bodySize: JSON.stringify(requestBody).length,
      correlationId: correlationTracker.getContext()?.id
    });

    // Validate request before sending
    if (!requestBody.searchTerm || requestBody.searchTerm.trim() === '') {
      throw new Error('Search term cannot be empty');
    }

    if (!requestBody.organizationId) {
      throw new Error('Organization ID is required');
    }

    console.log('✅ [FRONTEND] Request validation passed, calling edge function');

    try {
      const { data, error } = await supabase.functions.invoke('app-store-scraper', {
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationTracker.getContext()?.id || 'unknown'
        }
      });

      console.log('📥 [FRONTEND] Enhanced edge function response received:', {
        hasData: !!data,
        hasError: !!error,
        dataSuccess: data?.success,
        errorMessage: error?.message,
        dataError: data?.error
      });

      if (error) {
        console.error('❌ [FRONTEND] Edge function error:', error);
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!data || !data.success) {
        console.error('❌ [FRONTEND] Edge function returned unsuccessful response:', data);
        const errorMessage = data?.error || 'Edge function returned unsuccessful response';
        
        // Enhanced error messages based on the response
        if (errorMessage.includes('No apps found')) {
          throw new Error(`No apps found for "${input}". Try different keywords or check the spelling.`);
        }
        if (errorMessage.includes('Invalid request')) {
          throw new Error('Search request was invalid. Please try again.');
        }
        if (errorMessage.includes('temporarily unavailable')) {
          throw new Error('App Store search is temporarily unavailable. Please try again in a few minutes.');
        }
        
        throw new Error(errorMessage);
      }

      console.log('✅ [FRONTEND] Enhanced edge function call successful');

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

      return {
        targetApp,
        competitors: responseData.competitors || [],
        searchContext: {
          query: input,
          type: 'keyword',
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

    } catch (error: any) {
      console.error('💥 [FRONTEND] Enhanced edge function call failed:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
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
    if (message.includes('edge function')) {
      return 'Search service encountered an error. Please try again with different keywords.';
    }
    
    return 'Search failed. Please try again with different keywords or check your internet connection.';
  }
}

export const asoSearchService = new AsoSearchService();
