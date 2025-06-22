import { supabase } from '@/integrations/supabase/client';
import { securityService } from './security.service';

export interface KeywordVolumeHistory {
  id: string;
  keyword: string;
  country: string;
  searchVolume: number | null;
  searchVolumeTrend: 'up' | 'down' | 'stable' | null;
  popularityScore: number | null;
  recordedDate: string;
  dataSource: string;
}

export interface CompetitorKeyword {
  id: string;
  targetAppId: string;
  competitorAppId: string;
  keyword: string;
  targetRank: number | null;
  competitorRank: number | null;
  keywordDifficulty: number | null;
  searchVolume: number | null;
  gapOpportunity: 'high' | 'medium' | 'low' | 'none' | null;
  analyzedAt: string;
}

export interface KeywordDifficultyScore {
  id: string;
  keyword: string;
  country: string;
  difficultyScore: number;
  competitionLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high' | null;
  topAppsStrength: number | null;
  searchVolume: number | null;
  calculationMethod: string;
  calculatedAt: string;
  expiresAt: string;
}

export interface KeywordCluster {
  id: string;
  clusterName: string;
  primaryKeyword: string;
  relatedKeywords: string[];
  clusterType: 'semantic' | 'category' | 'intent' | 'competitor' | null;
  totalSearchVolume: number | null;
  avgDifficulty: number | null;
  opportunityScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface KeywordGapAnalysis {
  keyword: string;
  targetRank: number | null;
  bestCompetitorRank: number | null;
  gapOpportunity: string;
  searchVolume: number | null;
  difficultyScore: number | null;
}

class CompetitorKeywordAnalysisService {
  /**
   * Get current user's organization ID from auth context
   */
  private async getCurrentOrganizationId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      return profile?.organization_id || null;
    } catch (error) {
      console.error('❌ [COMPETITOR-ANALYSIS] Failed to get organization ID:', error);
      return null;
    }
  }

  /**
   * Get keyword volume trends for analysis
   */
  async getKeywordVolumeTrends(
    organizationId: string,
    keyword: string,
    daysBack: number = 30
  ): Promise<KeywordVolumeHistory[]> {
    try {
      const { data, error } = await supabase.rpc('get_keyword_volume_trends', {
        p_organization_id: organizationId,
        p_keyword: keyword,
        p_days_back: daysBack
      });

      if (error) {
        console.error('❌ [COMPETITOR-ANALYSIS] Failed to fetch volume trends:', error);
        return [];
      }

      return data?.map(this.mapVolumeHistoryFromDb) || [];
    } catch (error) {
      console.error('❌ [COMPETITOR-ANALYSIS] Exception fetching volume trends:', error);
      return [];
    }
  }

  /**
   * Get keyword gap analysis for a target app
   */
  async getKeywordGapAnalysis(
    organizationId: string,
    targetAppId: string,
    limit: number = 50
  ): Promise<KeywordGapAnalysis[]> {
    try {
      const { data, error } = await supabase.rpc('get_keyword_gap_analysis', {
        p_organization_id: organizationId,
        p_target_app_id: targetAppId,
        p_limit: limit
      });

      if (error) {
        console.error('❌ [COMPETITOR-ANALYSIS] Failed to fetch gap analysis:', error);
        return [];
      }

      // Map snake_case database response to camelCase interface
      return data?.map((item: any) => ({
        keyword: item.keyword,
        targetRank: item.target_rank,
        bestCompetitorRank: item.best_competitor_rank,
        gapOpportunity: item.gap_opportunity,
        searchVolume: item.search_volume,
        difficultyScore: item.difficulty_score
      })) || [];
    } catch (error) {
      console.error('❌ [COMPETITOR-ANALYSIS] Exception fetching gap analysis:', error);
      return [];
    }
  }

  /**
   * Store keyword volume history
   */
  async recordKeywordVolume(
    organizationId: string,
    keyword: string,
    searchVolume: number,
    trend: 'up' | 'down' | 'stable',
    popularityScore?: number,
    country: string = 'US'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('keyword_volume_history')
        .insert({
          organization_id: organizationId,
          keyword,
          country,
          search_volume: searchVolume,
          search_volume_trend: trend,
          popularity_score: popularityScore,
          data_source: 'estimated'
        });

      if (error) {
        console.error('❌ [COMPETITOR-ANALYSIS] Failed to record volume:', error);
        return false;
      }

      // Log audit entry
      await securityService.logAuditEntry({
        organizationId,
        userId: 'system',
        action: 'keyword_volume_recorded',
        resourceType: 'keyword_analysis',
        resourceId: keyword,
        details: { keyword, searchVolume, trend, country },
        ipAddress: '127.0.0.1',
        userAgent: 'CompetitorKeywordAnalysisService'
      });

      return true;
    } catch (error) {
      console.error('❌ [COMPETITOR-ANALYSIS] Exception recording volume:', error);
      return false;
    }
  }

  /**
   * Calculate and store keyword difficulty
   */
  async calculateKeywordDifficulty(
    organizationId: string,
    keyword: string,
    searchVolume: number,
    topRankingApps: string[],
    country: string = 'US'
  ): Promise<KeywordDifficultyScore | null> {
    try {
      // Algorithm: difficulty based on search volume and competition
      const volumeScore = Math.min(searchVolume / 10000, 1) * 4; // 0-4 points
      const competitionScore = topRankingApps.length / 10 * 3; // 0-3 points
      const randomFactor = Math.random() * 3; // 0-3 points for variability
      
      const difficultyScore = Math.min(volumeScore + competitionScore + randomFactor, 10);
      
      let competitionLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
      if (difficultyScore <= 2) competitionLevel = 'very_low';
      else if (difficultyScore <= 4) competitionLevel = 'low';
      else if (difficultyScore <= 6) competitionLevel = 'medium';
      else if (difficultyScore <= 8) competitionLevel = 'high';
      else competitionLevel = 'very_high';

      const { data, error } = await supabase
        .from('keyword_difficulty_scores')
        .insert({
          organization_id: organizationId,
          keyword,
          country,
          difficulty_score: Math.round(difficultyScore * 10) / 10,
          competition_level: competitionLevel,
          top_apps_strength: topRankingApps.length / 10,
          search_volume: searchVolume,
          calculation_method: 'algorithmic'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [COMPETITOR-ANALYSIS] Failed to store difficulty score:', error);
        return null;
      }

      return this.mapDifficultyScoreFromDb(data);
    } catch (error) {
      console.error('❌ [COMPETITOR-ANALYSIS] Exception calculating difficulty:', error);
      return null;
    }
  }

  /**
   * Get cached difficulty scores
   */
  async getDifficultyScores(
    organizationId: string,
    keywords: string[],
    country: string = 'US'
  ): Promise<KeywordDifficultyScore[]> {
    try {
      const { data, error } = await supabase
        .from('keyword_difficulty_scores')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('country', country)
        .in('keyword', keywords)
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.error('❌ [COMPETITOR-ANALYSIS] Failed to fetch difficulty scores:', error);
        return [];
      }

      return data?.map(this.mapDifficultyScoreFromDb) || [];
    } catch (error) {
      console.error('❌ [COMPETITOR-ANALYSIS] Exception fetching difficulty scores:', error);
      return [];
    }
  }

  /**
   * Create keyword cluster
   */
  async createKeywordCluster(
    organizationId: string,
    clusterName: string,
    primaryKeyword: string,
    relatedKeywords: string[],
    clusterType: 'semantic' | 'category' | 'intent' | 'competitor' = 'semantic'
  ): Promise<KeywordCluster | null> {
    try {
      const { data, error } = await supabase
        .from('keyword_clusters')
        .insert({
          organization_id: organizationId,
          cluster_name: clusterName,
          primary_keyword: primaryKeyword,
          related_keywords: relatedKeywords,
          cluster_type: clusterType,
          opportunity_score: Math.random() * 0.8 + 0.1 // 0.1-0.9 for demo
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [COMPETITOR-ANALYSIS] Failed to create cluster:', error);
        return null;
      }

      return this.mapClusterFromDb(data);
    } catch (error) {
      console.error('❌ [COMPETITOR-ANALYSIS] Exception creating cluster:', error);
      return null;
    }
  }

  /**
   * Get keyword clusters
   */
  async getKeywordClusters(organizationId: string): Promise<KeywordCluster[]> {
    try {
      const { data, error } = await supabase
        .from('keyword_clusters')
        .select('*')
        .eq('organization_id', organizationId)
        .order('opportunity_score', { ascending: false });

      if (error) {
        console.error('❌ [COMPETITOR-ANALYSIS] Failed to fetch clusters:', error);
        return [];
      }

      return data?.map(this.mapClusterFromDb) || [];
    } catch (error) {
      console.error('❌ [COMPETITOR-ANALYSIS] Exception fetching clusters:', error);
      return [];
    }
  }

  // Database mapping functions
  private mapVolumeHistoryFromDb(dbRecord: any): KeywordVolumeHistory {
    return {
      id: dbRecord.id,
      keyword: dbRecord.keyword,
      country: dbRecord.country,
      searchVolume: dbRecord.search_volume,
      searchVolumeTrend: dbRecord.search_volume_trend,
      popularityScore: dbRecord.popularity_score,
      recordedDate: dbRecord.recorded_date,
      dataSource: dbRecord.data_source
    };
  }

  private mapDifficultyScoreFromDb(dbRecord: any): KeywordDifficultyScore {
    return {
      id: dbRecord.id,
      keyword: dbRecord.keyword,
      country: dbRecord.country,
      difficultyScore: dbRecord.difficulty_score,
      competitionLevel: dbRecord.competition_level,
      topAppsStrength: dbRecord.top_apps_strength,
      searchVolume: dbRecord.search_volume,
      calculationMethod: dbRecord.calculation_method,
      calculatedAt: dbRecord.calculated_at,
      expiresAt: dbRecord.expires_at
    };
  }

  private mapClusterFromDb(dbRecord: any): KeywordCluster {
    return {
      id: dbRecord.id,
      clusterName: dbRecord.cluster_name,
      primaryKeyword: dbRecord.primary_keyword,
      relatedKeywords: dbRecord.related_keywords,
      clusterType: dbRecord.cluster_type,
      totalSearchVolume: dbRecord.total_search_volume,
      avgDifficulty: dbRecord.avg_difficulty,
      opportunityScore: dbRecord.opportunity_score,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at
    };
  }

  /**
   * Get demo competitor keywords for a given app
   */
  async getDemoCompetitorKeywords(
    organizationId: string,
    targetAppId: string
  ): Promise<CompetitorKeyword[]> {
    try {
      // First try to get real data
      const { data, error } = await supabase
        .from('competitor_keywords')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('target_app_id', targetAppId)
        .limit(20);

      if (data && data.length > 0) {
        return data.map(this.mapCompetitorKeywordFromDb);
      }

      // If no real data, generate demo data
      console.log('📊 [COMPETITOR-ANALYSIS] Generating demo competitor keywords');
      return this.generateDemoCompetitorKeywords(organizationId, targetAppId);
    } catch (error) {
      console.error('❌ [COMPETITOR-ANALYSIS] Exception fetching competitor keywords:', error);
      return this.generateDemoCompetitorKeywords(organizationId, targetAppId);
    }
  }

  /**
   * Generate demo competitor keyword data
   */
  private generateDemoCompetitorKeywords(
    organizationId: string,
    targetAppId: string
  ): CompetitorKeyword[] {
    const demoKeywords = [
      'fitness app', 'workout tracker', 'exercise planner', 'health monitor',
      'diet tracker', 'calorie counter', 'meditation app', 'yoga practice',
      'running tracker', 'gym workout', 'weight loss', 'muscle building',
      'step counter', 'heart rate monitor', 'sleep tracker', 'wellness app'
    ];

    return demoKeywords.slice(0, 12).map((keyword, index) => ({
      id: `demo-${index}`,
      targetAppId,
      competitorAppId: `competitor-${index % 3}`,
      keyword,
      targetRank: Math.floor(Math.random() * 100) + 1,
      competitorRank: Math.floor(Math.random() * 50) + 1,
      keywordDifficulty: Math.round((Math.random() * 8 + 1) * 10) / 10,
      searchVolume: Math.floor(Math.random() * 50000) + 1000,
      gapOpportunity: (['high', 'medium', 'low'] as const)[Math.floor(Math.random() * 3)],
      analyzedAt: new Date().toISOString()
    }));
  }

  /**
   * Map competitor keyword from database
   */
  private mapCompetitorKeywordFromDb(dbRecord: any): CompetitorKeyword {
    return {
      id: dbRecord.id,
      targetAppId: dbRecord.target_app_id,
      competitorAppId: dbRecord.competitor_app_id,
      keyword: dbRecord.keyword,
      targetRank: dbRecord.target_rank,
      competitorRank: dbRecord.competitor_rank,
      keywordDifficulty: dbRecord.keyword_difficulty,
      searchVolume: dbRecord.search_volume,
      gapOpportunity: dbRecord.gap_opportunity,
      analyzedAt: dbRecord.analyzed_at
    };
  }
}

export const competitorKeywordAnalysisService = new CompetitorKeywordAnalysisService();
