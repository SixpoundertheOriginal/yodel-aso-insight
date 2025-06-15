
export interface DiscoveryOptions {
  includeCompetitors: boolean;
  maxCompetitors: number;
  country: string;
}

export interface DiscoveryResult {
  success: boolean;
  data?: {
    targetApp: any;
    competitors: any[];
    category: string;
    searchContext: string;
  };
  error?: string;
}

export class DiscoveryService {
  constructor(private supabase: any) {}

  async discover(searchTerm: string, options: DiscoveryOptions): Promise<DiscoveryResult> {
    try {
      const isUrl = this.isAppStoreUrl(searchTerm);
      
      if (isUrl) {
        return await this.discoverFromUrl(searchTerm, options);
      } else {
        return await this.discoverFromSearch(searchTerm, options);
      }
    } catch (error) {
      return {
        success: false,
        error: `Discovery failed: ${error.message}`
      };
    }
  }

  private async discoverFromUrl(url: string, options: DiscoveryOptions): Promise<DiscoveryResult> {
    const appId = this.extractAppIdFromUrl(url);
    if (!appId) {
      return { success: false, error: 'Invalid App Store URL' };
    }

    // Get target app
    const lookupUrl = `https://itunes.apple.com/lookup?id=${appId}`;
    const response = await fetch(lookupUrl);
    
    if (!response.ok) {
      return { success: false, error: 'Failed to fetch app data from iTunes API' };
    }

    const result = await response.json();
    if (result.resultCount === 0) {
      return { success: false, error: 'App not found' };
    }

    const targetApp = result.results[0];
    let competitors: any[] = [];

    // Find competitors if requested
    if (options.includeCompetitors) {
      competitors = await this.findCompetitors(targetApp.primaryGenreName, options.country, options.maxCompetitors);
      // Remove target app from competitors
      competitors = competitors.filter(c => c.trackId !== targetApp.trackId);
    }

    return {
      success: true,
      data: {
        targetApp,
        competitors,
        category: targetApp.primaryGenreName,
        searchContext: 'url-based'
      }
    };
  }

  private async discoverFromSearch(searchTerm: string, options: DiscoveryOptions): Promise<DiscoveryResult> {
    const countryMatch = searchTerm.match(/in\s+([a-zA-Z]{2})$/);
    const country = countryMatch ? countryMatch[1].toLowerCase() : options.country;
    const cleanedTerm = searchTerm.replace(/in\s+([a-zA-Z]{2})$/, '').trim();
    
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanedTerm)}&country=${country}&entity=software&limit=${options.maxCompetitors + 1}`;
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      return { success: false, error: 'iTunes search API unavailable' };
    }

    const result = await response.json();
    if (result.resultCount === 0) {
      return { success: false, error: `No apps found for "${cleanedTerm}"` };
    }

    const [targetApp, ...competitors] = result.results;

    return {
      success: true,
      data: {
        targetApp,
        competitors: competitors.slice(0, options.maxCompetitors),
        category: targetApp.primaryGenreName,
        searchContext: 'search-based'
      }
    };
  }

  private async findCompetitors(category: string, country: string, maxResults: number): Promise<any[]> {
    try {
      const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(category)}&country=${country}&entity=software&limit=${maxResults}`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) return [];
      
      const result = await response.json();
      return result.results || [];
    } catch (error) {
      console.warn('Failed to find competitors:', error);
      return [];
    }
  }

  private isAppStoreUrl(str: string): boolean {
    try {
      const url = new URL(str);
      return url.hostname === 'apps.apple.com';
    } catch {
      return false;
    }
  }

  private extractAppIdFromUrl(url: string): string | null {
    const match = url.match(/\/id(\d+)/);
    return match ? match[1] : null;
  }
}
