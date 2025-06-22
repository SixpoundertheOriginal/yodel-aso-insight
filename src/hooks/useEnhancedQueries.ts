
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/services/query-key.service';
import { competitorKeywordAnalysisService } from '@/services/competitor-keyword-analysis.service';
import { supabase } from '@/integrations/supabase/client';

interface UseEnhancedQueriesProps {
  organizationId: string;
  appId: string | null;
  enabled?: boolean;
}

export const useEnhancedQueries = ({
  organizationId,
  appId,
  enabled = true
}: UseEnhancedQueriesProps) => {
  const queryClient = useQueryClient();

  // Selected app query with proper error handling
  const selectedAppQuery = useQuery({
    queryKey: appId ? queryKeys.keywordIntelligence.selectedApp(appId, organizationId) : ['no-app'],
    queryFn: async () => {
      if (!appId) return null;

      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', appId)
        .single();

      if (error) {
        console.error('❌ [ENHANCED-QUERIES] App fetch error:', error);
        throw error;
      }

      console.log('🔍 [ENHANCED-QUERIES] Selected app loaded:', data?.app_name);
      return data;
    },
    enabled: !!appId && !!organizationId && enabled,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Gap analysis query with optimized fetching
  const gapAnalysisQuery = useQuery({
    queryKey: appId ? queryKeys.keywordIntelligence.gapAnalysis(organizationId, appId) : ['no-gaps'],
    queryFn: async () => {
      if (!appId) return [];
      
      try {
        console.log('🔍 [ENHANCED-QUERIES] Fetching gap analysis for app:', selectedAppQuery.data?.app_name || appId);
        const data = await competitorKeywordAnalysisService.getKeywordGapAnalysis(organizationId, appId);
        console.log('✅ [ENHANCED-QUERIES] Gap analysis data:', data.length);
        return data;
      } catch (error) {
        console.error('❌ [ENHANCED-QUERIES] Gap analysis failed:', error);
        return []; // Return empty array instead of throwing
      }
    },
    enabled: enabled && !!appId && !!organizationId && !!selectedAppQuery.data,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Clusters query with app-specific optimization
  const clustersQuery = useQuery({
    queryKey: queryKeys.keywordIntelligence.clusters(organizationId, appId || undefined),
    queryFn: async () => {
      try {
        console.log('🔍 [ENHANCED-QUERIES] Fetching clusters');
        const data = await competitorKeywordAnalysisService.getKeywordClusters(organizationId);
        console.log('✅ [ENHANCED-QUERIES] Clusters data:', data.length);
        return data;
      } catch (error) {
        console.error('❌ [ENHANCED-QUERIES] Clusters failed:', error);
        return []; // Return empty array instead of throwing
      }
    },
    enabled: enabled && !!organizationId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Invalidation helpers
  const invalidateAppData = (targetAppId: string) => {
    const queries = queryKeys.keywordIntelligence.allForApp(organizationId, targetAppId);
    queries.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey });
    });
  };

  const invalidateAllData = () => {
    const queries = queryKeys.keywordIntelligence.allForOrganization(organizationId);
    queries.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey: queryKey as any });
    });
  };

  // Prefetch next app data for better UX
  const prefetchAppData = (targetAppId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.keywordIntelligence.selectedApp(targetAppId, organizationId),
      queryFn: async () => {
        const { data } = await supabase
          .from('apps')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('id', targetAppId)
          .single();
        return data;
      },
      staleTime: 1000 * 60 * 5,
    });
  };

  return {
    selectedApp: selectedAppQuery.data,
    gapAnalysis: gapAnalysisQuery.data || [],
    clusters: clustersQuery.data || [],
    
    // Loading states
    isLoadingApp: selectedAppQuery.isLoading,
    isLoadingGaps: gapAnalysisQuery.isLoading,
    isLoadingClusters: clustersQuery.isLoading,
    isLoading: selectedAppQuery.isLoading || gapAnalysisQuery.isLoading || clustersQuery.isLoading,
    
    // Error states
    appError: selectedAppQuery.error,
    gapError: gapAnalysisQuery.error,
    clusterError: clustersQuery.error,
    hasErrors: !!selectedAppQuery.error || !!gapAnalysisQuery.error || !!clustersQuery.error,
    
    // Refetch functions
    refetchApp: selectedAppQuery.refetch,
    refetchGaps: gapAnalysisQuery.refetch,
    refetchClusters: clustersQuery.refetch,
    
    // Cache management
    invalidateAppData,
    invalidateAllData,
    prefetchAppData,
  };
};
