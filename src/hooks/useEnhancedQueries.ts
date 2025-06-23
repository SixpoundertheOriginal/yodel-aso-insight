import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/services/query-key.service';
import { competitorKeywordAnalysisService } from '@/services/competitor-keyword-analysis.service';
import { supabase } from '@/integrations/supabase/client';

interface UseEnhancedQueriesProps {
  organizationId: string;
  appId: string | null;
  enabled?: boolean;
}

// Utility function to detect if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Utility function to detect if a string is an iTunes App Store ID
const isValidAppStoreId = (str: string): boolean => {
  return /^\d+$/.test(str) && str.length >= 6 && str.length <= 12;
};

export const useEnhancedQueries = ({
  organizationId,
  appId,
  enabled = true
}: UseEnhancedQueriesProps) => {
  const queryClient = useQueryClient();

  // Enhanced app lookup with proper ID format handling
  const selectedAppQuery = useQuery({
    queryKey: appId ? queryKeys.keywordIntelligence.selectedApp(appId, organizationId) : ['no-app'],
    queryFn: async () => {
      if (!appId) return null;

      console.log('🔍 [ENHANCED-QUERIES] Looking up app with improved ID handling:', appId);

      // Determine the ID format and search strategy
      const isUUID = isValidUUID(appId);
      const isAppStoreId = isValidAppStoreId(appId);

      console.log('🔍 [ENHANCED-QUERIES] ID format detection:', {
        appId,
        isUUID,
        isAppStoreId,
        length: appId.length
      });

      let appData = null;
      let searchMethod = 'unknown';

      // Strategy 1: If it's a valid UUID, search by internal ID first
      if (isUUID) {
        console.log('✅ [ENHANCED-QUERIES] Searching by UUID (internal ID)');
        const { data: appByUuid, error: uuidError } = await supabase
          .from('apps')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('id', appId)
          .maybeSingle();

        if (appByUuid && !uuidError) {
          appData = appByUuid;
          searchMethod = 'uuid';
          console.log('✅ [ENHANCED-QUERIES] Found app by UUID:', appByUuid.app_name);
        } else if (uuidError) {
          console.warn('⚠️ [ENHANCED-QUERIES] UUID search error:', uuidError.message);
        }
      }

      // Strategy 2: If not found by UUID or it's an App Store ID, search by app_store_id
      if (!appData && (isAppStoreId || !isUUID)) {
        console.log('🔍 [ENHANCED-QUERIES] Searching by App Store ID');
        const { data: appByStoreId, error: storeIdError } = await supabase
          .from('apps')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('app_store_id', appId)
          .maybeSingle();

        if (appByStoreId && !storeIdError) {
          appData = appByStoreId;
          searchMethod = 'app_store_id';
          console.log('✅ [ENHANCED-QUERIES] Found app by App Store ID:', appByStoreId.app_name);
        } else if (storeIdError) {
          console.warn('⚠️ [ENHANCED-QUERIES] App Store ID search error:', storeIdError.message);
        }
      }

      // Strategy 3: Fallback - search by app name if the ID might be a name
      if (!appData && !isUUID && !isAppStoreId) {
        console.log('🔍 [ENHANCED-QUERIES] Fallback: Searching by app name');
        const { data: appByName, error: nameError } = await supabase
          .from('apps')
          .select('*')
          .eq('organization_id', organizationId)
          .ilike('app_name', `%${appId}%`)
          .limit(1)
          .maybeSingle();

        if (appByName && !nameError) {
          appData = appByName;
          searchMethod = 'app_name';
          console.log('✅ [ENHANCED-QUERIES] Found app by name similarity:', appByName.app_name);
        }
      }

      if (appData) {
        console.log('✅ [ENHANCED-QUERIES] App found via', searchMethod, ':', {
          id: appData.id,
          app_name: appData.app_name,
          app_store_id: appData.app_store_id
        });
        return appData;
      }

      // Debugging: Check available apps in organization
      const { data: allApps } = await supabase
        .from('apps')
        .select('id, app_store_id, app_name')
        .eq('organization_id', organizationId)
        .limit(10);

      console.log('🔍 [ENHANCED-QUERIES] Available apps in org:', allApps);
      console.error('❌ [ENHANCED-QUERIES] App not found with any strategy:', {
        searchedId: appId,
        organizationId,
        strategies: {
          uuid: isUUID,
          appStoreId: isAppStoreId,
          fallback: !isUUID && !isAppStoreId
        }
      });

      throw new Error(`App not found: ${appId}. Searched by ${searchMethod}. Available apps: ${allApps?.length || 0}`);
    },
    enabled: !!appId && !!organizationId && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
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
        
        // Use the correct internal app ID (UUID) for gap analysis
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

  // Enhanced invalidation helpers with flexible app ID handling
  const invalidateAppData = (targetAppId: string) => {
    // Try to invalidate using both the provided ID and the resolved app data
    const resolvedAppId = selectedAppQuery.data?.id || targetAppId;
    
    const queries = [
      ...queryKeys.keywordIntelligence.allForApp(organizationId, targetAppId),
      ...queryKeys.keywordIntelligence.allForApp(organizationId, resolvedAppId)
    ];
    
    // Remove duplicates
    const uniqueQueries = queries.filter((query, index, self) => 
      index === self.findIndex(q => JSON.stringify(q) === JSON.stringify(query))
    );
    
    uniqueQueries.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey });
    });
  };

  const invalidateAllData = () => {
    const queries = queryKeys.keywordIntelligence.allForOrganization(organizationId);
    queries.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey: queryKey as any });
    });
  };

  // Enhanced prefetch with flexible app ID handling
  const prefetchAppData = (targetAppId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.keywordIntelligence.selectedApp(targetAppId, organizationId),
      queryFn: async () => {
        const isUUID = isValidUUID(targetAppId);
        const isAppStoreId = isValidAppStoreId(targetAppId);

        // Try UUID first if it's a valid UUID
        if (isUUID) {
          const { data } = await supabase
            .from('apps')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('id', targetAppId)
            .maybeSingle();
          
          if (data) return data;
        }

        // Fallback to app store ID
        const result = await supabase
          .from('apps')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('app_store_id', targetAppId)
          .maybeSingle();
        
        return result.data;
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
    
    // Enhanced cache management
    invalidateAppData,
    invalidateAllData,
    prefetchAppData,
    
    // Additional utility for ID format detection
    getAppIdFormat: (id: string) => ({
      isUUID: isValidUUID(id),
      isAppStoreId: isValidAppStoreId(id),
      resolvedApp: selectedAppQuery.data
    })
  };
};
