import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enhancedKeywordAnalyticsService, KeywordTrend, RankDistribution, KeywordAnalytics, UsageStats, KeywordPool } from '@/services/enhanced-keyword-analytics.service';
import { rankingDataValidatorService } from '@/services/ranking-data-validator.service';
import { toast } from 'sonner';

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
  const [dataIntegrityChecked, setDataIntegrityChecked] = useState<boolean>(false);

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

  // Rank distribution query with enhanced error handling and automatic retry
  const {
    data: rankDistribution,
    isLoading: distributionLoading,
    error: distributionError,
    refetch: refetchRankDist
  } = useQuery({
    queryKey: ['rank-distribution', organizationId, appId],
    queryFn: async () => {
      if (!appId) return null;
      
      try {
        const distribution = await enhancedKeywordAnalyticsService.getRankDistribution(
          organizationId,
          appId
        );
        
        if (distribution) {
          setLastSuccessfulLoad(new Date());
          
          // Check if we have meaningful data
          if (distribution.total_tracked === 0) {
            console.log('📊 [HOOK] Rank distribution shows no tracked keywords, data may need refresh');
            toast.info('No ranking data found. Creating sample data for visualization.');
          } else {
            console.log('✅ [HOOK] Rank distribution loaded with', distribution.total_tracked, 'keywords');
            setDataIntegrityChecked(true);
          }
        }
        
        return distribution;
      } catch (error) {
        console.error('❌ [HOOK] Error in rank distribution query:', error);
        toast.error('Failed to load ranking distribution data');
        throw error;
      }
    },
    enabled: enabled && !!appId,
    staleTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (failureCount >= 3) return false;
      console.log(`🔄 [HOOK] Retrying rank distribution query (attempt ${failureCount + 1})`);
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
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

  // Enhanced save keyword snapshots function with real keyword discovery
  const saveKeywordSnapshots = async (snapshots: Array<{
    keyword: string;
    rank_position: number;
    search_volume: number;
    difficulty_score: number;
    volume_trend: 'up' | 'down' | 'stable';
  }>) => {
    if (!appId) return { success: false, saved: 0 };
    
    try {
      // Validate data before saving
      const validationResult = rankingDataValidatorService.validateKeywordRankings(snapshots);
      
      if (!validationResult.isValid) {
        console.error('❌ [HOOK] Validation failed:', validationResult.errors);
        toast.error(`Data validation failed: ${validationResult.errors[0]}`);
        return { success: false, saved: 0 };
      }

      if (validationResult.warnings.length > 0) {
        console.warn('⚠️ [HOOK] Validation warnings:', validationResult.warnings);
        validationResult.warnings.forEach(warning => toast.warning(warning));
      }

      // Sanitize data
      const sanitizedSnapshots = rankingDataValidatorService.sanitizeKeywordRankings(snapshots);
      
      // Check data integrity
      const integrityResult = rankingDataValidatorService.checkDataIntegrity(
        organizationId,
        appId,
        sanitizedSnapshots
      );

      if (integrityResult.warnings.length > 0) {
        integrityResult.warnings.forEach(warning => toast.warning(warning));
      }

      // Save the data
      const result = await enhancedKeywordAnalyticsService.saveKeywordSnapshots(
        organizationId,
        appId,
        sanitizedSnapshots
      );

      if (result.success) {
        toast.success(`Successfully saved ${result.saved} keyword snapshots`);
        // Refresh data after successful save
        refetchRankDist();
        refetchTrends();
      } else {
        toast.error('Failed to save keyword snapshots');
      }

      return result;
    } catch (error) {
      console.error('❌ [HOOK] Exception saving snapshots:', error);
      toast.error('An error occurred while saving keyword snapshots');
      return { success: false, saved: 0 };
    }
  };

  // NEW: Discover real keywords from App Store
  const discoverRealKeywords = async (config?: {
    seedKeywords?: string[];
    competitorApps?: string[];
    maxKeywords?: number;
  }) => {
    if (!appId) return { success: false, discovered: 0, saved: 0 };

    try {
      console.log('🌱 [HOOK] Starting real keyword discovery for app:', appId);
      toast.info('Discovering keywords from App Store...');

      // Use the keyword discovery integration service
      const { keywordDiscoveryIntegrationService } = await import('@/services/keyword-discovery-integration.service');
      
      const result = await keywordDiscoveryIntegrationService.discoverAndSaveKeywords({
        organizationId,
        appId,
        seedKeywords: config?.seedKeywords,
        competitorApps: config?.competitorApps,
        maxKeywords: config?.maxKeywords || 100
      });

      if (result.success) {
        toast.success(`Discovered ${result.keywordsDiscovered} keywords, saved ${result.keywordsSaved} to database`);
        
        // Refresh all data after successful discovery
        refetchTrends();
        refetchRankDist();
        refetchJobs();
        
        return { 
          success: true, 
          discovered: result.keywordsDiscovered, 
          saved: result.keywordsSaved 
        };
      } else {
        toast.error('Failed to discover keywords from App Store');
        return { success: false, discovered: 0, saved: 0 };
      }

    } catch (error) {
      console.error('❌ [HOOK] Exception during keyword discovery:', error);
      toast.error('An error occurred during keyword discovery');
      return { success: false, discovered: 0, saved: 0 };
    }
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

  // Enhanced refresh function with better error handling
  const refreshAll = async () => {
    try {
      console.log('🔄 [HOOK] Refreshing all keyword analytics data');
      
      const results = await Promise.allSettled([
        refetchTrends(),
        refetchRankDist(),
        refetchJobs(),
        refetchUsage(),
        refetchPools()
      ]);

      const failures = results.filter(result => result.status === 'rejected');
      
      if (failures.length > 0) {
        console.warn('⚠️ [HOOK] Some refresh operations failed:', failures);
        toast.warning(`${failures.length} data sources failed to refresh`);
      } else {
        toast.success('All data refreshed successfully');
      }
    } catch (error) {
      console.error('❌ [HOOK] Exception during refresh:', error);
      toast.error('Failed to refresh data');
    }
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
    dataIntegrityChecked,
    
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
    discoverRealKeywords, // NEW: Real keyword discovery action
    refetchTrends,
    refetchRankDist,
    refetchJobs,
    refetchPools,
    refreshAll
  };
};
