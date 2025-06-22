
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  organizationId: string;
  hits: number;
}

interface CacheStats {
  totalEntries: number;
  hitRate: number;
  organizationEntries: Record<string, number>;
  memoryUsage: number;
}

export interface CacheConfig {
  defaultTtl: number;
  maxEntries: number;
  enableStats: boolean;
  organizationIsolation: boolean;
}

class KeywordCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private hitCount = 0;
  private missCount = 0;
  private readonly config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTtl: 3600000, // 1 hour
      maxEntries: 1000,
      enableStats: true,
      organizationIsolation: true,
      ...config
    };

    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 300000);
  }

  /**
   * Generate cache key with organization isolation
   */
  private generateKey(key: string, organizationId: string): string {
    return this.config.organizationIsolation ? `${organizationId}:${key}` : key;
  }

  /**
   * Get cached data with organization isolation
   */
  get<T>(key: string, organizationId: string): T | null {
    const cacheKey = this.generateKey(key, organizationId);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(cacheKey);
      this.missCount++;
      return null;
    }

    // Check organization isolation
    if (this.config.organizationIsolation && entry.organizationId !== organizationId) {
      this.missCount++;
      return null;
    }

    entry.hits++;
    this.hitCount++;
    return entry.data;
  }

  /**
   * Set cached data with TTL and organization isolation
   */
  set<T>(key: string, data: T, organizationId: string, ttl?: number): void {
    const cacheKey = this.generateKey(key, organizationId);
    
    // Enforce cache size limit
    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldestEntries();
    }

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTtl,
      organizationId,
      hits: 0
    });
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string, organizationId: string): boolean {
    const cacheKey = this.generateKey(key, organizationId);
    return this.cache.delete(cacheKey);
  }

  /**
   * Clear all cache entries for an organization
   */
  clearOrganization(organizationId: string): number {
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.organizationId === organizationId) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 [KEYWORD-CACHE] Cleaned up ${deletedCount} expired entries`);
    }
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldestEntries(): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    const toEvict = Math.ceil(this.config.maxEntries * 0.1); // Evict 10%
    
    for (let i = 0; i < toEvict && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }
    
    console.log(`♻️ [KEYWORD-CACHE] Evicted ${toEvict} oldest entries`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;
    
    const organizationEntries: Record<string, number> = {};
    for (const [, entry] of this.cache.entries()) {
      organizationEntries[entry.organizationId] = (organizationEntries[entry.organizationId] || 0) + 1;
    }

    return {
      totalEntries: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      organizationEntries,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage in KB
   */
  private estimateMemoryUsage(): number {
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // String chars are 2 bytes
      size += JSON.stringify(entry.data).length * 2;
      size += 64; // Estimated overhead per entry
    }
    return Math.round(size / 1024); // Convert to KB
  }
}

export const keywordCacheService = new KeywordCacheService({
  defaultTtl: 1800000, // 30 minutes for keyword rankings
  maxEntries: 500,
  enableStats: true,
  organizationIsolation: true
});
