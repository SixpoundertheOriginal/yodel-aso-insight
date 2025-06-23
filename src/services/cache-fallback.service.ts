
/**
 * Cache Fallback Service
 * Provides cached results when primary search methods fail
 */

import { ScrapedMetadata } from '@/types/aso';

export interface CachedSearchResult {
  searchTerm: string;
  result: ScrapedMetadata;
  timestamp: number;
  organizationId: string;
  searchType: 'keyword' | 'brand' | 'url';
  ttl: number;
}

export interface CacheStats {
  totalCached: number;
  hitRate: number;
  oldestEntry: number;
  newestEntry: number;
}

class CacheFallbackService {
  private cache = new Map<string, CachedSearchResult>();
  private maxCacheSize = 1000;
  private defaultTtl = 24 * 60 * 60 * 1000; // 24 hours
  private hitCount = 0;
  private missCount = 0;

  /**
   * Store successful search result in cache
   */
  store(
    searchTerm: string, 
    result: ScrapedMetadata, 
    organizationId: string, 
    searchType: 'keyword' | 'brand' | 'url' = 'keyword'
  ): void {
    const cacheKey = this.generateCacheKey(searchTerm, organizationId);
    
    const cachedResult: CachedSearchResult = {
      searchTerm,
      result,
      timestamp: Date.now(),
      organizationId,
      searchType,
      ttl: this.defaultTtl
    };

    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    this.cache.set(cacheKey, cachedResult);
    
    console.log(`💾 [CACHE-FALLBACK] Cached result for "${searchTerm}" (${this.cache.size}/${this.maxCacheSize})`);
  }

  /**
   * Retrieve cached result if available and not expired
   */
  retrieve(searchTerm: string, organizationId: string): ScrapedMetadata | null {
    const cacheKey = this.generateCacheKey(searchTerm, organizationId);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      this.missCount++;
      console.log(`❌ [CACHE-FALLBACK] Cache miss for "${searchTerm}"`);
      return null;
    }

    // Check if cached result is expired
    const age = Date.now() - cached.timestamp;
    if (age > cached.ttl) {
      this.cache.delete(cacheKey);
      this.missCount++;
      console.log(`⏰ [CACHE-FALLBACK] Expired cache entry removed for "${searchTerm}"`);
      return null;
    }

    this.hitCount++;
    console.log(`✅ [CACHE-FALLBACK] Cache hit for "${searchTerm}" (age: ${Math.round(age / 1000)}s)`);
    
    return cached.result;
  }

  /**
   * Get similar cached results for fuzzy matching
   */
  findSimilarResults(searchTerm: string, organizationId: string, maxResults: number = 3): ScrapedMetadata[] {
    const normalizedSearch = searchTerm.toLowerCase().trim();
    const similarResults: Array<{ result: ScrapedMetadata; similarity: number }> = [];

    for (const [key, cached] of this.cache.entries()) {
      if (cached.organizationId !== organizationId) continue;
      
      const age = Date.now() - cached.timestamp;
      if (age > cached.ttl) {
        this.cache.delete(key);
        continue;
      }

      const similarity = this.calculateSimilarity(normalizedSearch, cached.searchTerm.toLowerCase());
      if (similarity > 0.6) { // 60% similarity threshold
        similarResults.push({ result: cached.result, similarity });
      }
    }

    // Sort by similarity and return top results
    const topResults = similarResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults)
      .map(item => item.result);

    if (topResults.length > 0) {
      console.log(`🔍 [CACHE-FALLBACK] Found ${topResults.length} similar cached results for "${searchTerm}"`);
    }

    return topResults;
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Generate cache key for search term and organization
   */
  private generateCacheKey(searchTerm: string, organizationId: string): string {
    const normalized = searchTerm.toLowerCase().trim().replace(/\s+/g, ' ');
    return `${organizationId}:${normalized}`;
  }

  /**
   * Evict oldest cache entries
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, cached] of this.cache.entries()) {
      if (cached.timestamp < oldestTime) {
        oldestTime = cached.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ [CACHE-FALLBACK] Evicted oldest cache entry`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    // Remove expired entries
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }

    const timestamps = entries.map(e => e.timestamp);
    const totalRequests = this.hitCount + this.missCount;

    return {
      totalCached: this.cache.size,
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0
    };
  }

  /**
   * Clear expired entries
   */
  cleanup(): number {
    const sizeBefore = this.cache.size;
    const now = Date.now();

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }

    const removed = sizeBefore - this.cache.size;
    if (removed > 0) {
      console.log(`🧹 [CACHE-FALLBACK] Cleaned up ${removed} expired entries`);
    }

    return removed;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    console.log(`🗑️ [CACHE-FALLBACK] Cache cleared`);
  }
}

export const cacheFallbackService = new CacheFallbackService();
