
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enhancedKeywordAnalyticsService, KeywordTrend, RankDistribution, KeywordAnalytics, UsageStats, KeywordPool } from '@/services/enhanced-keyword-analytics.service';

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
  const [lastSuccessfulLoad, setLastSuccessfulLoad] = useState<Date | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('30d');

  // Keyword trends query with enhanced error handling
  const {
    data: keywordTrends = [],
    isLoading: trendsLoading,
    error: trendsError,
    refetch: refetchTrends
  } = useQuery({
    queryKey: ['keyword-trends', organizationId, appId, selectedTimeframe],
    queryFn: async () => {
      if (!appId) return [];
      
      const daysBack = selectedTimeframe === '7d' ? 7 : selectedTimeframe === '90d' ? 90 : 30;
      const trends = await enhancedKeywordAnalyticsService.getKeywordTrends(
        organizationId,
        appId,
        daysBack
      );
      
      if (trends.length > 0) {
        setLastSuccessfulLoad(new Date());
      }
      
      return trends;
    },
    enabled: enabled && !!appId,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (failureCount >= 2) return false;
      if (error && typeof error === 'object' && 'code' in error) {
        return false;
      }
      return true;
    }
  });

  // Rank distribution query with enhanced error handling
  const {
    data: rankDistribution,
    isLoading: distributionLoading,
    error: distributionError,
    refetch: refetchRankDist
  } = useQuery({
    queryKey: ['rank-distribution', organizationId, appId],
    queryFn: async () => {
      if (!appId) return null;
      
      const distribution = await enhancedKeywordAnalyticsService.getRankDistribution(
        organizationId,
        appId
      );
      
      if (distribution) {
        setLastSuccessfulLoad(new Date());
      }
      
      return distribution;
    },
    enabled: enabled && !!appId,
    staleTime: 10 * 60 * 1000,
    retry: 2
  });

  // Collection jobs query
  const {
    data: collectionJobs = [],
    isLoading: jobsLoading,
    refetch: refetchJobs
  } = useQuery({
    queryKey: ['collection-jobs', organizationId],
    queryFn: () => enhancedKeywordAnalyticsService.getCollectionJobs(organizationId),
    enabled: enabled,
    staleTime: 30 * 1000,
    retry: 1
  });

  // Usage stats query
  const {
    data: usageStats = [],
    isLoading: usageLoading,
    refetch: refetchUsage
  } = useQuery({
    queryKey: ['usage-stats', organizationId],
    queryFn: () => enhancedKeywordAnalyticsService.getUsageStats(organizationId),
    enabled: enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // Keyword pools query
  const {
    data: keywordPools = [],
    isLoading: poolsLoading,
    refetch: refetchPools
  } = useQuery({
    queryKey: ['keyword-pools', organizationId],
    queryFn: () => enhancedKeywordAnalyticsService.getKeywordPools(organizationId),
    enabled: enabled,
    staleTime: 2 * 60 * 1000,
    retry: 1
  });

  // Calculate analytics from trends, distribution, and usage
  const analytics: KeywordAnalytics = enhancedKeywordAnalyticsService.calculateAnalytics(
    keywordTrends,
    rankDistribution,
    usageStats
  );

  // Create collection job function
  const createCollectionJob = async (jobType: 'full_refresh' | 'incremental' | 'competitor_analysis' = 'incremental') => {
    if (!appId) return null;
    
    console.log('🚀 [HOOK] Creating collection job:', jobType);
    const jobId = await enhancedKeywordAnalyticsService.createCollectionJob(
      organizationId,
      appId,
      jobType
    );
    
    if (jobId) {
      refetchJobs();
    }
    
    return jobId;
  };

  // Save keyword snapshots function
  const saveKeywordSnapshots = async (snapshots: Array<{
    keyword: string;
    rank_position: number;
    search_volume: number;
    difficulty_score: number;
    volume_trend: 'up' | 'down' | 'stable';
  }>) => {
    if (!appId) return { success: false, saved: 0 };
    
    return await enhancedKeywordAnalyticsService.saveKeywordSnapshots(
      organizationId,
      appId,
      snapshots
    );
  };

  // Save keyword pool function
  const saveKeywordPool = async (
    poolName: string,
    poolType: 'category' | 'competitor' | 'trending' | 'custom',
    keywords: string[],
    metadata: Record<string, any> = {}
  ) => {
    return await enhancedKeywordAnalyticsService.saveKeywordPool(
      organizationId,
      poolName,
      poolType,
      keywords,
      metadata
    );
  };

  // Combined loading state
  const isLoading = trendsLoading || distributionLoading || jobsLoading || usageLoading || poolsLoading;

  // Error state with graceful degradation
  const hasErrors = trendsError || distributionError;
  const errorMessage = trendsError?.message || distributionError?.message || null;

  return {
    // Data
    keywordTrends,
    rankDistribution,
    analytics,
    collectionJobs,
    usageStats,
    keywordPools,
    lastSuccessfulLoad,
    
    // Loading states
    isLoading,
    trendsLoading,
    distributionLoading,
    jobsLoading,
    isLoadingPools: poolsLoading,
    
    // Error states (non-blocking)
    hasErrors,
    errorMessage,
    trendsError,
    distributionError,
    
    // Timeframe selection
    selectedTimeframe,
    setSelectedTimeframe,
    
    // Actions
    createCollectionJob,
    saveKeywordSnapshots,
    saveKeywordPool,
    refetchTrends,
    refetchRankDist,
    refetchJobs,
    refetchPools,
    
    // Refresh all data
    refreshAll: async () => {
      await Promise.all([
        refetchTrends(),
        refetchRankDist(),
        refetchJobs(),
        refetchUsage(),
        refetchPools()
      ]);
    }
  };
};
