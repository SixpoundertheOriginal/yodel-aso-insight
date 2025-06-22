
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enhancedKeywordAnalyticsService, RankDistribution, KeywordTrend, KeywordPool, CollectionJob, UsageStats } from '@/services/enhanced-keyword-analytics.service';
import { queryKeys } from '@/services/query-key.service';

interface UseEnhancedKeywordAnalyticsProps {
  organizationId: string;
  appId?: string;
  enabled?: boolean;
}

export const useEnhancedKeywordAnalytics = ({
  organizationId,
  appId,
  enabled = true
}: UseEnhancedKeywordAnalyticsProps) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<number>(30);

  // Rank Distribution Query
  const { data: rankDistribution, isLoading: isLoadingRankDist, refetch: refetchRankDist } = useQuery({
    queryKey: queryKeys.keywordIntelligence.rankDistribution?.(organizationId, appId) || 
              ['rank-distribution', organizationId, appId],
    queryFn: () => appId 
      ? enhancedKeywordAnalyticsService.getRankDistribution(organizationId, appId)
      : Promise.resolve(null),
    enabled: enabled && !!appId && !!organizationId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 2
  });

  // Keyword Trends Query
  const { data: keywordTrends = [], isLoading: isLoadingTrends, refetch: refetchTrends } = useQuery({
    queryKey: ['keyword-trends', organizationId, appId, selectedTimeframe],
    queryFn: () => appId 
      ? enhancedKeywordAnalyticsService.getKeywordTrends(organizationId, appId, selectedTimeframe)
      : Promise.resolve([]),
    enabled: enabled && !!appId && !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2
  });

  // Keyword Pools Query
  const { data: keywordPools = [], isLoading: isLoadingPools, refetch: refetchPools } = useQuery({
    queryKey: ['keyword-pools', organizationId],
    queryFn: () => enhancedKeywordAnalyticsService.getKeywordPools(organizationId),
    enabled: enabled && !!organizationId,
    staleTime: 1000 * 60 * 15, // 15 minutes
    retry: 2
  });

  // Collection Jobs Query
  const { data: collectionJobs = [], isLoading: isLoadingJobs, refetch: refetchJobs } = useQuery({
    queryKey: ['collection-jobs', organizationId],
    queryFn: () => enhancedKeywordAnalyticsService.getCollectionJobs(organizationId),
    enabled: enabled && !!organizationId,
    staleTime: 1000 * 60 * 2, // 2 minutes for real-time job status
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    retry: 2
  });

  // Usage Statistics Query
  const { data: usageStats = [], isLoading: isLoadingUsage, refetch: refetchUsage } = useQuery({
    queryKey: ['usage-stats', organizationId],
    queryFn: () => enhancedKeywordAnalyticsService.getUsageStats(organizationId),
    enabled: enabled && !!organizationId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 2
  });

  // Helper functions for analytics
  const saveKeywordSnapshots = async (keywords: Array<{
    keyword: string;
    rank_position?: number;
    search_volume?: number;
    difficulty_score?: number;
    volume_trend?: 'up' | 'down' | 'stable';
  }>) => {
    if (!appId) return { success: false, saved: 0 };
    
    console.log('💾 [HOOK] Saving keyword snapshots for app:', appId);
    const result = await enhancedKeywordAnalyticsService.saveKeywordSnapshots(
      organizationId, 
      appId, 
      keywords
    );
    
    if (result.success) {
      // Refresh related data
      refetchRankDist();
      refetchTrends();
      refetchUsage();
    }
    
    return result;
  };

  const createCollectionJob = async (
    jobType: 'full_refresh' | 'incremental' | 'competitor_analysis'
  ) => {
    if (!appId) return null;
    
    console.log('🚀 [HOOK] Creating collection job:', jobType);
    const job = await enhancedKeywordAnalyticsService.createCollectionJob(
      organizationId,
      appId,
      jobType
    );
    
    if (job) {
      refetchJobs(); // Refresh job list
    }
    
    return job;
  };

  const saveKeywordPool = async (
    poolName: string,
    poolType: 'category' | 'competitor' | 'trending' | 'custom',
    keywords: string[],
    metadata: Record<string, any> = {}
  ) => {
    console.log('💾 [HOOK] Saving keyword pool:', poolName);
    const pool = await enhancedKeywordAnalyticsService.saveKeywordPool(
      organizationId,
      poolName,
      poolType,
      keywords,
      metadata
    );
    
    if (pool) {
      refetchPools(); // Refresh pools list
    }
    
    return pool;
  };

  // Calculate analytics insights
  const analytics = {
    // Rank distribution insights
    rankingInsights: rankDistribution ? {
      topPerformers: rankDistribution.top_10,
      improvementOpportunities: rankDistribution.top_100 - rankDistribution.top_50,
      visibilityScore: rankDistribution.visibility_score,
      avgRank: rankDistribution.avg_rank
    } : null,

    // Trend insights
    trendInsights: {
      improvingKeywords: keywordTrends.filter(t => t.trend_direction === 'up').length,
      decliningKeywords: keywordTrends.filter(t => t.trend_direction === 'down').length,
      newKeywords: keywordTrends.filter(t => t.trend_direction === 'new').length,
      stableKeywords: keywordTrends.filter(t => t.trend_direction === 'stable').length
    },

    // Usage insights
    usageInsights: usageStats[0] ? {
      currentMonthKeywords: usageStats[0].keywords_processed,
      tierLimit: usageStats[0].tier_limit,
      utilizationRate: Math.round((usageStats[0].keywords_processed / usageStats[0].tier_limit) * 100),
      isOverage: usageStats[0].overage_keywords > 0
    } : null,

    // Job status insights
    jobInsights: {
      pendingJobs: collectionJobs.filter(j => j.status === 'pending').length,
      runningJobs: collectionJobs.filter(j => j.status === 'running').length,
      completedJobs: collectionJobs.filter(j => j.status === 'completed').length,
      failedJobs: collectionJobs.filter(j => j.status === 'failed').length
    }
  };

  return {
    // Data
    rankDistribution,
    keywordTrends,
    keywordPools,
    collectionJobs,
    usageStats,
    analytics,

    // Loading states
    isLoadingRankDist,
    isLoadingTrends,
    isLoadingPools,
    isLoadingJobs,
    isLoadingUsage,
    isLoading: isLoadingRankDist || isLoadingTrends || isLoadingPools || isLoadingJobs || isLoadingUsage,

    // Actions
    saveKeywordSnapshots,
    createCollectionJob,
    saveKeywordPool,
    
    // Refetch functions
    refetchRankDist,
    refetchTrends,
    refetchPools,
    refetchJobs,
    refetchUsage,
    
    // State management
    selectedTimeframe,
    setSelectedTimeframe
  };
};
