
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
  hasAttemptedLoad: boolean;
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
  const initializationTimeoutRef = useRef<NodeJS.Timeout>();
  
  const [state, setState] = useState<KeywordIntelligenceState>({
    isInitialized: false,
    isTransitioning: false,
    lastSuccessfulLoad: null,
    errorCount: 0,
    fallbackMode: false,
    hasAttemptedLoad: false
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
      
      setState(prev => ({ ...prev, isTransitioning: true, hasAttemptedLoad: true }));
      
      // Clear any existing timeouts
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
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
      
      // Give services time to initialize before marking as complete
      initializationTimeoutRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          isInitialized: true,
          isTransitioning: false,
          lastSuccessfulLoad: new Date(),
          hasAttemptedLoad: true
        }));
        
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }
      }, 2000); // Longer initialization time
    }
  }, [targetAppId, state.isInitialized]);

  // Improved error detection - only check for errors after initialization attempt
  useEffect(() => {
    // Don't check for errors if we haven't attempted to load yet or are still loading
    if (!state.hasAttemptedLoad || advancedKI.isLoading || enhancedAnalytics.isLoading || state.isTransitioning) {
      return;
    }

    // Only consider it an error if we have actual error states from the hooks
    const hasRealErrors = advancedKI.hasErrors || enhancedAnalytics.isLoading === false && 
      enhancedAnalytics.rankDistribution === null && 
      enhancedAnalytics.keywordTrends.length === 0 &&
      advancedKI.keywordData.length === 0;
    
    if (hasRealErrors && errorCountRef.current < 3) {
      errorCountRef.current++;
      console.warn(`⚠️ [KI-MANAGER] Error detected (${errorCountRef.current}/3)`);
      
      if (errorCountRef.current >= 3) {
        console.log('🔄 [KI-MANAGER] Enabling fallback mode after 3 errors');
        setState(prev => ({ ...prev, fallbackMode: true }));
      }
    } else if (!hasRealErrors && advancedKI.keywordData.length > 0) {
      // Reset error count when we have successful data
      if (errorCountRef.current > 0) {
        console.log('✅ [KI-MANAGER] Resetting error count - data loaded successfully');
        errorCountRef.current = 0;
        setState(prev => ({ 
          ...prev, 
          fallbackMode: false, 
          errorCount: 0,
          lastSuccessfulLoad: new Date()
        }));
      }
    }
  }, [
    state.hasAttemptedLoad,
    state.isTransitioning,
    advancedKI.isLoading,
    advancedKI.hasErrors,
    advancedKI.keywordData.length,
    enhancedAnalytics.isLoading,
    enhancedAnalytics.rankDistribution,
    enhancedAnalytics.keywordTrends.length
  ]);

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
        await enhancedAnalytics.createCollectionJob('full_refresh');
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
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
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
