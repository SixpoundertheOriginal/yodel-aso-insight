
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

  // Selected app query with proper error handling and app store ID resolution
  const selectedAppQuery = useQuery({
    queryKey: appId ? queryKeys.keywordIntelligence.selectedApp(appId, organizationId) : ['no-app'],
    queryFn: async () => {
      if (!appId) return null;

      console.log('🔍 [ENHANCED-QUERIES] Looking up app:', appId);

      // First try to find by UUID (internal app ID)
      let { data: appByUuid, error: uuidError } = await supabase
        .from('apps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', appId)
        .maybeSingle();

      if (appByUuid && !uuidError) {
        console.log('✅ [ENHANCED-QUERIES] Found app by UUID:', appByUuid.app_name);
        return appByUuid;
      }

      // If not found by UUID, try by app_store_id (external App Store ID)
      let { data: appByStoreId, error: storeIdError } = await supabase
        .from('apps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('app_store_id', appId)
        .maybeSingle();

      if (appByStoreId && !storeIdError) {
        console.log('✅ [ENHANCED-QUERIES] Found app by App Store ID:', appByStoreId.app_name);
        return appByStoreId;
      }

      // Log the specific errors for debugging
      console.error('❌ [ENHANCED-QUERIES] App lookup failed:', {
        appId,
        uuidError: uuidError?.message,
        storeIdError: storeIdError?.message,
        organizationId
      });

      // Check if there are any apps in the organization for debugging
      const { data: allApps } = await supabase
        .from('apps')
        .select('id, app_store_id, app_name')
        .eq('organization_id', organizationId)
        .limit(5);

      console.log('🔍 [ENHANCED-QUERIES] Available apps in org:', allApps);

      throw new Error(`App not found: ${appId}. Check if the app exists in organization ${organizationId}`);
    },
    enabled: !!appId && !!organizationId && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes - shorter for better updates
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry if it's a "not found" error
      if (error?.message?.includes('App not found')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Gap analysis query with improved app ID handling
  const gapAnalysisQuery = useQuery({
    queryKey: appId ? queryKeys.keywordIntelligence.gapAnalysis(organizationId, appId) : ['no-gaps'],
    queryFn: async () => {
      if (!appId || !selectedAppQuery.data) return [];
      
      try {
        console.log('🔍 [ENHANCED-QUERIES] Fetching gap analysis for app:', selectedAppQuery.data.app_name);
        
        // Use the correct app ID (UUID) for gap analysis
        const targetAppId = selectedAppQuery.data.id;
        const data = await competitorKeywordAnalysisService.getKeywordGapAnalysis(organizationId, targetAppId);
        
        console.log('✅ [ENHANCED-QUERIES] Gap analysis data:', data.length);
        return data;
      } catch (error) {
        console.error('❌ [ENHANCED-QUERIES] Gap analysis failed:', error);
        return []; // Return empty array instead of throwing
      }
    },
    enabled: enabled && !!appId && !!organizationId && !!selectedAppQuery.data && !selectedAppQuery.isLoading,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Clusters query - organization level, not app specific
  const clustersQuery = useQuery({
    queryKey: queryKeys.keywordIntelligence.clusters(organizationId, undefined),
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
    staleTime: 1000 * 60 * 15, // 15 minutes - clusters change less frequently
    gcTime: 1000 * 60 * 20, // 20 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Invalidation helpers with correct app ID handling
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

  // Prefetch app data with improved lookup
  const prefetchAppData = (targetAppId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.keywordIntelligence.selectedApp(targetAppId, organizationId),
      queryFn: async () => {
        // Try UUID first, then app_store_id
        let { data } = await supabase
          .from('apps')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('id', targetAppId)
          .maybeSingle();

        if (!data) {
          const result = await supabase
            .from('apps')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('app_store_id', targetAppId)
            .maybeSingle();
          data = result.data;
        }

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
    
    // Error states with better error info
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
