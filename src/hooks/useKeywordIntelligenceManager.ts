
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdvancedKeywordIntelligence } from './useAdvancedKeywordIntelligence';
import { useEnhancedKeywordAnalytics } from './useEnhancedKeywordAnalytics';
import { enhancedKeywordDataPipelineService } from '@/services/enhanced-keyword-data-pipeline.service';
import { toast } from 'sonner';

interface KeywordIntelligenceState {
  isInitialized: boolean;
  isTransitioning: boolean;
  lastSuccessfulLoad: Date | null;
  errorCount: number;
  fallbackMode: boolean;
}

interface UseKeywordIntelligenceManagerProps {
  organizationId: string;
  targetAppId?: string;
}

export const useKeywordIntelligenceManager = ({
  organizationId,
  targetAppId
}: UseKeywordIntelligenceManagerProps) => {
  const queryClient = useQueryClient();
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();
  const errorCountRef = useRef(0);
  
  const [state, setState] = useState<KeywordIntelligenceState>({
    isInitialized: false,
    isTransitioning: false,
    lastSuccessfulLoad: null,
    errorCount: 0,
    fallbackMode: false
  });

  // Use both hooks but manage their coordination
  const advancedKI = useAdvancedKeywordIntelligence({
    organizationId,
    targetAppId,
    enabled: !!targetAppId && !state.isTransitioning
  });

  const enhancedAnalytics = useEnhancedKeywordAnalytics({
    organizationId,
    appId: targetAppId,
    enabled: !!targetAppId && !state.isTransitioning
  });

  // Handle app transitions with timeout protection
  useEffect(() => {
    if (targetAppId && !state.isInitialized) {
      console.log('🚀 [KI-MANAGER] Initializing enhanced intelligence for app:', targetAppId);
      
      setState(prev => ({ ...prev, isTransitioning: true }));
      
      // Clear any existing timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      
      // Set transition timeout to prevent stuck states
      transitionTimeoutRef.current = setTimeout(() => {
        console.warn('⚠️ [KI-MANAGER] Transition timeout, forcing completion');
        setState(prev => ({
          ...prev,
          isTransitioning: false,
          errorCount: Math.min(prev.errorCount + 1, 5)
        }));
      }, 8000); // Longer timeout for enhanced processing
      
      // Mark as initialized after processing
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          isInitialized: true,
          isTransitioning: false,
          lastSuccessfulLoad: new Date()
        }));
        
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }
      }, 1000); // Slightly longer for enhanced processing
    }
  }, [targetAppId, state.isInitialized]);

  // Monitor for errors and enable fallback mode
  useEffect(() => {
    const hasErrors = advancedKI.hasErrors || enhancedAnalytics.isLoading === false && 
      (!enhancedAnalytics.rankDistribution && !enhancedAnalytics.keywordTrends.length);
    
    if (hasErrors && errorCountRef.current < 3) {
      errorCountRef.current++;
      console.warn(`⚠️ [KI-MANAGER] Error detected (${errorCountRef.current}/3)`);
      
      if (errorCountRef.current >= 3) {
        console.log('🔄 [KI-MANAGER] Enabling fallback mode');
        setState(prev => ({ ...prev, fallbackMode: true }));
      }
    }
  }, [advancedKI.hasErrors, enhancedAnalytics.rankDistribution, enhancedAnalytics.keywordTrends.length, enhancedAnalytics.isLoading]);

  // Enhanced refresh function
  const refreshAllData = useCallback(async () => {
    if (!targetAppId || state.isTransitioning) return;
    
    console.log('🔄 [KI-MANAGER] Refreshing all enhanced keyword data');
    setState(prev => ({ ...prev, isTransitioning: true }));
    
    try {
      // Clear enhanced pipeline cache
      enhancedKeywordDataPipelineService.clearCache(targetAppId);
      
      // Start background collection job if not in fallback mode
      if (!state.fallbackMode) {
        await enhancedAnalytics.createCollectionJob('enhanced_discovery');
      }
      
      // Refresh both systems with enhanced data
      await Promise.all([
        advancedKI.refreshKeywordData(),
        enhancedAnalytics.refetchRankDist(),
        enhancedAnalytics.refetchTrends()
      ]);
      
      setState(prev => ({
        ...prev,
        isTransitioning: false,
        lastSuccessfulLoad: new Date(),
        errorCount: 0,
        fallbackMode: false
      }));
      
      errorCountRef.current = 0;
      toast.success('Enhanced keyword data refreshed successfully');
      
    } catch (error) {
      console.error('❌ [KI-MANAGER] Enhanced refresh failed:', error);
      setState(prev => ({ ...prev, isTransitioning: false }));
      toast.error('Failed to refresh enhanced keyword data');
    }
  }, [targetAppId, state.isTransitioning, state.fallbackMode, advancedKI, enhancedAnalytics]);

  // Generate unified enhanced keyword data
  const unifiedKeywordData = useCallback(() => {
    if (state.fallbackMode || !advancedKI.keywordData.length) {
      console.log('🔄 [KI-MANAGER] Using fallback mode');
      return enhancedKeywordDataPipelineService.generateGenericFallback();
    }
    return advancedKI.keywordData;
  }, [state.fallbackMode, advancedKI.keywordData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Enhanced unified state
    isLoading: state.isTransitioning || advancedKI.isLoading || enhancedAnalytics.isLoading,
    isInitialized: state.isInitialized,
    fallbackMode: state.fallbackMode,
    lastSuccessfulLoad: state.lastSuccessfulLoad,
    
    // Enhanced unified data
    keywordData: unifiedKeywordData(),
    clusters: advancedKI.clusters,
    stats: advancedKI.stats,
    selectedApp: advancedKI.selectedApp,
    
    // Enhanced analytics
    rankDistribution: enhancedAnalytics.rankDistribution,
    keywordTrends: enhancedAnalytics.keywordTrends,
    analytics: enhancedAnalytics.analytics,
    
    // Enhanced actions
    refreshAllData,
    clearStuckTransition: () => setState(prev => ({ ...prev, isTransitioning: false })),
    
    // Individual hook access for advanced use
    advancedKI,
    enhancedAnalytics
  };
};
