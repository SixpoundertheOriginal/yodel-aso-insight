
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
  /**
   * Enhanced search that handles both URLs and keywords intelligently
   */
  async search(input: string, config: SearchConfig): Promise<SearchResult> {
    console.log('🔍 [ASO-SEARCH] Starting intelligent search for:', input);

    try {
      // Step 1: Analyze input type
      const analysis = inputDetectionService.analyzeInput(input);
      if (!analysis.success) {
        throw new Error(`Invalid search input: ${analysis.errors?.[0]?.message}`);
      }

      // Step 2: Create optimized search parameters
      const searchParams = inputDetectionService.createSearchParameters(input, analysis.data!);
      console.log('📊 [ASO-SEARCH] Search parameters:', searchParams);

      // Step 3: Check rate limits
      const rateLimitCheck = await securityService.checkRateLimit(
        config.organizationId, 
        `aso_search_${searchParams.type}`
      );
      if (!rateLimitCheck.success) {
        throw new Error(`Rate limit exceeded: ${rateLimitCheck.errors?.[0]?.message}`);
      }

      // Step 4: Execute search via edge function
      const searchResult = await this.executeSearch(searchParams, config);

      // Step 5: Add ASO intelligence if requested
      if (config.includeIntelligence && searchParams.type !== 'url') {
        searchResult.intelligence = await this.generateIntelligence(searchResult, searchParams);
      }

      // Step 6: Log successful search
      await securityService.logAuditEntry({
        organizationId: config.organizationId,
        userId: (await supabase.auth.getUser()).data.user?.id || null,
        action: 'aso_search_success',
        resourceType: 'app-store-import',
        resourceId: searchResult.targetApp.appId,
        details: {
          searchType: searchParams.type,
          query: searchParams.term,
          resultsCount: searchResult.competitors.length + 1,
          category: searchResult.searchContext.category
        },
        ipAddress: null,
        userAgent: navigator.userAgent
      });

      console.log('✅ [ASO-SEARCH] Search completed successfully');
      return searchResult;

    } catch (error: any) {
      console.error('❌ [ASO-SEARCH] Search failed:', error);

      // Log failed search
      try {
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
      } catch (auditError) {
        console.warn('⚠️ [ASO-SEARCH] Failed to log audit entry:', auditError);
      }

      throw error;
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

    // Analyze market saturation
    const competitorCount = searchResult.competitors.length;
    const marketSaturation = Math.min((competitorCount / 50) * 100, 100);

    // Generate keyword difficulty based on competitor strength
    const avgRating = searchResult.competitors.reduce((sum, app) => sum + (app.rating || 0), 0) / competitorCount;
    const keywordDifficulty = Math.min((avgRating / 5) * 100, 100);

    // Generate trending score (simplified)
    const trendingScore = Math.random() * 100; // In real implementation, this would use actual trend data

    // Generate opportunities
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
