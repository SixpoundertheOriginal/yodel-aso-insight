
import { supabase } from '@/integrations/supabase/client';

interface AppStoreSearchResult {
  name: string;
  appId: string;
  title: string;
  subtitle?: string;
  description?: string;
  url: string;
  icon?: string;
  rating?: number;
  reviews?: number;
  developer?: string;
  applicationCategory?: string;
  locale: string;
}

interface SearchResponse {
  success: boolean;
  data?: AppStoreSearchResult;
  error?: string;
}

export class AppStoreIntegrationService {
  static async searchApp(searchTerm: string, organizationId: string): Promise<SearchResponse> {
    try {
      console.log('🔍 [APPSTORE-INTEGRATION] Searching for:', searchTerm);
      
      const { data, error } = await supabase.functions.invoke('app-store-scraper', {
        body: {
          searchTerm: searchTerm.trim(),
          searchType: 'keyword',
          organizationId,
          includeCompetitorAnalysis: false,
          searchParameters: {
            country: 'us',
            limit: 5
          }
        }
      });

      if (error) {
        console.error('❌ [APPSTORE-INTEGRATION] Error calling scraper:', error);
        return { success: false, error: error.message || 'Failed to search App Store' };
      }

      if (!data || !data.success) {
        console.error('❌ [APPSTORE-INTEGRATION] Scraper returned error:', data);
        return { success: false, error: data?.error || 'No results found' };
      }

      console.log('✅ [APPSTORE-INTEGRATION] Search successful:', data.data);
      
      // Transform the response to match our interface
      const appData = data.data;
      const result: AppStoreSearchResult = {
        name: appData.name || searchTerm,
        appId: appData.appId || '',
        title: appData.title || appData.name || searchTerm,
        subtitle: appData.subtitle || '',
        description: appData.description || '',
        url: appData.url || '',
        icon: appData.icon || '',
        rating: appData.rating || 0,
        reviews: appData.reviews || 0,
        developer: appData.developer || '',
        applicationCategory: appData.applicationCategory || '',
        locale: appData.locale || 'en-US'
      };

      return { success: true, data: result };
    } catch (error: any) {
      console.error('💥 [APPSTORE-INTEGRATION] Exception:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to connect to App Store service' 
      };
    }
  }

  static async validateAppStoreId(appStoreId: string, platform: 'iOS' | 'Android', organizationId: string): Promise<SearchResponse> {
    try {
      console.log('🔍 [APPSTORE-INTEGRATION] Validating App Store ID:', appStoreId);
      
      // For iOS, search by app store URL
      const searchUrl = platform === 'iOS' 
        ? `https://apps.apple.com/app/id${appStoreId}`
        : `https://play.google.com/store/apps/details?id=${appStoreId}`;

      return await this.searchApp(searchUrl, organizationId);
    } catch (error: any) {
      console.error('💥 [APPSTORE-INTEGRATION] Exception validating ID:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to validate App Store ID' 
      };
    }
  }
}
