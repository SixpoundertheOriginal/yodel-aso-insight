
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { competitorKeywordAnalysisService, KeywordVolumeHistory, KeywordGapAnalysis, KeywordDifficultyScore, KeywordCluster } from '@/services/competitor-keyword-analysis.service';
import { keywordRankingService, KeywordRanking } from '@/services/keyword-ranking.service';

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

  // Fetch keyword gap analysis
  const { data: gapAnalysis = [], isLoading: isLoadingGaps } = useQuery({
    queryKey: ['keyword-gap-analysis', organizationId, targetAppId],
    queryFn: () => targetAppId 
      ? competitorKeywordAnalysisService.getKeywordGapAnalysis(organizationId, targetAppId)
      : Promise.resolve([]),
    enabled: enabled && !!targetAppId,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });

  // Fetch keyword clusters
  const { data: clusters = [], isLoading: isLoadingClusters } = useQuery({
    queryKey: ['keyword-clusters', organizationId],
    queryFn: () => competitorKeywordAnalysisService.getKeywordClusters(organizationId),
    enabled,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Fetch volume trends for selected keyword
  const { data: volumeTrends = [], isLoading: isLoadingTrends } = useQuery({
    queryKey: ['keyword-volume-trends', organizationId, selectedKeyword],
    queryFn: () => selectedKeyword 
      ? competitorKeywordAnalysisService.getKeywordVolumeTrends(organizationId, selectedKeyword)
      : Promise.resolve([]),
    enabled: enabled && !!selectedKeyword,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Generate mock keyword data for demo (in real app this would come from actual analysis)
  const generateMockKeywordData = (gaps: KeywordGapAnalysis[]): AdvancedKeywordData[] => {
    const mockKeywords = [
      'fitness app', 'workout tracker', 'exercise planner', 'health monitor',
      'diet tracker', 'calorie counter', 'meditation app', 'yoga practice',
      'running tracker', 'gym workout', 'weight loss', 'muscle building'
    ];

    return mockKeywords.map((keyword, index) => {
      const gapData = gaps.find(g => g.keyword === keyword);
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

  const keywordData = generateMockKeywordData(gapAnalysis);

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
    avgDifficulty: keywordData.reduce((sum, kw) => sum + (kw.difficulty || 0), 0) / keywordData.length,
    totalSearchVolume: keywordData.reduce((sum, kw) => sum + (kw.searchVolume || 0), 0),
    improvableKeywords: keywordData.filter(kw => 
      kw.rank && kw.rank > 20 && kw.opportunity !== 'low'
    ).length
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
    isLoading: isLoadingGaps || isLoadingClusters,
    isLoadingTrends,
    gapAnalysis
  };
};
