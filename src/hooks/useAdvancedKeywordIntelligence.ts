
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { competitorKeywordAnalysisService, KeywordVolumeHistory, KeywordGapAnalysis, KeywordDifficultyScore, KeywordCluster } from '@/services/competitor-keyword-analysis.service';
import { keywordRankingService, KeywordRanking } from '@/services/keyword-ranking.service';
import { supabase } from '@/integrations/supabase/client';

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

  // Get selected app details for app-specific keyword generation
  const { data: selectedApp, isLoading: isLoadingApp } = useQuery({
    queryKey: ['selected-app', targetAppId, effectiveOrgId],
    queryFn: async () => {
      if (!targetAppId || !effectiveOrgId) return null;

      const { data: apps } = await supabase
        .from('apps')
        .select('*')
        .eq('organization_id', effectiveOrgId)
        .eq('id', targetAppId)
        .single();

      console.log('🔍 [KEYWORD-INTELLIGENCE] Selected app loaded:', apps?.app_name);
      return apps;
    },
    enabled: !!targetAppId && !!effectiveOrgId,
  });

  // Fetch keyword gap analysis with improved error handling - include targetAppId in key
  const { data: gapAnalysis = [], isLoading: isLoadingGaps, error: gapError } = useQuery({
    queryKey: ['keyword-gap-analysis', effectiveOrgId, targetAppId, selectedApp?.app_name],
    queryFn: async () => {
      if (!targetAppId || !effectiveOrgId) return [];
      
      try {
        console.log('🔍 [KEYWORD-INTELLIGENCE] Fetching gap analysis for app:', selectedApp?.app_name || targetAppId);
        const data = await competitorKeywordAnalysisService.getKeywordGapAnalysis(effectiveOrgId, targetAppId);
        console.log('✅ [KEYWORD-INTELLIGENCE] Gap analysis data:', data);
        return data;
      } catch (error) {
        console.error('❌ [KEYWORD-INTELLIGENCE] Gap analysis failed:', error);
        return [];
      }
    },
    enabled: enabled && !!targetAppId && !!effectiveOrgId,
    staleTime: 1000 * 60 * 5, // Reduced to 5 minutes for more frequent updates
  });

  // Fetch keyword clusters with error handling - include targetAppId in key
  const { data: clusters = [], isLoading: isLoadingClusters, error: clusterError } = useQuery({
    queryKey: ['keyword-clusters', effectiveOrgId, targetAppId, selectedApp?.app_name],
    queryFn: async () => {
      if (!effectiveOrgId) return [];
      
      try {
        console.log('🔍 [KEYWORD-INTELLIGENCE] Fetching clusters for app:', selectedApp?.app_name || 'unknown');
        const data = await competitorKeywordAnalysisService.getKeywordClusters(effectiveOrgId);
        console.log('✅ [KEYWORD-INTELLIGENCE] Clusters data:', data);
        return data;
      } catch (error) {
        console.error('❌ [KEYWORD-INTELLIGENCE] Clusters failed:', error);
        return [];
      }
    },
    enabled: enabled && !!effectiveOrgId,
    staleTime: 1000 * 60 * 10, // Reduced to 10 minutes
  });

  // Fetch volume trends for selected keyword
  const { data: volumeTrends = [], isLoading: isLoadingTrends } = useQuery({
    queryKey: ['keyword-volume-trends', effectiveOrgId, selectedKeyword],
    queryFn: () => selectedKeyword && effectiveOrgId
      ? competitorKeywordAnalysisService.getKeywordVolumeTrends(effectiveOrgId, selectedKeyword)
      : Promise.resolve([]),
    enabled: enabled && !!selectedKeyword && !!effectiveOrgId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Generate app-specific demo keywords based on app name/category
  const generateAppSpecificKeywords = (appName: string, appCategory?: string): string[] => {
    const normalizedName = appName.toLowerCase();
    console.log('📱 [KEYWORD-INTELLIGENCE] Generating keywords for app:', appName, 'category:', appCategory);
    
    // Language learning apps (like Pimsleur)
    if (normalizedName.includes('pimsleur') || normalizedName.includes('language') || appCategory?.includes('education')) {
      return [
        'language learning', 'learn spanish', 'french lessons', 'pronunciation practice',
        'conversational skills', 'vocabulary builder', 'audio lessons', 'language immersion',
        'speak fluently', 'grammar practice', 'listening comprehension', 'accent training',
        'bilingual skills', 'foreign language', 'language exchange', 'study abroad'
      ];
    }
    
    // Fitness apps
    if (normalizedName.includes('fitness') || normalizedName.includes('workout') || appCategory?.includes('health')) {
      return [
        'fitness app', 'workout tracker', 'exercise planner', 'health monitor',
        'diet tracker', 'calorie counter', 'running tracker', 'gym workout',
        'weight loss', 'muscle building', 'yoga practice', 'meditation app'
      ];
    }
    
    // Default generic keywords
    return [
      'mobile app', 'productivity', 'lifestyle', 'utilities', 'entertainment',
      'social media', 'communication', 'tools', 'games', 'education'
    ];
  };

  // Generate enhanced keyword data combining real and app-specific demo data
  const generateEnhancedKeywordData = (gaps: KeywordGapAnalysis[], clusters: KeywordCluster[], appData?: any): AdvancedKeywordData[] => {
    console.log('🎯 [KEYWORD-INTELLIGENCE] Generating enhanced data for app:', appData?.app_name, 'with gaps:', gaps.length, 'clusters:', clusters.length);

    // Get keywords from clusters first
    const clusterKeywords = clusters.flatMap(cluster => [
      cluster.primaryKeyword,
      ...cluster.relatedKeywords
    ]);

    // Add gap analysis keywords
    const gapKeywords = gaps.map(g => g.keyword);

    // Generate app-specific keywords if we have app data
    let appSpecificKeywords: string[] = [];
    if (appData) {
      appSpecificKeywords = generateAppSpecificKeywords(appData.app_name, appData.category);
      console.log('📱 [KEYWORD-INTELLIGENCE] Generated app-specific keywords for', appData.app_name, ':', appSpecificKeywords);
    }

    // Combine and deduplicate
    const allKeywords = Array.from(new Set([...gapKeywords, ...clusterKeywords, ...appSpecificKeywords]));
    console.log('🔗 [KEYWORD-INTELLIGENCE] Combined keywords for', appData?.app_name, ':', allKeywords.length);

    return allKeywords.map((keyword, index) => {
      const gapData = gaps.find(g => g.keyword === keyword);
      const relatedCluster = clusters.find(c => 
        c.primaryKeyword === keyword || c.relatedKeywords.includes(keyword)
      );

      // Use real data if available, otherwise generate realistic demo data
      return {
        keyword,
        rank: gapData?.targetRank || Math.floor(Math.random() * 100) + 1,
        searchVolume: gapData?.searchVolume || Math.floor(Math.random() * 50000) + 1000,
        difficulty: gapData?.difficultyScore || Math.round((Math.random() * 8 + 1) * 10) / 10,
        trend: (['up', 'down', 'stable'] as const)[Math.floor(Math.random() * 3)],
        opportunity: gapData?.gapOpportunity as 'high' | 'medium' | 'low' || 
                    (['high', 'medium', 'low'] as const)[Math.floor(Math.random() * 3)],
        competitorRank: gapData?.bestCompetitorRank || Math.floor(Math.random() * 50) + 1,
        volumeHistory: []
      };
    });
  };

  // Force regeneration when app changes
  const keywordData = generateEnhancedKeywordData(gapAnalysis, clusters, selectedApp);

  // Apply filters
  const filteredKeywords = keywordData.filter(kw => {
    if (kw.searchVolume && kw.searchVolume < filters.minVolume) return false;
    if (kw.difficulty && kw.difficulty > filters.maxDifficulty) return false;
    if (filters.trend !== 'all' && kw.trend !== filters.trend) return false;
    if (filters.opportunity !== 'all' && kw.opportunity !== filters.opportunity) return false;
    return true;
  });

  // Calculate stats
  const stats: KeywordIntelligenceStats = {
    totalKeywords: keywordData.length,
    highOpportunityKeywords: keywordData.filter(kw => kw.opportunity === 'high').length,
    avgDifficulty: keywordData.length > 0 ? 
      keywordData.reduce((sum, kw) => sum + (kw.difficulty || 0), 0) / keywordData.length : 0,
    totalSearchVolume: keywordData.reduce((sum, kw) => sum + (kw.searchVolume || 0), 0),
    improvableKeywords: keywordData.filter(kw => 
      kw.rank && kw.rank > 20 && kw.opportunity !== 'low'
    ).length
  };

  // Log any errors for debugging
  useEffect(() => {
    if (gapError) {
      console.error('❌ [KEYWORD-INTELLIGENCE] Gap analysis error:', gapError);
    }
    if (clusterError) {
      console.error('❌ [KEYWORD-INTELLIGENCE] Cluster error:', clusterError);
    }
  }, [gapError, clusterError]);

  // Log when app changes to debug re-rendering
  useEffect(() => {
    console.log('🔄 [KEYWORD-INTELLIGENCE] App changed, regenerating data for:', selectedApp?.app_name);
  }, [selectedApp?.app_name, targetAppId]);

  return {
    keywordData: filteredKeywords,
    clusters,
    volumeTrends,
    stats,
    selectedKeyword,
    setSelectedKeyword,
    filters,
    setFilters,
    isLoading: isLoadingGaps || isLoadingClusters || isLoadingApp,
    isLoadingTrends,
    gapAnalysis,
    effectiveOrgId,
    hasErrors: !!gapError || !!clusterError,
    selectedApp
  };
};
