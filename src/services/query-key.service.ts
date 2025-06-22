
/**
 * Centralized query key management for consistent React Query operations
 */
export class QueryKeyService {
  
  /**
   * Generate standardized query keys for keyword intelligence
   */
  static keywordIntelligence = {
    gapAnalysis: (organizationId: string, appId: string) => 
      ['keyword-gap-analysis', organizationId, appId] as const,
    
    clusters: (organizationId: string, appId?: string) => 
      appId 
        ? ['keyword-clusters', organizationId, appId] as const
        : ['keyword-clusters', organizationId] as const,
    
    volumeTrends: (organizationId: string, keyword?: string) =>
      keyword 
        ? ['keyword-volume-trends', organizationId, keyword] as const
        : ['keyword-volume-trends', organizationId] as const,
    
    selectedApp: (appId: string, organizationId: string) =>
      ['selected-app', appId, organizationId] as const,

    // Enhanced analytics keys
    rankDistribution: (organizationId: string, appId?: string) =>
      appId 
        ? ['rank-distribution', organizationId, appId] as const
        : ['rank-distribution', organizationId] as const,

    keywordTrends: (organizationId: string, appId: string, timeframe: number) =>
      ['keyword-trends', organizationId, appId, timeframe] as const,

    keywordPools: (organizationId: string, poolType?: string) =>
      poolType
        ? ['keyword-pools', organizationId, poolType] as const
        : ['keyword-pools', organizationId] as const,

    collectionJobs: (organizationId: string, status?: string) =>
      status
        ? ['collection-jobs', organizationId, status] as const
        : ['collection-jobs', organizationId] as const,

    usageStats: (organizationId: string) =>
      ['usage-stats', organizationId] as const,

    keywordHistory: (organizationId: string, appId: string, keyword: string) =>
      ['keyword-history', organizationId, appId, keyword] as const,
    
    // Wildcard patterns for invalidation
    allForApp: (organizationId: string, appId: string) => [
      ['keyword-gap-analysis', organizationId, appId],
      ['keyword-clusters', organizationId, appId],
      ['selected-app', appId, organizationId],
      ['rank-distribution', organizationId, appId],
      ['keyword-trends', organizationId, appId],
      ['keyword-history', organizationId, appId]
    ] as const,
    
    allForOrganization: (organizationId: string) => [
      ['keyword-gap-analysis', organizationId],
      ['keyword-clusters', organizationId],
      ['keyword-volume-trends', organizationId],
      ['rank-distribution', organizationId],
      ['keyword-pools', organizationId],
      ['collection-jobs', organizationId],
      ['usage-stats', organizationId]
    ] as const
  };

  /**
   * Generate cache keys for keyword data caching
   */
  static cache = {
    keywordData: (organizationId: string, appId: string) =>
      `keyword-data:${organizationId}:${appId}`,
    
    appMetadata: (organizationId: string, appId: string) =>
      `app-metadata:${organizationId}:${appId}`,

    rankDistribution: (organizationId: string, appId: string) =>
      `rank-dist:${organizationId}:${appId}`,

    keywordPool: (organizationId: string, poolName: string) =>
      `pool:${organizationId}:${poolName}`
  };

  /**
   * Validate query key consistency
   */
  static validateKey(key: readonly unknown[]): boolean {
    return Array.isArray(key) && key.length >= 2 && typeof key[0] === 'string';
  }
}

export const queryKeys = QueryKeyService;
