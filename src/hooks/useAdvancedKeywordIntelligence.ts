
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppSelection } from './useAppSelection';
import { useEnhancedQueries } from './useEnhancedQueries';
import { keywordDataPipelineService } from '@/services/keyword-data-pipeline.service';
import { queryKeys } from '@/services/query-key.service';
import { KeywordVolumeHistory } from '@/services/competitor-keyword-analysis.service';
import { competitorKeywordAnalysisService } from '@/services/competitor-keyword-analysis.service';

export interface AdvancedKeywordData {
  keyword: string;
  rank: number | null;
  searchVolume: number | null;
  difficulty: number | null;
  trend: 'up' | 'down' | 'stable' | null;
  opportunity: 'high' | 'medium' | 'low' | null;
  competitorRank: number | null;
  volumeHistory: KeywordVolumeHistory[];
}

export interface KeywordIntelligenceStats {
  totalKeywords: number;
  highOpportunityKeywords: number;
  avgDifficulty: number;
  totalSearchVolume: number;
  improvableKeywords: number;
}

interface UseAdvancedKeywordIntelligenceProps {
  organizationId: string;
  targetAppId?: string;
  enabled?: boolean;
}

export const useAdvancedKeywordIntelligence = ({
  organizationId,
  targetAppId,
  enabled = true
}: UseAdvancedKeywordIntelligenceProps) => {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    minVolume: 0,
    maxDifficulty: 10,
    trend: 'all' as 'all' | 'up' | 'down' | 'stable',
    opportunity: 'all' as 'all' | 'high' | 'medium' | 'low'
  });

  // Use centralized app selection
  const appSelection = useAppSelection({
    organizationId,
    onAppChange: (appId) => {
      console.log('🎯 [KEYWORD-INTELLIGENCE] App changed to:', appId);
      setSelectedKeyword(null); // Clear selected keyword on app change
    }
  });

  // Sync target app with selection state
  useEffect(() => {
    if (targetAppId && targetAppId !== appSelection.selectedAppId) {
      appSelection.selectApp(targetAppId);
    }
  }, [targetAppId, appSelection]);

  // Get current user's organization ID if not provided
  const { data: currentOrgId } = useQuery({
    queryKey: ['current-organization'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      return profile?.organization_id || null;
    },
    enabled: !organizationId,
  });

  const effectiveOrgId = organizationId || currentOrgId;
  const effectiveAppId = appSelection.selectedAppId || targetAppId;

  // Enhanced queries with proper error handling
  const {
    selectedApp,
    gapAnalysis,
    clusters,
    isLoading: isLoadingQueries,
    hasErrors,
    invalidateAppData
  } = useEnhancedQueries({
    organizationId: effectiveOrgId || '',
    appId: effectiveAppId,
    enabled: enabled && !!effectiveOrgId && !!effectiveAppId && !appSelection.isTransitioning
  });

  // Volume trends for selected keyword
  const { data: volumeTrends = [], isLoading: isLoadingTrends } = useQuery({
    queryKey: queryKeys.keywordIntelligence.volumeTrends(effectiveOrgId || '', selectedKeyword || ''),
    queryFn: () => selectedKeyword && effectiveOrgId
      ? competitorKeywordAnalysisService.getKeywordVolumeTrends(effectiveOrgId, selectedKeyword)
      : Promise.resolve([]),
    enabled: enabled && !!selectedKeyword && !!effectiveOrgId,
    staleTime: 1000 * 60 * 10,
  });

  // Generate keyword data using pipeline service
  const keywordData = useMemo(() => {
    if (!selectedApp || appSelection.isTransitioning || !effectiveOrgId) {
      console.log('🔄 [KEYWORD-INTELLIGENCE] Waiting for app data or transitioning');
      return [];
    }

    const appMetadata = {
      id: selectedApp.id,
      app_name: selectedApp.app_name,
      category: selectedApp.category,
      organizationId: effectiveOrgId
    };

    const pipelineData = keywordDataPipelineService.getKeywordData(
      appMetadata,
      gapAnalysis,
      clusters,
      { maxKeywords: 50 }
    );

    console.log('🎯 [KEYWORD-INTELLIGENCE] Pipeline generated', pipelineData.keywords.length, 'keywords');
    return pipelineData.keywords;
  }, [selectedApp, gapAnalysis, clusters, appSelection.isTransitioning, effectiveOrgId]);

  // Apply filters
  const filteredKeywords = useMemo(() => {
    return keywordData.filter(kw => {
      if (kw.searchVolume && kw.searchVolume < filters.minVolume) return false;
      if (kw.difficulty && kw.difficulty > filters.maxDifficulty) return false;
      if (filters.trend !== 'all' && kw.trend !== filters.trend) return false;
      if (filters.opportunity !== 'all' && kw.opportunity !== filters.opportunity) return false;
      return true;
    });
  }, [keywordData, filters]);

  // Calculate stats
  const stats: KeywordIntelligenceStats = useMemo(() => {
    return {
      totalKeywords: keywordData.length,
      highOpportunityKeywords: keywordData.filter(kw => kw.opportunity === 'high').length,
      avgDifficulty: keywordData.length > 0 ? 
        keywordData.reduce((sum, kw) => sum + (kw.difficulty || 0), 0) / keywordData.length : 0,
      totalSearchVolume: keywordData.reduce((sum, kw) => sum + (kw.searchVolume || 0), 0),
      improvableKeywords: keywordData.filter(kw => 
        kw.rank && kw.rank > 20 && kw.opportunity !== 'low'
      ).length
    };
  }, [keywordData]);

  const refreshKeywordData = () => {
    if (effectiveAppId && effectiveOrgId) {
      keywordDataPipelineService.clearCache(effectiveOrgId, effectiveAppId);
      invalidateAppData(effectiveAppId);
    }
  };

  return {
    keywordData: filteredKeywords,
    clusters,
    volumeTrends,
    stats,
    selectedKeyword,
    setSelectedKeyword,
    filters,
    setFilters,
    isLoading: isLoadingQueries || appSelection.isTransitioning,
    isLoadingTrends,
    gapAnalysis,
    effectiveOrgId,
    hasErrors,
    selectedApp,
    refreshKeywordData,
    isTransitioning: appSelection.isTransitioning,
    transitionError: appSelection.transitionError
  };
};
