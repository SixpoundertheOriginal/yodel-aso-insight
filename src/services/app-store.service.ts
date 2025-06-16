
import { supabase } from '@/integrations/supabase/client';
import { ScrapedMetadata, ValidationResult, ImportConfig, CompetitorData } from '@/types/aso';
import { asoSearchService, SearchResult } from './aso-search.service';

class AppStoreService {
  /**
   * Enhanced import that intelligently handles URLs, brands, and keywords
   */
  async importAppData(input: string, config: ImportConfig): Promise<ScrapedMetadata> {
    console.log('🚀 [APP-STORE-SERVICE] Starting intelligent import for:', input);

    try {
      // Use the new ASO search service for intelligent processing
      const searchResult: SearchResult = await asoSearchService.search(input, {
        organizationId: config.organizationId,
        includeIntelligence: true,
        cacheResults: config.includeCaching !== false,
        debugMode: config.debugMode
      });

      // Validate the response data
      const validationResult = this.validateScrapedData(searchResult.targetApp);
      if (!validationResult.isValid) {
        console.warn('⚠️ [APP-STORE-SERVICE] Data validation issues:', validationResult.issues);
        // Use sanitized data but log warnings
        return validationResult.sanitized;
      }

      console.log('✅ [APP-STORE-SERVICE] Successfully imported app data:', searchResult.targetApp.name);
      console.log('📊 [APP-STORE-SERVICE] Search intelligence:', searchResult.intelligence);
      
      // Transform competitors to match CompetitorData interface
      const transformedCompetitors: CompetitorData[] = searchResult.competitors.map((competitor, index) => ({
        id: competitor.appId || `competitor-${index}`,
        name: competitor.name,
        title: competitor.title,
        subtitle: competitor.subtitle,
        keywords: competitor.description?.substring(0, 200) || '', // Use description as keywords fallback
        description: competitor.description,
        category: competitor.applicationCategory || 'Unknown',
        rating: competitor.rating,
        reviews: competitor.reviews,
        icon: competitor.icon,
        developer: competitor.developer
      }));

      // Enhanced metadata with search context and intelligence
      const enhancedMetadata: ScrapedMetadata = {
        ...searchResult.targetApp,
        // Add search context to metadata for UI display
        searchContext: searchResult.searchContext,
        asoIntelligence: searchResult.intelligence,
        competitorData: transformedCompetitors.slice(0, 5) // Limit competitors for UI
      };

      return enhancedMetadata;

    } catch (error: any) {
      console.error('❌ [APP-STORE-SERVICE] Import failed:', error);
      
      // Provide user-friendly error messages based on error type
      let userMessage = error.message;
      
      if (error.message?.includes('Rate limit exceeded')) {
        userMessage = 'You have made too many requests. Please wait a few minutes before trying again.';
      } else if (error.message?.includes('No results found')) {
        userMessage = 'No apps found for your search. Try different keywords or check the spelling.';
      } else if (error.message?.includes('Invalid search input')) {
        userMessage = 'Please enter a valid app name, keywords, or App Store URL.';
      } else if (error.message?.includes('Search service unavailable')) {
        userMessage = 'The search service is temporarily unavailable. Please try again in a few minutes.';
      }

      throw new Error(userMessage);
    }
  }

  /**
   * Validate scraped metadata for completeness and security
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

    // Required field validation
    if (!data.name || typeof data.name !== 'string') {
      issues.push('App name is missing or invalid');
      sanitized.name = 'Unknown App';
    }

    if (!data.appId || typeof data.appId !== 'string') {
      issues.push('App ID is missing or invalid');
      sanitized.appId = `temp-${Date.now()}`;
    }

    if (!data.title || typeof data.title !== 'string') {
      issues.push('App title is missing or invalid');
      sanitized.title = sanitized.name;
    }

    if (!data.subtitle || typeof data.subtitle !== 'string') {
      issues.push('App subtitle is missing');
      sanitized.subtitle = '';
    }

    // Sanitize text fields
    if (sanitized.description) {
      sanitized.description = this.sanitizeText(sanitized.description);
    }

    return {
      isValid: issues.length === 0,
      issues,
      sanitized
    };
  }

  /**
   * Sanitize text content to prevent XSS
   */
  private sanitizeText(text: string): string {
    return text
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim()
      .substring(0, 10000); // Reasonable length limit
  }
}

export const appStoreService = new AppStoreService();
