
export interface CacheOptions {
  ttl: number;
  tags: string[];
}

export interface CacheResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class CacheManagerService {
  constructor(private supabase: any) {}

  async get(searchTerm: string, organizationId: string): Promise<any | null> {
    try {
      const cacheKey = this.generateCacheKey(searchTerm, organizationId);
      
      const { data, error } = await this.supabase
        .from('scrape_cache')
        .select('data, expires_at')
        .eq('url', cacheKey)
        .eq('organization_id', organizationId)
        .eq('status', 'success')
        .single();

      if (error || !data) {
        return null;
      }

      // Check if cache has expired
      if (new Date(data.expires_at) < new Date()) {
        // Clean up expired cache entry
        await this.supabase
          .from('scrape_cache')
          .delete()
          .eq('url', cacheKey)
          .eq('organization_id', organizationId);
        
        return null;
      }

      return data.data;
    } catch (error) {
      console.warn('Cache retrieval failed:', error);
      return null;
    }
  }

  async set(searchTerm: string, organizationId: string, data: any, options: CacheOptions): Promise<CacheResult> {
    try {
      const cacheKey = this.generateCacheKey(searchTerm, organizationId);
      const expiresAt = new Date(Date.now() + options.ttl * 1000);

      const { error } = await this.supabase
        .from('scrape_cache')
        .upsert({
          url: cacheKey,
          organization_id: organizationId,
          data: data,
          status: 'success',
          expires_at: expiresAt.toISOString(),
          scraped_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Cache storage failed: ${error.message}`
      };
    }
  }

  async invalidate(organizationId: string, tags?: string[]): Promise<void> {
    try {
      let query = this.supabase
        .from('scrape_cache')
        .delete()
        .eq('organization_id', organizationId);

      // For now, we'll invalidate all cache for the organization
      // In a more advanced implementation, we could use tags for selective invalidation
      await query;
    } catch (error) {
      console.warn('Cache invalidation failed:', error);
    }
  }

  private generateCacheKey(searchTerm: string, organizationId: string): string {
    const normalizedTerm = searchTerm.toLowerCase().trim();
    return `app-store-scraper:${organizationId}:${normalizedTerm}`;
  }
}
