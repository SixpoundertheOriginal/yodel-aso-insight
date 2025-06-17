/**
 * Direct iTunes API Service
 * Bypass service for direct iTunes Search API calls
 */

import { ScrapedMetadata } from '@/types/aso';
import { correlationTracker } from './correlation-tracker.service';

export interface DirectSearchConfig {
  organizationId: string;
  country?: string;
  limit?: number;
  bypassReason: string;
}

export interface SearchResultsResponse {
  isAmbiguous: boolean;
  results: ScrapedMetadata[];
  searchTerm: string;
}

class DirectItunesService {
  private baseUrl = 'https://itunes.apple.com/search';

  /**
   * Direct iTunes API search - bypasses all complex validation
   */
  async searchDirect(term: string, config: DirectSearchConfig): Promise<ScrapedMetadata> {
    const correlationId = correlationTracker.getContext()?.id || 'direct-search';
    
    correlationTracker.log('info', `Direct iTunes search initiated`, {
      term,
      bypassReason: config.bypassReason,
      config
    });

    try {
      const searchUrl = this.buildSearchUrl(term, config);
      
      correlationTracker.log('info', `Calling iTunes API directly`, { searchUrl });
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'ASO-Insights-Platform/Emergency-Bypass'
        }
      });

      if (!response.ok) {
        throw new Error(`iTunes API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        throw new Error(`No results found for "${term}"`);
      }

      const app = data.results[0];
      const result = this.transformItunesResult(app);
      
      correlationTracker.log('info', `Direct search successful`, {
        appName: result.name,
        resultsCount: data.results.length
      });

      return result;

    } catch (error: any) {
      correlationTracker.log('error', `Direct search failed`, {
        error: error.message,
        term
      });
      throw new Error(`Direct search failed: ${error.message}`);
    }
  }

  /**
   * Enhanced search with ambiguity detection
   */
  async searchWithAmbiguityDetection(term: string, config: DirectSearchConfig): Promise<SearchResultsResponse> {
    const correlationId = correlationTracker.getContext()?.id || 'ambiguity-search';
    
    correlationTracker.log('info', `Ambiguity detection search initiated`, {
      term,
      config
    });

    try {
      const searchUrl = this.buildSearchUrl(term, { ...config, limit: 25 });
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'ASO-Insights-Platform/Ambiguity-Detection'
        }
      });

      if (!response.ok) {
        throw new Error(`iTunes API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        throw new Error(`No results found for "${term}"`);
      }

      const transformedResults = data.results
        .slice(0, 15) // Limit to 15 for processing
        .map((app: any) => this.transformItunesResult(app));

      // Ambiguity detection logic
      const highQualityResults = transformedResults.filter((app: ScrapedMetadata) => 
        app.rating && app.rating >= 3.5 && app.reviews && app.reviews >= 50
      );

      const isAmbiguous = transformedResults.length >= 3 && highQualityResults.length >= 2;

      correlationTracker.log('info', `Ambiguity analysis completed`, {
        totalResults: transformedResults.length,
        highQualityResults: highQualityResults.length,
        isAmbiguous,
        term
      });

      return {
        isAmbiguous,
        results: isAmbiguous ? highQualityResults.slice(0, 10) : transformedResults.slice(0, 1),
        searchTerm: term
      };

    } catch (error: any) {
      correlationTracker.log('error', `Ambiguity detection search failed`, {
        error: error.message,
        term
      });
      throw new Error(`Ambiguity detection search failed: ${error.message}`);
    }
  }

  private buildSearchUrl(term: string, config: DirectSearchConfig): string {
    const params = new URLSearchParams({
      term: encodeURIComponent(term),
      country: config.country || 'us',
      entity: 'software',
      limit: (config.limit || 25).toString()
    });

    return `${this.baseUrl}?${params.toString()}`;
  }

  private transformItunesResult(app: any): ScrapedMetadata {
    return {
      name: app.trackName || 'Unknown App',
      appId: app.trackId?.toString() || `direct-${Date.now()}`,
      title: app.trackName || 'Unknown App',
      subtitle: app.trackCensoredName || '',
      description: app.description || '',
      url: app.trackViewUrl || '',
      icon: app.artworkUrl512 || app.artworkUrl100 || '',
      rating: app.averageUserRating || 0,
      reviews: app.userRatingCount || 0,
      developer: app.artistName || 'Unknown Developer',
      applicationCategory: app.primaryGenreName || 'Unknown',
      locale: 'en-US'
    };
  }
}

export const directItunesService = new DirectItunesService();
