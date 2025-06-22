
export const queryKeys = {
  keywordIntelligence: {
    // App-specific queries using consistent app ID format
    selectedApp: (appId: string, organizationId: string) => ['selected-app', appId, organizationId],
    gapAnalysis: (organizationId: string, appId: string) => ['keyword-gap-analysis', organizationId, appId],
    volumeTrends: (organizationId: string, keyword: string) => ['keyword-volume-trends', organizationId, keyword],
    
    // Organization-level queries
    clusters: (organizationId: string, appId?: string) => appId 
      ? ['keyword-clusters', organizationId, appId] 
      : ['keyword-clusters', organizationId],
    
    // Helper methods for cache management
    allForApp: (organizationId: string, appId: string) => [
      ['selected-app', appId, organizationId],
      ['keyword-gap-analysis', organizationId, appId],
      ['keyword-clusters', organizationId, appId]
    ],
    
    allForOrganization: (organizationId: string) => [
      ['keyword-clusters', organizationId],
      ['keyword-volume-trends', organizationId]
    ]
  },
  
  apps: {
    userApps: (organizationId: string) => ['user-apps', organizationId],
    appDetails: (appId: string) => ['app-details', appId]
  },
  
  analytics: {
    rankDistribution: (organizationId: string, appId: string) => ['rank-distribution', organizationId, appId],
    keywordTrends: (organizationId: string, appId: string) => ['keyword-trends', organizationId, appId],
    collectionJobs: (organizationId: string) => ['collection-jobs', organizationId],
    usageStats: (organizationId: string) => ['usage-stats', organizationId],
    keywordPools: (organizationId: string) => ['keyword-pools', organizationId]
  }
};
