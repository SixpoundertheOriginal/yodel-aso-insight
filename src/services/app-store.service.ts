import { supabase } from '@/integrations/supabase/client';
import { ScrapedMetadata, ValidationResult, ImportConfig } from '@/types/aso';
import { securityService } from './security.service';

interface AppStoreApiRequest {
  searchTerm: string;
  organizationId: string;
  includeCompetitorAnalysis?: boolean;
  securityContext?: {
    country?: string;
    userAgent?: string;
    ipAddress?: string;
  };
}

interface AppStoreApiResponse {
  success: boolean;
  data?: ScrapedMetadata;
  error?: string;
  requestId?: string;
  processingTime?: string;
}

class AppStoreService {
  private readonly functionUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/app-store-scraper';

  /**
   * Import app data from App Store URL or app name
   */
  async importAppData(input: string, config: ImportConfig): Promise<ScrapedMetadata> {
    console.log('🚀 [APP-STORE-SERVICE] Starting import for:', input);

    try {
      // Validate and sanitize input
      const searchTerm = this.normalizeSearchInput(input);
      const securityValidation = securityService.validateAppStoreUrl(searchTerm);
      
      if (!securityValidation.success) {
        throw new Error(`Invalid input: ${securityValidation.errors?.[0]?.message || 'Unknown validation error'}`);
      }

      // Check rate limits before making request
      const rateLimitCheck = await securityService.checkRateLimit(config.organizationId, 'app_store_import');
      if (!rateLimitCheck.success) {
        throw new Error(`Rate limit exceeded: ${rateLimitCheck.errors?.[0]?.message || 'Too many requests'}`);
      }

      // Prepare request payload with correct contract
      const requestPayload: AppStoreApiRequest = {
        searchTerm: securityValidation.data || searchTerm,
        organizationId: config.organizationId,
        includeCompetitorAnalysis: true,
        securityContext: {
          country: 'us',
          userAgent: navigator.userAgent,
          ipAddress: 'client-side' // Will be detected server-side
        }
      };

      console.log('📡 [APP-STORE-SERVICE] Calling edge function with payload:', requestPayload);

      // Make the API call
      const { data, error } = await supabase.functions.invoke('app-store-scraper', {
        body: requestPayload,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (error) {
        console.error('❌ [APP-STORE-SERVICE] Supabase function invocation error:', error);
        throw new Error(`The import service is currently unavailable. Please try again later. (Details: ${error.message})`);
      }

      // Handle the response
      const response = data as AppStoreApiResponse;
      
      if (!response.success || !response.data) {
        console.error('❌ [APP-STORE-SERVICE] API returned error:', response.error);
        throw new Error(response.error || 'Failed to import app data from the store');
      }

      // Validate the response data
      const validationResult = this.validateScrapedData(response.data);
      if (!validationResult.isValid) {
        console.warn('⚠️ [APP-STORE-SERVICE] Data validation issues:', validationResult.issues);
        // Use sanitized data but log warnings
        return validationResult.sanitized;
      }

      console.log('✅ [APP-STORE-SERVICE] Successfully imported app data:', response.data.name);
      
      // Log successful import for audit
      await securityService.logAuditEntry({
        organizationId: config.organizationId,
        userId: (await supabase.auth.getUser()).data.user?.id || null,
        action: 'app_store_import_success',
        resourceType: 'app-store-import',
        resourceId: response.data.appId,
        details: {
          appName: response.data.name,
          searchTerm: requestPayload.searchTerm,
          processingTime: response.processingTime
        },
        ipAddress: null,
        userAgent: navigator.userAgent
      });

      return response.data;

    } catch (error: any) {
      console.error('❌ [APP-STORE-SERVICE] Import failed:', error);
      
      // Log failed import for monitoring
      try {
        await securityService.logAuditEntry({
          organizationId: config.organizationId,
          userId: (await supabase.auth.getUser()).data.user?.id || null,
          action: 'app_store_import_failed',
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
        console.warn('⚠️ [APP-STORE-SERVICE] Failed to log audit entry:', auditError);
      }

      // Re-throw with user-friendly message
      throw new Error(error.message || 'An unexpected error occurred during import');
    }
  }

  /**
   * Normalize search input to handle both URLs and app names
   */
  private normalizeSearchInput(input: string): string {
    const trimmed = input.trim();
    
    // If it's already a URL, return as-is
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    
    // If it looks like an app store URL without protocol
    if (trimmed.includes('apps.apple.com')) {
      return `https://${trimmed}`;
    }
    
    // Otherwise, treat as app name/search term
    return trimmed;
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

  /**
   * Categorize errors for better monitoring and user feedback
   */
  private categorizeError(error: any): string {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('rate limit') || message.includes('429')) {
      return 'rate_limit';
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return 'not_found';
    }
    
    if (message.includes('unauthorized') || message.includes('403')) {
      return 'unauthorized';
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    
    return 'unknown';
  }
}

export const appStoreService = new AppStoreService();
