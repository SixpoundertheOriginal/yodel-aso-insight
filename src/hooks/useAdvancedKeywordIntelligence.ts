
import { useState, useEffect, useCallback } from 'react';
import { enhancedKeywordDataPipelineService } from '@/services/enhanced-keyword-data-pipeline.service';
import { useEnhancedQueries } from './useEnhancedQueries';

interface KeywordData {
  keyword: string;
  rank: number;
  searchVolume: number;
  difficulty: number;
  trend: 'up' | 'down' | 'stable';
  opportunity: 'high' | 'medium' | 'low';
  competitorRank: number;
  volumeHistory: any[];
  source: string;
  contextualReason?: string;
  relevanceScore?: number;
}

interface KeywordStats {
  totalKeywords: number;
  highOpportunityKeywords: number;
  avgDifficulty: number;
  totalSearchVolume: number;
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
  const [keywordData, setKeywordData] = useState<KeywordData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Get app data from enhanced queries
  const {
    selectedApp,
    clusters,
    isLoadingApp,
    appError
  } = useEnhancedQueries({
    organizationId,
    appId: targetAppId,
    enabled
  });

  // Generate enhanced keyword data when app changes
  useEffect(() => {
    if (!enabled || !targetAppId || !selectedApp || isLoadingApp) {
      console.log('🔄 [ADVANCED-KI] Waiting for app data or disabled');
      return;
    }

    generateKeywordData();
  }, [targetAppId, selectedApp, organizationId, enabled, isLoadingApp]);

  const generateKeywordData = useCallback(async () => {
    if (!targetAppId || !selectedApp) return;

    try {
      setIsLoading(true);
      setHasErrors(false);

      console.log('🎯 [ADVANCED-KI] Generating enhanced keywords for:', selectedApp.app_name);

      const enhancedKeywords = await enhancedKeywordDataPipelineService
        .getEnhancedKeywordData(organizationId, targetAppId, selectedApp);

      setKeywordData(enhancedKeywords);
      setLastUpdated(new Date());
      setHasErrors(false);

      console.log('✅ [ADVANCED-KI] Enhanced keywords loaded:', enhancedKeywords.length);

    } catch (error) {
      console.error('❌ [ADVANCED-KI] Error generating keywords:', error);
      setHasErrors(true);
      
      // Set fallback data on error
      setKeywordData([
        {
          keyword: 'mobile application',
          rank: 20,
          searchVolume: 1000,
          difficulty: 5.0,
          trend: 'stable',
          opportunity: 'medium',
          competitorRank: 15,
          volumeHistory: [],
          source: 'error_fallback',
          contextualReason: 'Fallback due to generation error'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [targetAppId, selectedApp, organizationId]);

  const refreshKeywordData = useCallback(async () => {
    if (!targetAppId) return;
    
    // Clear cache and regenerate
    enhancedKeywordDataPipelineService.clearCache(targetAppId);
    await generateKeywordData();
  }, [targetAppId, generateKeywordData]);

  // Calculate stats from current keyword data
  const stats: KeywordStats = {
    totalKeywords: keywordData.length,
    highOpportunityKeywords: keywordData.filter(k => k.opportunity === 'high').length,
    avgDifficulty: keywordData.length > 0 
      ? keywordData.reduce((sum, k) => sum + k.difficulty, 0) / keywordData.length 
      : 0,
    totalSearchVolume: keywordData.reduce((sum, k) => sum + k.searchVolume, 0)
  };

  return {
    // Data
    keywordData,
    clusters: clusters || [],
    selectedApp,
    stats,
    lastUpdated,
    
    // States
    isLoading: isLoading || isLoadingApp,
    hasErrors: hasErrors || !!appError,
    
    // Actions
    refreshKeywordData,
    generateKeywordData
  };
};
