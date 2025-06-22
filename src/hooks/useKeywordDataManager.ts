
import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UseKeywordDataManagerProps {
  targetAppId?: string;
  organizationId: string;
}

export const useKeywordDataManager = ({
  targetAppId,
  organizationId
}: UseKeywordDataManagerProps) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const queryClient = useQueryClient();
  const previousAppIdRef = useRef<string | undefined>();
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle app transitions with debouncing
  useEffect(() => {
    if (targetAppId !== previousAppIdRef.current) {
      setIsTransitioning(true);
      
      // Clear previous timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }

      // Invalidate related queries immediately
      if (previousAppIdRef.current) {
        const queriesToInvalidate = [
          ['keyword-gap-analysis', organizationId, previousAppIdRef.current],
          ['keyword-clusters', organizationId, previousAppIdRef.current],
          ['keyword-volume-trends', organizationId],
          ['selected-app', previousAppIdRef.current, organizationId]
        ];

        queriesToInvalidate.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }

      // Debounce the transition completion
      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
        previousAppIdRef.current = targetAppId;
      }, 300);
    }

    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [targetAppId, organizationId, queryClient]);

  // Force refresh all keyword data for current app
  const refreshKeywordData = () => {
    if (targetAppId && organizationId) {
      const queries = [
        ['keyword-gap-analysis', organizationId, targetAppId],
        ['keyword-clusters', organizationId, targetAppId],
        ['selected-app', targetAppId, organizationId]
      ];

      queries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
    }
  };

  return {
    isTransitioning,
    refreshKeywordData
  };
};
