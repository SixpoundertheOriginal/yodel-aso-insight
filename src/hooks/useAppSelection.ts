
import { useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface AppSelectionState {
  selectedAppId: string | null;
  isTransitioning: boolean;
  transitionError: string | null;
  lastSelectedAppId: string | null;
}

interface UseAppSelectionProps {
  organizationId: string;
  onAppChange?: (appId: string | null) => void;
}

export const useAppSelection = ({ 
  organizationId, 
  onAppChange 
}: UseAppSelectionProps) => {
  const queryClient = useQueryClient();
  const transitionLockRef = useRef<boolean>(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();
  const lastProcessedAppRef = useRef<string | null>(null);
  
  const [state, setState] = useState<AppSelectionState>({
    selectedAppId: null,
    isTransitioning: false,
    transitionError: null,
    lastSelectedAppId: null
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const invalidateAppQueries = useCallback((appId: string) => {
    const queriesToInvalidate = [
      ['keyword-gap-analysis', organizationId, appId],
      ['keyword-clusters', organizationId],
      ['keyword-volume-trends', organizationId],
      ['selected-app', appId, organizationId]
    ];

    queriesToInvalidate.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey });
    });
  }, [organizationId, queryClient]);

  const selectApp = useCallback(async (appId: string | null) => {
    // Prevent processing the same app ID multiple times
    if (appId === lastProcessedAppRef.current) {
      console.log('🔄 [APP-SELECTION] App already processed:', appId);
      return;
    }

    // Prevent concurrent transitions
    if (transitionLockRef.current) {
      console.log('🔒 [APP-SELECTION] Transition already in progress, ignoring request');
      return;
    }

    // Don't transition if already selected and not transitioning
    if (state.selectedAppId === appId && !state.isTransitioning) {
      console.log('🔄 [APP-SELECTION] App already selected and stable:', appId);
      lastProcessedAppRef.current = appId;
      return;
    }

    console.log('🎯 [APP-SELECTION] Starting app transition:', state.selectedAppId, '->', appId);

    // Set transition lock and update processed ref
    transitionLockRef.current = true;
    lastProcessedAppRef.current = appId;

    // Clear any existing timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    try {
      // Update state to transitioning
      setState(prev => ({
        ...prev,
        isTransitioning: true,
        transitionError: null,
        lastSelectedAppId: prev.selectedAppId
      }));

      // Invalidate old app queries if switching from another app
      if (state.selectedAppId && state.selectedAppId !== appId) {
        invalidateAppQueries(state.selectedAppId);
      }

      // Notify callback of app change
      if (onAppChange) {
        onAppChange(appId);
      }

      // Shorter, immediate transition completion
      transitionTimeoutRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          selectedAppId: appId,
          isTransitioning: false,
          transitionError: null
        }));

        transitionLockRef.current = false;
        console.log('✅ [APP-SELECTION] App transition completed:', appId);
      }, 100); // Much shorter delay

    } catch (error) {
      console.error('❌ [APP-SELECTION] App transition failed:', error);
      
      setState(prev => ({
        ...prev,
        isTransitioning: false,
        transitionError: error instanceof Error ? error.message : 'Transition failed',
        selectedAppId: prev.lastSelectedAppId // Revert to last known good state
      }));

      transitionLockRef.current = false;
      lastProcessedAppRef.current = state.selectedAppId; // Reset to previous
    }
  }, [state.selectedAppId, state.isTransitioning, organizationId, invalidateAppQueries, onAppChange]);

  const clearSelection = useCallback(() => {
    lastProcessedAppRef.current = null;
    selectApp(null);
  }, [selectApp]);

  const forceRefresh = useCallback(() => {
    if (state.selectedAppId) {
      invalidateAppQueries(state.selectedAppId);
    }
  }, [state.selectedAppId, invalidateAppQueries]);

  return {
    ...state,
    selectApp,
    clearSelection,
    forceRefresh,
    isLocked: transitionLockRef.current
  };
};
