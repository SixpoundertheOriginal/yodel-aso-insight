import { supabase } from '@/integrations/supabase/client';
import { inputDetectionService, SearchParameters } from './input-detection.service';
import { bypassPatternsService } from './bypass-patterns.service';
import { correlationTracker } from './correlation-tracker.service';
import { directItunesService } from './direct-itunes.service';
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
   * EMERGENCY BYPASS: Smart search with comprehensive debugging
   */
  async search(input: string, config: SearchConfig): Promise<SearchResult> {
    // Create correlation context for request tracing
    const correlationContext = correlationTracker.createContext('aso-search', config.organizationId);
    
    correlationTracker.log('info', 'ASO search initiated with emergency debugging', { input, config });

    try {
      // PHASE 1: Emergency bypass analysis
      const bypassAnalysis = bypassPatternsService.analyzeForBypass(input);
      correlationTracker.log('info', 'Bypass analysis completed', bypassAnalysis);

      // BYPASS PATH: Direct iTunes API for safe inputs
      if (bypassAnalysis.shouldBypass && bypassAnalysis.confidence > 0.8) {
        correlationTracker.log('info', 'Taking bypass path', { reason: bypassAnalysis.reason });
        
        try {
          const directResult = await directItunesService.searchDirect(input, {
            organizationId: config.organizationId,
            country: 'us',
            limit: 25,
            bypassReason: bypassAnalysis.reason
          });

          return this.wrapDirectResult(directResult, input, bypassAnalysis.pattern);
        } catch (bypassError) {
          correlationTracker.log('warn', 'Bypass path failed, falling back to edge function', {
            error: bypassError.message
          });
          // Fall through to edge function
        }
      }

      // EMERGENCY PATH: Use edge function with enhanced debugging
      correlationTracker.log('info', 'Using edge function with emergency debugging');
      return await this.searchWithEmergencyDebugging(input, config);

    } catch (error: any) {
      correlationTracker.log('error', 'All search paths failed', { error: error.message });
      throw new Error(this.getUserFriendlyError(error));
    }
  }

  /**
   * EMERGENCY: Enhanced edge function call with comprehensive debugging
   */
  private async searchWithEmergencyDebugging(input: string, config: SearchConfig): Promise<SearchResult> {
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

    // EMERGENCY DEBUG: Log frontend request details
    console.log('🔍 [FRONTEND] Preparing edge function request:', {
      requestBody,
      bodySize: JSON.stringify(requestBody).length,
      correlationId: correlationTracker.getContext()?.id
    });

    // EMERGENCY DEBUG: Validate request before sending
    if (!requestBody.searchTerm || requestBody.searchTerm.trim() === '') {
      throw new Error('Frontend validation failed: searchTerm is empty');
    }

    if (!requestBody.organizationId) {
      throw new Error('Frontend validation failed: organizationId is missing');
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

      console.log('📥 [FRONTEND] Edge function response received:', {
        hasData: !!data,
        hasError: !!error,
        dataSuccess: data?.success,
        errorMessage: error?.message
      });

      if (error) {
        console.error('❌ [FRONTEND] Edge function error:', error);
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!data || !data.success) {
        console.error('❌ [FRONTEND] Edge function returned unsuccessful response:', data);
        throw new Error(data?.error || 'Edge function returned unsuccessful response');
      }

      console.log('✅ [FRONTEND] Edge function call successful');

      // Transform response
      return {
        targetApp: data.data,
        competitors: data.data.competitors || [],
        searchContext: {
          query: input,
          type: 'keyword',
          totalResults: (data.data.competitors?.length || 0) + 1,
          category: data.data.applicationCategory || 'Unknown',
          country: 'us'
        },
        intelligence: { 
          opportunities: data.debugMode ? ['Emergency debug mode active'] : [] 
        }
      };

    } catch (error: any) {
      console.error('💥 [FRONTEND] Edge function call failed:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Simplified validation path - bypass heavy input analysis
   */
  private async searchWithSimplifiedValidation(input: string, config: SearchConfig): Promise<SearchResult> {
    // Simple input type detection
    const isUrl = input.includes('apps.apple.com') || input.includes('play.google.com');
    const searchParams: SearchParameters = {
      term: input.trim(),
      type: isUrl ? 'url' : 'keyword',
      country: 'us',
      limit: 25,
      includeCompetitors: true
    };

    return await this.executeSearchWithRetry(searchParams, config);
  }

  /**
   * Complex validation path - original logic
   */
  private async searchWithComplexValidation(input: string, config: SearchConfig): Promise<SearchResult> {
    // Step 1: Analyze input
    const analysis = inputDetectionService.analyzeInput(input);
    if (!analysis.success) {
      const errorMsg = analysis.errors?.[0]?.message || 'Invalid search input';
      throw new Error(`Input validation failed: ${errorMsg}`);
    }

    console.log('✅ [ASO-SEARCH] Input analysis successful:', analysis.data);

    // Step 2: Create search parameters
    const searchParams = inputDetectionService.createSearchParameters(input, analysis.data!);
    console.log('📊 [ASO-SEARCH] Search parameters:', searchParams);

    // Step 3: Execute search with retry logic
    const searchResult = await this.executeSearchWithRetry(searchParams, config);

    // Step 4: Add basic intelligence if requested
    if (config.includeIntelligence && searchParams.type !== 'url') {
      try {
        searchResult.intelligence = await this.generateBasicIntelligence(searchResult, searchParams);
      } catch (intelligenceError) {
        console.warn('⚠️ [ASO-SEARCH] Intelligence generation failed:', intelligenceError);
        // Continue without intelligence
      }
    }

    console.log('✅ [ASO-SEARCH] Search completed successfully');
    return searchResult;

  }

  /**
   * Wrap direct iTunes result in SearchResult format
   */
  private wrapDirectResult(result: ScrapedMetadata, query: string, pattern: string): SearchResult {
    return {
      targetApp: result,
      competitors: [], // Direct bypass doesn't include competitors for speed
      searchContext: {
        query,
        type: 'keyword',
        totalResults: 1,
        category: result.applicationCategory || 'Unknown',
        country: 'us'
      },
      intelligence: {
        opportunities: [`Direct bypass used (${pattern})`]
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
}

export const asoSearchService = new AsoSearchService();
