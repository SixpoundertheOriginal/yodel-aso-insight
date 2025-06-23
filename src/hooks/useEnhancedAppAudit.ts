
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAdvancedKeywordIntelligence } from './useAdvancedKeywordIntelligence';
import { useEnhancedKeywordAnalytics } from './useEnhancedKeywordAnalytics';
import { semanticClusteringService } from '@/services/semantic-clustering.service';
import { metadataScoringService } from '@/services/metadata-scoring.service';
import { ScrapedMetadata } from '@/types/aso';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedAuditData {
  overallScore: number;
  metadataScore: number;
  keywordScore: number;
  competitorScore: number;
  opportunityCount: number;
  rankDistribution: any;
  keywordClusters: any[];
  keywordTrends: any[];
  competitorAnalysis: any[];
  currentKeywords: string[];
  metadataAnalysis: any;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    category: 'metadata' | 'keywords' | 'competitors';
    impact: number;
  }>;
}

interface UseEnhancedAppAuditProps {
  organizationId: string;
  appId?: string;
  metadata?: ScrapedMetadata;
  enabled?: boolean;
}

export const useEnhancedAppAudit = ({
  organizationId,
  appId,
  metadata,
  enabled = true
}: UseEnhancedAppAuditProps) => {
  const [auditData, setAuditData] = useState<EnhancedAuditData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAuditRunning, setIsAuditRunning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Add refs to prevent infinite loops
  const auditRunningRef = useRef(false);
  const lastAuditMetadataRef = useRef<string>('');
  const auditCooldownRef = useRef(0);
  const auditCooldown = 3000; // 3 second cooldown between audits

  // Use existing intelligence hooks
  const advancedKI = useAdvancedKeywordIntelligence({
    organizationId,
    targetAppId: appId,
    enabled: enabled && !!appId
  });

  const enhancedAnalytics = useEnhancedKeywordAnalytics({
    organizationId,
    appId,
    enabled: enabled && !!appId
  });

  // Get competitor data
  const { data: competitorData } = useQuery({
    queryKey: ['competitor-data', organizationId, appId],
    queryFn: async () => {
      if (!appId) return [];
      
      const { data } = await supabase
        .from('competitor_keywords')
        .select('competitor_app_id, keyword, competitor_rank, search_volume')
        .eq('organization_id', organizationId)
        .eq('target_app_id', appId)
        .limit(100);

      return data || [];
    },
    enabled: enabled && !!appId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // FIXED: Create truly stable dependencies to prevent infinite re-renders
  const stableDependencies = useMemo(() => {
    const currentMetadataSignature = metadata ? `${metadata.appId}-${metadata.name}-${metadata.title}` : '';
    
    return {
      hasValidData: !!metadata && !!appId && !!organizationId,
      metadataSignature: currentMetadataSignature,
      keywordDataReady: advancedKI.keywordData.length > 0 && !advancedKI.isLoading,
      analyticsReady: !!enhancedAnalytics.rankDistribution && !enhancedAnalytics.isLoading,
      competitorDataReady: !!competitorData,
      lastSignature: lastAuditMetadataRef.current
    };
  }, [
    metadata?.appId,
    metadata?.name, 
    metadata?.title,
    appId,
    organizationId,
    advancedKI.keywordData.length,
    advancedKI.isLoading,
    enhancedAnalytics.rankDistribution?.visibility_score, // Use specific property to avoid object reference issues
    enhancedAnalytics.isLoading,
    competitorData?.length
  ]);

  const generateEnhancedAudit = useCallback(async () => {
    // CRITICAL: Multiple guard checks to prevent infinite loops
    if (!stableDependencies.hasValidData) {
      console.log('🚫 [ENHANCED-AUDIT] Skipping - invalid data');
      return;
    }

    if (auditRunningRef.current || isAuditRunning) {
      console.log('🚫 [ENHANCED-AUDIT] Skipping - audit already running');
      return;
    }

    // Check if metadata changed
    if (stableDependencies.metadataSignature === stableDependencies.lastSignature) {
      console.log('🚫 [ENHANCED-AUDIT] Skipping - metadata unchanged');
      return;
    }

    // Check cooldown
    const now = Date.now();
    if (now - auditCooldownRef.current < auditCooldown) {
      console.log('🚫 [ENHANCED-AUDIT] Skipping - cooldown active');
      return;
    }

    // Check if we have enough data to proceed
    if (!stableDependencies.keywordDataReady && !stableDependencies.analyticsReady) {
      console.log('🚫 [ENHANCED-AUDIT] Skipping - waiting for data to load');
      return;
    }

    auditRunningRef.current = true;
    setIsAuditRunning(true);
    auditCooldownRef.current = now;
    lastAuditMetadataRef.current = stableDependencies.metadataSignature;

    try {
      console.log('🔍 [ENHANCED-AUDIT] Starting audit for', metadata?.name);

      // Generate semantic clusters from real keyword data
      const clusteringResult = await semanticClusteringService.generateClusters(
        advancedKI.keywordData,
        organizationId
      );

      // Analyze metadata quality
      const metadataAnalysis = await metadataScoringService.analyzeMetadata(
        metadata!,
        metadata?.competitorData || [],
        advancedKI.keywordData.map(k => k.keyword)
      );

      // Calculate enhanced scores
      const keywordScore = enhancedAnalytics.rankDistribution?.visibility_score || 
        (advancedKI.keywordData.length > 0 ? 
          Math.round(advancedKI.keywordData.reduce((sum, k) => sum + (k.rank <= 10 ? 10 : k.rank <= 50 ? 5 : 1), 0) / advancedKI.keywordData.length * 10) : 0);
      
      const metadataScore = metadataAnalysis.scores.overall;
      const competitorScore = Math.round((competitorData?.length || 0) > 0 ? 65 : 45);
      const overallScore = Math.round((keywordScore * 0.4 + metadataScore * 0.35 + competitorScore * 0.25));

      // Calculate opportunities
      const highOpportunityKeywords = advancedKI.keywordData.filter(k => k.opportunity === 'high').length;
      const metadataOpportunities = metadataAnalysis.recommendations.filter(r => r.priority === 'high').length;
      const opportunityCount = highOpportunityKeywords + metadataOpportunities;

      // Generate comprehensive recommendations
      const recommendations = [
        // Metadata recommendations
        ...metadataAnalysis.recommendations.map(rec => ({
          priority: rec.priority,
          title: rec.issue,
          description: rec.suggestion,
          category: 'metadata' as const,
          impact: rec.impact
        })),
        // Keyword recommendations
        ...(highOpportunityKeywords > 0 ? [{
          priority: 'high' as const,
          title: 'High-Opportunity Keywords Available',
          description: `${highOpportunityKeywords} keywords identified with high ranking potential`,
          category: 'keywords' as const,
          impact: 90
        }] : []),
        // Competitor recommendations
        ...(competitorData && competitorData.length > 5 ? [{
          priority: 'medium' as const,
          title: 'Competitive Keyword Gaps',
          description: `Analyze ${competitorData.length} competitor keywords for opportunities`,
          category: 'competitors' as const,
          impact: 70
        }] : [])
      ].sort((a, b) => b.impact - a.impact);

      const enhancedAuditData: EnhancedAuditData = {
        overallScore,
        metadataScore,
        keywordScore,
        competitorScore,
        opportunityCount,
        rankDistribution: enhancedAnalytics.rankDistribution,
        keywordClusters: clusteringResult.clusters,
        keywordTrends: enhancedAnalytics.keywordTrends,
        competitorAnalysis: competitorData || [],
        currentKeywords: advancedKI.keywordData.map(k => k.keyword),
        metadataAnalysis,
        recommendations
      };

      setAuditData(enhancedAuditData);
      setLastUpdated(new Date());

      console.log('✅ [ENHANCED-AUDIT] Audit completed:', {
        overallScore,
        clusters: clusteringResult.clusters.length,
        recommendations: recommendations.length
      });

    } catch (error) {
      console.error('❌ [ENHANCED-AUDIT] Failed to generate audit:', error);
    } finally {
      auditRunningRef.current = false;
      setIsAuditRunning(false);
    }
  }, [
    stableDependencies.hasValidData,
    stableDependencies.metadataSignature,
    stableDependencies.keywordDataReady,
    stableDependencies.analyticsReady,
    metadata,
    organizationId,
    advancedKI.keywordData,
    enhancedAnalytics.rankDistribution,
    enhancedAnalytics.keywordTrends,
    competitorData,
    isAuditRunning
  ]);

  // FIXED: Controlled effect with proper dependencies and guards
  useEffect(() => {
    if (!enabled || !stableDependencies.hasValidData) {
      return;
    }

    // Only trigger if data is ready and metadata changed
    if (stableDependencies.keywordDataReady || stableDependencies.analyticsReady) {
      if (stableDependencies.metadataSignature !== stableDependencies.lastSignature) {
        const timeoutId = setTimeout(() => {
          generateEnhancedAudit();
        }, 1000); // Small delay to prevent rapid-fire execution

        return () => clearTimeout(timeoutId);
      }
    }
  }, [
    enabled,
    stableDependencies.hasValidData,
    stableDependencies.keywordDataReady,
    stableDependencies.analyticsReady,
    stableDependencies.metadataSignature,
    generateEnhancedAudit
  ]);

  const refreshAudit = useCallback(async () => {
    if (!appId || auditRunningRef.current || isAuditRunning) {
      console.log('🚫 [ENHANCED-AUDIT] Refresh blocked - audit running or no appId');
      return;
    }
    
    setIsRefreshing(true);
    try {
      // Refresh underlying data
      await Promise.all([
        advancedKI.refreshKeywordData(),
        enhancedAnalytics.refreshAll?.()
      ]);
      
      // Reset signature to force regeneration
      lastAuditMetadataRef.current = '';
      auditCooldownRef.current = 0;
      
      // Regenerate audit
      await generateEnhancedAudit();
    } finally {
      setIsRefreshing(false);
    }
  }, [appId, advancedKI.refreshKeywordData, enhancedAnalytics.refreshAll, generateEnhancedAudit, isAuditRunning]);

  const generateAuditReport = useCallback(async () => {
    if (!auditData || !appId || !metadata) {
      throw new Error('No audit data available');
    }
    
    return {
      appId,
      appName: metadata.name,
      timestamp: new Date(),
      scores: {
        overall: auditData.overallScore,
        metadata: auditData.metadataScore,
        keywords: auditData.keywordScore,
        competitor: auditData.competitorScore
      },
      opportunities: auditData.opportunityCount,
      recommendations: auditData.recommendations,
      clusterAnalysis: {
        totalClusters: auditData.keywordClusters.length,
        topClusters: auditData.keywordClusters.slice(0, 3)
      },
      competitiveAnalysis: {
        trackedCompetitors: auditData.competitorAnalysis.length,
        keywordGaps: auditData.competitorAnalysis.length
      },
      data: auditData
    };
  }, [auditData, appId, metadata]);

  const isLoading = advancedKI.isLoading || enhancedAnalytics.isLoading || (!auditData && !isAuditRunning);

  return {
    auditData,
    isLoading,
    isRefreshing,
    isAuditRunning, // Expose this for external components
    lastUpdated,
    refreshAudit,
    generateAuditReport,
    // Expose individual services for advanced usage
    clusteringService: semanticClusteringService,
    metadataService: metadataScoringService
  };
};
