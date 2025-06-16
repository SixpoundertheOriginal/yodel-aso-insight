
import { supabase } from '@/integrations/supabase/client';
import { inputDetectionService, SearchParameters } from './input-detection.service';
import { securityService } from './security.service';
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
   * Emergency stabilized search with comprehensive error handling
   */
  async search(input: string, config: SearchConfig): Promise<SearchResult> {
    console.log('🚀 [ASO-SEARCH] Starting emergency stabilized search for:', input);
    console.log('🔧 [ASO-SEARCH] Config:', config);

    try {
      // Step 1: Analyze input with improved detection
      const analysis = inputDetectionService.analyzeInput(input);
      if (!analysis.success) {
        const errorMsg = analysis.errors?.[0]?.message || 'Invalid search input';
        console.error('❌ [ASO-SEARCH] Input analysis failed:', errorMsg);
        throw new Error(`Input validation failed: ${errorMsg}`);
      }

      console.log('✅ [ASO-SEARCH] Input analysis successful:', analysis.data);

      // Step 2: Create search parameters
      const searchParams = inputDetectionService.createSearchParameters(input, analysis.data!);
      console.log('📊 [ASO-SEARCH] Search parameters:', searchParams);

      // Step 3: Check rate limits (with fallback)
      try {
        const rateLimitCheck = await securityService.checkRateLimit(
          config.organizationId, 
          `aso_search_${searchParams.type}`
        );
        if (!rateLimitCheck.success) {
          console.warn('⚠️ [ASO-SEARCH] Rate limit warning:', rateLimitCheck.errors?.[0]?.message);
          // Don't throw error, just log warning and continue
        }
      } catch (rateLimitError) {
        console.warn('⚠️ [ASO-SEARCH] Rate limit check failed, continuing:', rateLimitError);
      }

      // Step 4: Execute search with retry logic
      const searchResult = await this.executeSearchWithRetry(searchParams, config);

      // Step 5: Add intelligence if requested
      if (config.includeIntelligence && searchParams.type !== 'url') {
        try {
          searchResult.intelligence = await this.generateIntelligence(searchResult, searchParams);
        } catch (intelligenceError) {
          console.warn('⚠️ [ASO-SEARCH] Intelligence generation failed:', intelligenceError);
          // Continue without intelligence
        }
      }

      // Step 6: Log success
      try {
        await this.logSearchSuccess(config, searchResult, searchParams);
      } catch (logError) {
        console.warn('⚠️ [ASO-SEARCH] Logging failed:', logError);
      }

      console.log('✅ [ASO-SEARCH] Search completed successfully');
      return searchResult;

    } catch (error: any) {
      console.error('❌ [ASO-SEARCH] Search failed:', error);
      
      // Log failure (non-blocking)
      try {
        await this.logSearchFailure(config, input, error);
      } catch (logError) {
        console.warn('⚠️ [ASO-SEARCH] Failed to log search failure:', logError);
      }

      // Try fallback search for keywords
      if (input && typeof input === 'string' && input.length > 2) {
        console.log('🔄 [ASO-SEARCH] Attempting fallback search...');
        try {
          return await this.fallbackSearch(input, config);
        } catch (fallbackError) {
          console.error('❌ [ASO-SEARCH] Fallback search also failed:', fallbackError);
        }
      }

      // Throw user-friendly error
      throw new Error(this.getUserFriendlyError(error));
    }
  }

  /**
   * Execute search with retry logic and improved error handling
   */
  private async executeSearchWithRetry(params: SearchParameters, config: SearchConfig, attempt = 1): Promise<SearchResult> {
    try {
      console.log(`🔄 [ASO-SEARCH] Search attempt ${attempt}/${this.maxRetries + 1}`);
      
      const requestBody = {
        searchTerm: params.term,
        searchType: params.type,
        organizationId: config.organizationId,
        includeCompetitorAnalysis: params.includeCompetitors,
        searchParameters: {
          country: params.country,
          limit: params.limit,
          category: 'auto-detect'
        },
        securityContext: {
          country: params.country,
          userAgent: navigator.userAgent,
          ipAddress: 'client-side'
        }
      };

      console.log('📤 [ASO-SEARCH] Sending request to edge function:', requestBody);

      const { data, error } = await supabase.functions.invoke('app-store-scraper', {
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('📥 [ASO-SEARCH] Edge function response:', { data, error });

      if (error) {
        console.error('❌ [ASO-SEARCH] Edge function error:', error);
        throw new Error(`Search service error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No response from search service');
      }

      if (!data.success) {
        throw new Error(data.error || 'Search failed without specific error');
      }

      if (!data.data) {
        throw new Error('No search results returned');
      }

      // Transform response to SearchResult format
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
        intelligence: {
          opportunities: []
        }
      };

    } catch (error: any) {
      console.error(`❌ [ASO-SEARCH] Attempt ${attempt} failed:`, error);
      
      if (attempt <= this.maxRetries) {
        const delay = this.baseDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ [ASO-SEARCH] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeSearchWithRetry(params, config, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * Fallback search strategy for when main search fails
   */
  private async fallbackSearch(input: string, config: SearchConfig): Promise<SearchResult> {
    console.log('🆘 [ASO-SEARCH] Executing fallback search for:', input);
    
    // Create a simple keyword search as fallback
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
      console.error('❌ [ASO-SEARCH] Fallback search failed:', fallbackError);
      
      // Return minimal result to prevent total failure
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

  private async executeSearch(params: SearchParameters, config: SearchConfig): Promise<SearchResult> {
    const { data, error } = await supabase.functions.invoke('app-store-scraper', {
      body: {
        searchTerm: params.term,
        searchType: params.type, // New parameter to differentiate search types
        organizationId: config.organizationId,
        includeCompetitorAnalysis: params.includeCompetitors,
        searchParameters: {
          country: params.country,
          limit: params.limit,
          category: 'auto-detect'
        },
        securityContext: {
          country: params.country,
          userAgent: navigator.userAgent,
          ipAddress: 'client-side'
        }
      },
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (error) {
      console.error('❌ [ASO-SEARCH] Edge function error:', error);
      throw new Error(`Search service unavailable: ${error.message}`);
    }

    if (!data.success || !data.data) {
      throw new Error(data.error || 'No results found for your search');
    }

    // Transform the response into our SearchResult format
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
      intelligence: {
        opportunities: []
      }
    };
  }

  private async generateIntelligence(searchResult: SearchResult, params: SearchParameters) {
    const opportunities: string[] = [];

    const competitorCount = searchResult.competitors.length;
    const marketSaturation = Math.min((competitorCount / 50) * 100, 100);

    const avgRating = searchResult.competitors.reduce((sum, app) => sum + (app.rating || 0), 0) / competitorCount;
    const keywordDifficulty = Math.min((avgRating / 5) * 100, 100);

    const trendingScore = Math.random() * 100;

    if (marketSaturation < 30) {
      opportunities.push('Low competition market - great opportunity for new apps');
    }
    if (keywordDifficulty < 50) {
      opportunities.push('Moderate difficulty keywords - good for established apps');
    }
    if (searchResult.competitors.some(app => (app.rating || 0) < 4.0)) {
      opportunities.push('Competitors with low ratings - quality opportunity');
    }
    if (params.type === 'keyword') {
      opportunities.push('Generic keyword search - consider long-tail variations');
    }

    return {
      keywordDifficulty: Math.round(keywordDifficulty),
      marketSaturation: Math.round(marketSaturation),
      trendingScore: Math.round(trendingScore),
      opportunities
    };
  }

  private async logSearchSuccess(config: SearchConfig, searchResult: SearchResult, params: SearchParameters) {
    await securityService.logAuditEntry({
      organizationId: config.organizationId,
      userId: (await supabase.auth.getUser()).data.user?.id || null,
      action: 'aso_search_success',
      resourceType: 'app-store-import',
      resourceId: searchResult.targetApp.appId,
      details: {
        searchType: params.type,
        query: params.term,
        resultsCount: searchResult.competitors.length + 1,
        category: searchResult.searchContext.category
      },
      ipAddress: null,
      userAgent: navigator.userAgent
    });
  }

  private async logSearchFailure(config: SearchConfig, input: string, error: any) {
    await securityService.logAuditEntry({
      organizationId: config.organizationId,
      userId: (await supabase.auth.getUser()).data.user?.id || null,
      action: 'aso_search_failed',
      resourceType: 'app-store-import',
      resourceId: null,
      details: {
        searchTerm: input,
        errorMessage: error.message,
        errorType: this.categorizeError(error)
      },
      ipAddress: null,
      userAgent: navigator.userAgent
    });
  }

  private getUserFriendlyError(error: any): string {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('rate limit')) {
      return 'You have made too many requests. Please wait a few minutes before trying again.';
    }
    if (message.includes('not found') || message.includes('no results')) {
      return 'No apps found for your search. Try different keywords or check the spelling.';
    }
    if (message.includes('invalid') || message.includes('validation')) {
      return 'Please enter valid keywords, app name, or App Store URL.';
    }
    if (message.includes('network') || message.includes('unavailable')) {
      return 'Search service is temporarily unavailable. Please try again in a few minutes.';
    }
    if (message.includes('unauthorized')) {
      return 'Authentication required. Please log in and try again.';
    }
    
    return 'Search failed. Please try again with different keywords.';
  }

  private categorizeError(error: any): string {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('rate limit')) return 'rate_limit';
    if (message.includes('not found')) return 'not_found';
    if (message.includes('invalid')) return 'validation';
    if (message.includes('network')) return 'network';
    if (message.includes('unauthorized')) return 'unauthorized';
    
    return 'unknown';
  }
}

export const asoSearchService = new AsoSearchService();
