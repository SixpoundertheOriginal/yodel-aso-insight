
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enhancedKeywordAnalyticsService, KeywordTrend, RankDistribution, KeywordAnalytics } from '@/services/enhanced-keyword-analytics.service';

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

  // Keyword trends query with enhanced error handling
  const {
    data: keywordTrends = [],
    isLoading: trendsLoading,
    error: trendsError,
    refetch: refetchTrends
  } = useQuery({
    queryKey: ['keyword-trends', organizationId, appId],
    queryFn: async () => {
      if (!appId) return [];
      
      const trends = await enhancedKeywordAnalyticsService.getKeywordTrends(
        organizationId,
        appId,
        30
      );
      
      if (trends.length > 0) {
        setLastSuccessfulLoad(new Date());
      }
      
      return trends;
    },
    enabled: enabled && !!appId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Retry up to 2 times for network errors, but not for SQL errors
      if (failureCount >= 2) return false;
      if (error && typeof error === 'object' && 'code' in error) {
        // Don't retry SQL errors like ambiguous columns
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
    staleTime: 10 * 60 * 1000, // 10 minutes
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
    staleTime: 30 * 1000, // 30 seconds
    retry: 1
  });

  // Calculate analytics from trends and distribution
  const analytics: KeywordAnalytics = enhancedKeywordAnalyticsService.calculateAnalytics(
    keywordTrends,
    rankDistribution
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
      // Refresh jobs list after creating
      refetchJobs();
    }
    
    return jobId;
  };

  // Combined loading state
  const isLoading = trendsLoading || distributionLoading || jobsLoading;

  // Error state with graceful degradation
  const hasErrors = trendsError || distributionError;
  const errorMessage = trendsError?.message || distributionError?.message || null;

  return {
    // Data
    keywordTrends,
    rankDistribution,
    analytics,
    collectionJobs,
    lastSuccessfulLoad,
    
    // Loading states
    isLoading,
    trendsLoading,
    distributionLoading,
    jobsLoading,
    
    // Error states (non-blocking)
    hasErrors,
    errorMessage,
    trendsError,
    distributionError,
    
    // Actions
    createCollectionJob,
    refetchTrends,
    refetchRankDist,
    refetchJobs,
    
    // Refresh all data
    refreshAll: async () => {
      await Promise.all([
        refetchTrends(),
        refetchRankDist(),
        refetchJobs()
      ]);
    }
  };
};
