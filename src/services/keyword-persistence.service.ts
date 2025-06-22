
import { supabase } from '@/integrations/supabase/client';
import { KeywordRanking } from './keyword-ranking.service';

export interface KeywordRankingHistory {
  id: string;
  organizationId: string;
  appId: string;
  keyword: string;
  position: number | null;
  volume: 'Low' | 'Medium' | 'High' | null;
  trend: 'up' | 'down' | 'stable' | null;
  searchResults: number | null;
  confidence: 'estimated' | 'actual' | null;
  metadata: Record<string, any>;
  createdAt: string;
  createdBy: string | null;
}

export interface ServiceMetric {
  id: string;
  organizationId: string;
  metricName: string;
  metricValue: number;
  metricUnit: string;
  tags: Record<string, any>;
  recordedAt: string;
}

class KeywordPersistenceService {
  /**
   * Save keyword rankings to historical data
   */
  async saveRankingHistory(
    rankings: KeywordRanking[],
    organizationId: string,
    appId: string,
    userId?: string
  ): Promise<{ success: boolean; saved: number; errors: string[] }> {
    const errors: string[] = [];
    let savedCount = 0;

    try {
      const historyData = rankings.map(ranking => ({
        organization_id: organizationId,
        app_id: appId,
        keyword: ranking.keyword,
        position: ranking.position,
        volume: ranking.volume,
        trend: ranking.trend,
        search_results: ranking.searchResults,
        confidence: ranking.confidence,
        metadata: {
          priority: ranking.priority,
          type: ranking.type,
          reason: ranking.reason,
          lastChecked: ranking.lastChecked.toISOString()
        },
        created_by: userId || null
      }));

      const { data, error } = await supabase
        .from('keyword_ranking_history')
        .insert(historyData)
        .select('id');

      if (error) {
        console.error('❌ [PERSISTENCE] Failed to save ranking history:', error);
        errors.push(error.message);
      } else {
        savedCount = data?.length || 0;
        console.log(`✅ [PERSISTENCE] Saved ${savedCount} ranking records to history`);
      }

    } catch (error) {
      console.error('❌ [PERSISTENCE] Exception saving ranking history:', error);
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return {
      success: errors.length === 0,
      saved: savedCount,
      errors
    };
  }

  /**
   * Get historical ranking data for trending analysis
   */
  async getRankingHistory(
    organizationId: string,
    appId: string,
    keyword?: string,
    daysBack = 30
  ): Promise<KeywordRankingHistory[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      let query = supabase
        .from('keyword_ranking_history')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('app_id', appId)
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false });

      if (keyword) {
        query = query.eq('keyword', keyword);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [PERSISTENCE] Failed to fetch ranking history:', error);
        return [];
      }

      return data?.map(record => ({
        id: record.id,
        organizationId: record.organization_id,
        appId: record.app_id,
        keyword: record.keyword,
        position: record.position,
        volume: record.volume,
        trend: record.trend,
        searchResults: record.search_results,
        confidence: record.confidence,
        metadata: record.metadata || {},
        createdAt: record.created_at,
        createdBy: record.created_by
      })) || [];

    } catch (error) {
      console.error('❌ [PERSISTENCE] Exception fetching ranking history:', error);
      return [];
    }
  }

  /**
   * Record performance metrics
   */
  async recordMetric(
    organizationId: string,
    metricName: string,
    value: number,
    unit: string,
    tags: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('keyword_service_metrics')
        .insert({
          organization_id: organizationId,
          metric_name: metricName,
          metric_value: value,
          metric_unit: unit,
          tags
        });

      if (error) {
        console.error('❌ [PERSISTENCE] Failed to record metric:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ [PERSISTENCE] Exception recording metric:', error);
      return false;
    }
  }

  /**
   * Get performance metrics for monitoring
   */
  async getMetrics(
    organizationId: string,
    metricName?: string,
    hoursBack = 24
  ): Promise<ServiceMetric[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hoursBack);

      let query = supabase
        .from('keyword_service_metrics')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('recorded_at', cutoffDate.toISOString())
        .order('recorded_at', { ascending: false });

      if (metricName) {
        query = query.eq('metric_name', metricName);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [PERSISTENCE] Failed to fetch metrics:', error);
        return [];
      }

      return data?.map(record => ({
        id: record.id,
        organizationId: record.organization_id,
        metricName: record.metric_name,
        metricValue: record.metric_value,
        metricUnit: record.metric_unit,
        tags: record.tags || {},
        recordedAt: record.recorded_at
      })) || [];

    } catch (error) {
      console.error('❌ [PERSISTENCE] Exception fetching metrics:', error);
      return [];
    }
  }

  /**
   * Calculate trend for a keyword based on historical data
   */
  async calculateKeywordTrend(
    organizationId: string,
    appId: string,
    keyword: string
  ): Promise<'up' | 'down' | 'stable'> {
    try {
      const history = await this.getRankingHistory(organizationId, appId, keyword, 7);
      
      if (history.length < 2) {
        return 'stable';
      }

      // Sort by date and compare recent vs older positions
      const sorted = history.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const recent = sorted.slice(-3); // Last 3 records
      const older = sorted.slice(0, 3); // First 3 records

      const recentAvg = recent.reduce((sum, r) => sum + (r.position || 0), 0) / recent.length;
      const olderAvg = older.reduce((sum, r) => sum + (r.position || 0), 0) / older.length;

      // Lower position number = better ranking
      if (recentAvg < olderAvg - 2) return 'up';
      if (recentAvg > olderAvg + 2) return 'down';
      return 'stable';

    } catch (error) {
      console.error('❌ [PERSISTENCE] Exception calculating trend:', error);
      return 'stable';
    }
  }
}

export const keywordPersistenceService = new KeywordPersistenceService();
