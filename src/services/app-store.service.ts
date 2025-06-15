
import { supabase } from '@/integrations/supabase/client';
import { ScrapedMetadata, ValidationResult, ImportConfig } from '@/types/aso';

class AppStoreService {
  private cache = new Map<string, { data: ScrapedMetadata; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Enterprise-grade data validation with detailed error reporting
   */
  validateMetadata(data: any): ValidationResult {
    const issues: string[] = [];
    
    console.log('🔍 [VALIDATION] Raw data received:', JSON.stringify(data, null, 2));
    
    // Check required fields
    if (!data.id) issues.push('Missing app ID');
    if (!data.name) issues.push('Missing app name');
    if (!data.url) issues.push('Missing app URL');
    if (!data.title) issues.push('Missing app title');
    
    // Check data types and values
    if (data.rating !== undefined && (typeof data.rating !== 'number' || isNaN(data.rating))) {
      issues.push(`Invalid rating: ${data.rating} (type: ${typeof data.rating})`);
    }
    
    if (data.reviews !== undefined && (typeof data.reviews !== 'number' || isNaN(data.reviews))) {
      issues.push(`Invalid reviews count: ${data.reviews} (type: ${typeof data.reviews})`);
    }
    
    // Check for missing visual elements
    if (!data.icon) issues.push('Missing app icon URL');
    if (!data.developer) issues.push('Missing developer name');
    if (!data.subtitle) issues.push('Missing app subtitle');
    
    console.log('⚠️ [VALIDATION] Data validation issues:', issues);
    
    // Create sanitized version with enterprise-grade defaults
    const sanitized: ScrapedMetadata = {
      appId: data.id || '',
      name: data.name || 'Unknown App',
      url: data.url || '',
      title: data.title || data.name || 'App Title',
      subtitle: data.subtitle || '',
      description: data.description || 'No description available.',
      applicationCategory: data.applicationCategory || 'App',
      locale: data.locale || 'us',
      icon: data.icon || undefined,
      developer: data.developer || data.author || undefined,
      rating: typeof data.rating === 'number' && !isNaN(data.rating) ? data.rating : 0,
      reviews: typeof data.reviews === 'number' && !isNaN(data.reviews) ? data.reviews : 0,
      price: data.price || 'Free',
    };
    
    console.log('✅ [VALIDATION] Sanitized metadata:', JSON.stringify(sanitized, null, 2));
    
    return {
      isValid: issues.length === 0,
      issues,
      sanitized
    };
  }

  /**
   * Import app data with caching and organization context
   */
  async importAppData(appStoreUrl: string, config: ImportConfig): Promise<ScrapedMetadata> {
    const cacheKey = `${config.organizationId}-${appStoreUrl}`;
    
    // Check cache first
    if (config.includeCaching !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log('📦 [CACHE] Using cached data for:', appStoreUrl);
        return cached.data;
      }
    }

    console.log('🚀 [IMPORT] Starting import process for:', appStoreUrl);
    console.log('🏢 [IMPORT] Organization ID:', config.organizationId);

    try {
      console.log('📡 [IMPORT] Calling app-store-scraper function...');
      const { data: responseData, error: invokeError } = await supabase.functions.invoke('app-store-scraper', {
        body: { 
          appStoreUrl, 
          organizationId: config.organizationId 
        },
      });

      console.log('📦 [IMPORT] Raw response from scraper:', JSON.stringify(responseData, null, 2));

      if (invokeError) {
        console.error('❌ [IMPORT] Supabase function invocation error:', invokeError);
        throw new Error(`The import service is currently unavailable. Please try again later. (Details: ${invokeError.message})`);
      }

      if (responseData.error) {
        console.error('❌ [IMPORT] App Store scraper application error:', responseData.error);
        throw new Error(responseData.error);
      }
      
      const validation = config.validateData !== false ? this.validateMetadata(responseData) : {
        isValid: true,
        issues: [],
        sanitized: responseData as ScrapedMetadata
      };
      
      if (!validation.sanitized.name || !validation.sanitized.url || !validation.sanitized.title) {
        console.error('❌ [IMPORT] Critical data missing after validation:', validation.sanitized);
        throw new Error('Received incomplete data from the import service. The App Store page might have a non-standard format.');
      }

      // Extract locale from URL for enhanced data
      const urlParts = new URL(validation.sanitized.url).pathname.split('/');
      const locale = urlParts[1] || 'us';
      
      const finalMetadata = {
        ...validation.sanitized,
        locale: locale,
      };

      // Cache the result
      if (config.includeCaching !== false) {
        this.cache.set(cacheKey, {
          data: finalMetadata,
          timestamp: Date.now()
        });
      }

      console.log('🎯 [IMPORT] Final metadata processed:', JSON.stringify(finalMetadata, null, 2));
      return finalMetadata;

    } catch (error) {
      console.error('❌ [IMPORT] Import failed:', error);
      throw error;
    }
  }

  /**
   * Clear cache for organization
   */
  clearCache(organizationId?: string): void {
    if (organizationId) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(organizationId));
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

export const appStoreService = new AppStoreService();
