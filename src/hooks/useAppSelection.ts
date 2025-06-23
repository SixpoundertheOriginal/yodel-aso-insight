
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

// Utility functions for ID format detection
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const isValidAppStoreId = (str: string): boolean => {
  return /^\d+$/.test(str) && str.length >= 6 && str.length <= 12;
};

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
    // Enhanced invalidation to handle both UUID and App Store ID formats
    const isUUID = isValidUUID(appId);
    const isAppStoreId = isValidAppStoreId(appId);
    
    console.log('🔄 [APP-SELECTION] Invalidating queries for app:', {
      appId,
      isUUID,
      isAppStoreId
    });

    const queriesToInvalidate = [
      ['keyword-gap-analysis', organizationId, appId],
      ['keyword-clusters', organizationId],
      ['keyword-volume-trends', organizationId],
      ['selected-app', appId, organizationId]
    ];

    // If it's an App Store ID, also invalidate potential UUID-based queries
    if (isAppStoreId) {
      // Note: We can't easily reverse-lookup UUID from App Store ID here,
      // but the enhanced queries hook should handle the resolution
      console.log('🔄 [APP-SELECTION] App Store ID detected, enhanced invalidation may be needed');
    }

    queriesToInvalidate.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey });
    });
  }, [organizationId, queryClient]);

  const selectApp = useCallback(async (appId: string | null) => {
    // Enhanced app ID processing and validation
    if (appId) {
      const isUUID = isValidUUID(appId);
      const isAppStoreId = isValidAppStoreId(appId);
      
      console.log('🎯 [APP-SELECTION] Processing app selection:', {
        appId,
        isUUID,
        isAppStoreId,
        lastProcessed: lastProcessedAppRef.current
      });

      // Prevent processing the same app ID multiple times
      if (appId === lastProcessedAppRef.current) {
        console.log('🔄 [APP-SELECTION] App already processed:', appId);
        return;
      }

      // Validate the ID format
      if (!isUUID && !isAppStoreId && appId.length < 3) {
        console.warn('⚠️ [APP-SELECTION] Invalid app ID format:', appId);
        setState(prev => ({
          ...prev,
          transitionError: 'Invalid app ID format'
        }));
        return;
      }
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

      // Quick transition completion with enhanced logging
      transitionTimeoutRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          selectedAppId: appId,
          isTransitioning: false,
          transitionError: null
        }));

        transitionLockRef.current = false;
        console.log('✅ [APP-SELECTION] App transition completed:', {
          appId,
          organizationId,
          timestamp: new Date().toISOString()
        });
      }, 100);

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
    console.log('🗑️ [APP-SELECTION] Clearing app selection');
    lastProcessedAppRef.current = null;
    selectApp(null);
  }, [selectApp]);

  const forceRefresh = useCallback(() => {
    if (state.selectedAppId) {
      console.log('🔄 [APP-SELECTION] Force refreshing app data:', state.selectedAppId);
      invalidateAppQueries(state.selectedAppId);
    }
  }, [state.selectedAppId, invalidateAppQueries]);

  return {
    ...state,
    selectApp,
    clearSelection,
    forceRefresh,
    isLocked: transitionLockRef.current,
    // Additional utility functions
    getAppIdFormat: (id: string | null) => id ? {
      isUUID: isValidUUID(id),
      isAppStoreId: isValidAppStoreId(id),
      isValid: id ? (isValidUUID(id) || isValidAppStoreId(id)) : false
    } : null
  };
};
