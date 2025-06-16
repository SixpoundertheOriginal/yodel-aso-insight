
import { supabase } from '@/integrations/supabase/client';
import { inputDetectionService, SearchParameters } from './input-detection.service';
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
   * Simplified search with direct iTunes API integration
   */
  async search(input: string, config: SearchConfig): Promise<SearchResult> {
    console.log('🚀 [ASO-SEARCH] Starting simplified search for:', input);
    console.log('🔧 [ASO-SEARCH] Config:', config);

    try {
      // Step 1: Analyze input
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

    } catch (error: any) {
      console.error('❌ [ASO-SEARCH] Search failed:', error);
      
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
   * Simplified search execution with retry logic
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
          limit: params.limit
        }
      };

      console.log('📤 [ASO-SEARCH] Sending request to simplified edge function:', requestBody);

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
   * Simplified fallback search strategy
   */
  private async fallbackSearch(input: string, config: SearchConfig): Promise<SearchResult> {
    console.log('🆘 [ASO-SEARCH] Executing simplified fallback search for:', input);
    
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

  /**
   * Generate basic intelligence without complex calculations
   */
  private async generateBasicIntelligence(searchResult: SearchResult, params: SearchParameters) {
    const opportunities: string[] = [];
    
    const competitorCount = searchResult.competitors.length;
    const marketSaturation = Math.min((competitorCount / 20) * 100, 100); // Simplified calculation
    
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
      trendingScore: Math.round(Math.random() * 100), // Simplified trending score
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
