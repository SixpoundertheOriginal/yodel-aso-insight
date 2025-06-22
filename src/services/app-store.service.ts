
import { supabase } from '@/integrations/supabase/client';
import { ScrapedMetadata, ValidationResult, ImportConfig, CompetitorData } from '@/types/aso';
import { asoSearchService, SearchResult } from './aso-search.service';
import { AmbiguousSearchError } from '@/types/search-errors';

class AppStoreService {
  /**
   * Simplified import with direct iTunes API integration
   */
  async importAppData(input: string, config: ImportConfig): Promise<ScrapedMetadata> {
    console.log('🚀 [APP-STORE-SERVICE] Starting simplified import for:', input);
    console.log('⚙️ [APP-STORE-SERVICE] Config:', config);

    // Input validation
    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      throw new Error('Search input cannot be empty');
    }

    if (!config.organizationId) {
      throw new Error('Organization ID is required');
    }

    const trimmedInput = input.trim();

    try {
      console.log('📤 [APP-STORE-SERVICE] Calling simplified asoSearchService.search...');
      
      // Use the simplified ASO search service
      const searchResult: SearchResult = await asoSearchService.search(trimmedInput, {
        organizationId: config.organizationId,
        includeIntelligence: true,
        cacheResults: config.includeCaching !== false,
        debugMode: config.debugMode
      });

      console.log('✅ [APP-STORE-SERVICE] Search successful:', {
        targetAppName: searchResult.targetApp.name,
        competitorCount: searchResult.competitors.length,
        searchType: searchResult.searchContext.type,
        hasIntelligence: !!searchResult.intelligence
      });

      // Validate the response data
      const validationResult = this.validateScrapedData(searchResult.targetApp);
      if (!validationResult.isValid) {
        console.warn('⚠️ [APP-STORE-SERVICE] Data validation issues:', validationResult.issues);
        // Use sanitized data but continue
      }
      
      // Transform competitors to match CompetitorData interface
      const transformedCompetitors: CompetitorData[] = searchResult.competitors.map((competitor, index) => ({
        id: competitor.appId || competitor.name?.replace(/\s+/g, '-').toLowerCase() || `competitor-${index}`,
        name: competitor.name || 'Unknown App',
        title: competitor.title || competitor.name || 'Unknown Title',
        subtitle: competitor.subtitle || '',
        keywords: competitor.description?.substring(0, 200) || '',
        description: competitor.description || '',
        category: competitor.applicationCategory || searchResult.searchContext.category || 'Unknown',
        rating: competitor.rating,
        reviews: competitor.reviews,
        icon: competitor.icon,
        developer: competitor.developer
      }));

      // Enhanced metadata with simplified context
      const enhancedMetadata: ScrapedMetadata = {
        ...validationResult.sanitized,
        // Override with actual data
        name: searchResult.targetApp.name || validationResult.sanitized.name,
        title: searchResult.targetApp.title || validationResult.sanitized.title,
        subtitle: searchResult.targetApp.subtitle || validationResult.sanitized.subtitle,
        description: searchResult.targetApp.description || validationResult.sanitized.description,
        // Add simplified context
        searchContext: searchResult.searchContext,
        asoIntelligence: searchResult.intelligence,
        competitorData: transformedCompetitors.slice(0, 5), // Limit for UI performance
        marketInsights: {
          totalCompetitors: searchResult.competitors.length,
          category: searchResult.searchContext.category,
          searchType: searchResult.searchContext.type,
          marketPosition: searchResult.intelligence?.marketSaturation ? 
            (searchResult.intelligence.marketSaturation < 30 ? 'low-competition' : 
             searchResult.intelligence.marketSaturation < 70 ? 'moderate-competition' : 'high-competition') : 'unknown'
        }
      };

      console.log('🎯 [APP-STORE-SERVICE] Enhanced metadata prepared:', {
        name: enhancedMetadata.name,
        hasSearchContext: !!enhancedMetadata.searchContext,
        hasIntelligence: !!enhancedMetadata.asoIntelligence,
        competitorCount: enhancedMetadata.competitorData?.length || 0,
        marketInsights: enhancedMetadata.marketInsights
      });

      return enhancedMetadata;

    } catch (error: any) {
      console.error('❌ [APP-STORE-SERVICE] Import failed:', error);
      
      // CRITICAL FIX: Preserve AmbiguousSearchError instead of converting to generic Error
      if (error instanceof AmbiguousSearchError) {
        console.log('🎯 [APP-STORE-SERVICE] Re-throwing AmbiguousSearchError for user selection');
        throw error; // Re-throw as-is to preserve type and candidates data
      }
      
      // Enhanced error handling with user-friendly messages for other errors
      let userMessage = this.getUserFriendlyError(error, trimmedInput);
      
      // Add debugging info in development
      if (config.debugMode && process.env.NODE_ENV === 'development') {
        userMessage += ` [Debug: ${error.message}]`;
      }

      throw new Error(userMessage);
    }
  }

  /**
   * Enhanced data validation with better error recovery
   */
  private validateScrapedData(data: any): ValidationResult {
    const issues: string[] = [];
    const sanitized: ScrapedMetadata = {
      name: '',
      url: '',
      appId: '',
      title: '',
      subtitle: '',
      locale: 'en-US',
      ...data
    };

    // Required field validation with fallbacks
    if (!data.name || typeof data.name !== 'string') {
      issues.push('App name is missing or invalid');
      sanitized.name = data.title || data.trackName || 'Unknown App';
    }

    if (!data.appId || typeof data.appId !== 'string') {
      issues.push('App ID is missing or invalid');
      sanitized.appId = data.trackId?.toString() || `temp-${Date.now()}`;
    }

    if (!data.title || typeof data.title !== 'string') {
      issues.push('App title is missing or invalid');
      sanitized.title = sanitized.name;
    }

    if (!data.subtitle || typeof data.subtitle !== 'string') {
      sanitized.subtitle = data.shortDescription || '';
    }

    // Sanitize text fields
    if (sanitized.description) {
      sanitized.description = this.sanitizeText(sanitized.description);
    }

    // Ensure required fields have values
    if (!sanitized.name) sanitized.name = 'Unknown App';
    if (!sanitized.title) sanitized.title = sanitized.name;
    if (!sanitized.appId) sanitized.appId = `unknown-${Date.now()}`;

    return {
      isValid: issues.length === 0,
      issues,
      sanitized
    };
  }

  private sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim()
      .substring(0, 10000); // Reasonable length limit
  }

  private getUserFriendlyError(error: any, input: string): string {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('rate limit')) {
      return 'You have made too many requests. Please wait a few minutes before trying again.';
    }
    
    if (message.includes('no apps found') || message.includes('no results found')) {
      return `No apps found for "${input}". Try different keywords or check the spelling.`;
    }
    
    if (message.includes('invalid') && message.includes('url')) {
      return 'Please enter a valid App Store URL, app name, or keywords.';
    }
    
    if (message.includes('validation') || message.includes('invalid input')) {
      return 'Please enter valid keywords, app name, or App Store URL.';
    }
    
    if (message.includes('unavailable') || message.includes('network') || message.includes('service')) {
      return 'The search service is temporarily unavailable. Please try again in a few minutes.';
    }
    
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return 'Authentication required. Please log in and try again.';
    }
    
    if (message.includes('organization')) {
      return 'Organization context is missing. Please refresh the page and try again.';
    }
    
    // Generic fallback
    return 'Search failed. Please try again with different keywords.';
  }
}

export const appStoreService = new AppStoreService();
