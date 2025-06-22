
import { supabase } from '@/integrations/supabase/client';

export interface RankDistribution {
  top_1: number;
  top_3: number;
  top_5: number;
  top_10: number;
  top_20: number;
  top_50: number;
  top_100: number;
  total_tracked: number;
  avg_rank: number;
  visibility_score: number;
}

export interface KeywordTrend {
  keyword: string;
  current_rank: number;
  previous_rank: number;
  rank_change: number;
  current_volume: number;
  volume_change_pct: number;
  trend_direction: 'up' | 'down' | 'stable' | 'new';
}

export interface KeywordSnapshot {
  id: string;
  keyword: string;
  rank_position: number | null;
  search_volume: number | null;
  difficulty_score: number | null;
  volume_trend: 'up' | 'down' | 'stable' | null;
  rank_change: number | null;
  volume_change: number | null;
  snapshot_date: string;
  data_source: string;
}

export interface KeywordPool {
  id: string;
  pool_name: string;
  pool_type: 'category' | 'competitor' | 'trending' | 'custom';
  keywords: string[];
  metadata: Record<string, any>;
  total_keywords: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionJob {
  id: string;
  app_id: string;
  job_type: 'full_refresh' | 'incremental' | 'competitor_analysis';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: { current: number; total: number };
  keywords_collected: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export interface UsageStats {
  month_year: string;
  keywords_processed: number;
  api_calls_made: number;
  storage_used_mb: number;
  tier_limit: number;
  overage_keywords: number;
}

// Type guard functions for runtime validation
const isValidTrendDirection = (value: string): value is 'up' | 'down' | 'stable' | 'new' => {
  return ['up', 'down', 'stable', 'new'].includes(value);
};

const isValidPoolType = (value: string): value is 'category' | 'competitor' | 'trending' | 'custom' => {
  return ['category', 'competitor', 'trending', 'custom'].includes(value);
};

const isValidJobType = (value: string): value is 'full_refresh' | 'incremental' | 'competitor_analysis' => {
  return ['full_refresh', 'incremental', 'competitor_analysis'].includes(value);
};

const isValidJobStatus = (value: string): value is 'pending' | 'running' | 'completed' | 'failed' => {
  return ['pending', 'running', 'completed', 'failed'].includes(value);
};

const isValidVolumeTrend = (value: string): value is 'up' | 'down' | 'stable' => {
  return ['up', 'down', 'stable'].includes(value);
};

class EnhancedKeywordAnalyticsService {
  /**
   * Get rank distribution analysis for an app
   */
  async getRankDistribution(
    organizationId: string, 
    appId: string, 
    analysisDate?: string
  ): Promise<RankDistribution | null> {
    try {
      console.log('🎯 [ANALYTICS] Fetching rank distribution for app:', appId);
      
      const { data, error } = await supabase.rpc('calculate_rank_distribution', {
        p_organization_id: organizationId,
        p_app_id: appId,
        p_analysis_date: analysisDate || new Date().toISOString().split('T')[0]
      });

      if (error) {
        console.error('❌ [ANALYTICS] Rank distribution error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('📊 [ANALYTICS] No rank distribution data found');
        return null;
      }

      console.log('✅ [ANALYTICS] Rank distribution loaded:', data[0]);
      return data[0] as RankDistribution;
    } catch (error) {
      console.error('❌ [ANALYTICS] Exception in getRankDistribution:', error);
      throw error;
    }
  }

  /**
   * Get keyword trends analysis
   */
  async getKeywordTrends(
    organizationId: string,
    appId: string,
    daysBack = 30
  ): Promise<KeywordTrend[]> {
    try {
      console.log('📈 [ANALYTICS] Fetching keyword trends for app:', appId);
      
      const { data, error } = await supabase.rpc('get_keyword_trends', {
        p_organization_id: organizationId,
        p_app_id: appId,
        p_days_back: daysBack
      });

      if (error) {
        console.error('❌ [ANALYTICS] Keyword trends error:', error);
        throw error;
      }

      // Transform and validate the data
      const trends: KeywordTrend[] = (data || []).map((row: any) => ({
        keyword: row.keyword,
        current_rank: row.current_rank,
        previous_rank: row.previous_rank,
        rank_change: row.rank_change,
        current_volume: row.current_volume,
        volume_change_pct: row.volume_change_pct,
        trend_direction: isValidTrendDirection(row.trend_direction) ? row.trend_direction : 'stable'
      }));

      console.log('✅ [ANALYTICS] Keyword trends loaded:', trends.length);
      return trends;
    } catch (error) {
      console.error('❌ [ANALYTICS] Exception in getKeywordTrends:', error);
      return [];
    }
  }

  /**
   * Save keyword snapshots for historical analysis
   */
  async saveKeywordSnapshots(
    organizationId: string,
    appId: string,
    keywords: Array<{
      keyword: string;
      rank_position?: number;
      search_volume?: number;
      difficulty_score?: number;
      volume_trend?: 'up' | 'down' | 'stable';
    }>
  ): Promise<{ success: boolean; saved: number }> {
    try {
      console.log('💾 [ANALYTICS] Saving keyword snapshots for app:', appId);
      
      const snapshots = keywords.map(kw => ({
        organization_id: organizationId,
        app_id: appId,
        keyword: kw.keyword,
        rank_position: kw.rank_position || null,
        search_volume: kw.search_volume || null,
        difficulty_score: kw.difficulty_score || null,
        volume_trend: kw.volume_trend || null,
        snapshot_date: new Date().toISOString().split('T')[0],
        data_source: 'system'
      }));

      const { data, error } = await supabase
        .from('keyword_ranking_snapshots')
        .insert(snapshots)
        .select('id');

      if (error) {
        console.error('❌ [ANALYTICS] Snapshot save error:', error);
        throw error;
      }

      const savedCount = data?.length || 0;
      console.log('✅ [ANALYTICS] Saved snapshots:', savedCount);

      // Update usage tracking
      await this.updateUsageTracking(organizationId, keywords.length, 1);

      return { success: true, saved: savedCount };
    } catch (error) {
      console.error('❌ [ANALYTICS] Exception in saveKeywordSnapshots:', error);
      return { success: false, saved: 0 };
    }
  }

  /**
   * Get keyword pools for organization
   */
  async getKeywordPools(
    organizationId: string,
    poolType?: 'category' | 'competitor' | 'trending' | 'custom'
  ): Promise<KeywordPool[]> {
    try {
      console.log('🎯 [ANALYTICS] Fetching keyword pools for org:', organizationId);
      
      let query = supabase
        .from('keyword_pools')
        .select('*')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false });

      if (poolType) {
        query = query.eq('pool_type', poolType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [ANALYTICS] Keyword pools error:', error);
        throw error;
      }

      // Transform and validate the data
      const pools: KeywordPool[] = (data || []).map((row: any) => ({
        id: row.id,
        pool_name: row.pool_name,
        pool_type: isValidPoolType(row.pool_type) ? row.pool_type : 'custom',
        keywords: row.keywords || [],
        metadata: (row.metadata as Record<string, any>) || {},
        total_keywords: row.total_keywords || 0,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      console.log('✅ [ANALYTICS] Keyword pools loaded:', pools.length);
      return pools;
    } catch (error) {
      console.error('❌ [ANALYTICS] Exception in getKeywordPools:', error);
      return [];
    }
  }

  /**
   * Create or update keyword pool
   */
  async saveKeywordPool(
    organizationId: string,
    poolName: string,
    poolType: 'category' | 'competitor' | 'trending' | 'custom',
    keywords: string[],
    metadata: Record<string, any> = {}
  ): Promise<KeywordPool | null> {
    try {
      console.log('💾 [ANALYTICS] Saving keyword pool:', poolName);
      
      const poolData = {
        organization_id: organizationId,
        pool_name: poolName,
        pool_type: poolType,
        keywords,
        metadata,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('keyword_pools')
        .upsert(poolData, { 
          onConflict: 'organization_id,pool_name',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [ANALYTICS] Keyword pool save error:', error);
        throw error;
      }

      console.log('✅ [ANALYTICS] Keyword pool saved:', data.id);
      return data as KeywordPool;
    } catch (error) {
      console.error('❌ [ANALYTICS] Exception in saveKeywordPool:', error);
      return null;
    }
  }

  /**
   * Create collection job for background processing
   */
  async createCollectionJob(
    organizationId: string,
    appId: string,
    jobType: 'full_refresh' | 'incremental' | 'competitor_analysis',
    createdBy?: string
  ): Promise<CollectionJob | null> {
    try {
      console.log('🚀 [ANALYTICS] Creating collection job for app:', appId);
      
      const jobData = {
        organization_id: organizationId,
        app_id: appId,
        job_type: jobType,
        status: 'pending' as const,
        progress: { current: 0, total: 0 },
        created_by: createdBy || null
      };

      const { data, error } = await supabase
        .from('keyword_collection_jobs')
        .insert(jobData)
        .select()
        .single();

      if (error) {
        console.error('❌ [ANALYTICS] Collection job creation error:', error);
        throw error;
      }

      // Transform and validate the response
      const job: CollectionJob = {
        id: data.id,
        app_id: data.app_id,
        job_type: isValidJobType(data.job_type) ? data.job_type : 'full_refresh',
        status: isValidJobStatus(data.status) ? data.status : 'pending',
        progress: (data.progress as { current: number; total: number }) || { current: 0, total: 0 },
        keywords_collected: data.keywords_collected || 0,
        started_at: data.started_at,
        completed_at: data.completed_at,
        error_message: data.error_message
      };

      console.log('✅ [ANALYTICS] Collection job created:', job.id);
      return job;
    } catch (error) {
      console.error('❌ [ANALYTICS] Exception in createCollectionJob:', error);
      return null;
    }
  }

  /**
   * Get collection jobs for organization
   */
  async getCollectionJobs(
    organizationId: string,
    status?: 'pending' | 'running' | 'completed' | 'failed'
  ): Promise<CollectionJob[]> {
    try {
      console.log('📋 [ANALYTICS] Fetching collection jobs for org:', organizationId);
      
      let query = supabase
        .from('keyword_collection_jobs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [ANALYTICS] Collection jobs error:', error);
        throw error;
      }

      // Transform and validate the data
      const jobs: CollectionJob[] = (data || []).map((row: any) => ({
        id: row.id,
        app_id: row.app_id,
        job_type: isValidJobType(row.job_type) ? row.job_type : 'full_refresh',
        status: isValidJobStatus(row.status) ? row.status : 'pending',
        progress: (row.progress as { current: number; total: number }) || { current: 0, total: 0 },
        keywords_collected: row.keywords_collected || 0,
        started_at: row.started_at,
        completed_at: row.completed_at,
        error_message: row.error_message
      }));

      console.log('✅ [ANALYTICS] Collection jobs loaded:', jobs.length);
      return jobs;
    } catch (error) {
      console.error('❌ [ANALYTICS] Exception in getCollectionJobs:', error);
      return [];
    }
  }

  /**
   * Update organization keyword usage tracking
   */
  async updateUsageTracking(
    organizationId: string,
    keywordsProcessed = 1,
    apiCalls = 1
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('update_keyword_usage', {
        p_organization_id: organizationId,
        p_keywords_processed: keywordsProcessed,
        p_api_calls: apiCalls
      });

      if (error) {
        console.error('❌ [ANALYTICS] Usage tracking error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ [ANALYTICS] Exception in updateUsageTracking:', error);
      return false;
    }
  }

  /**
   * Get organization usage statistics
   */
  async getUsageStats(organizationId: string): Promise<UsageStats[]> {
    try {
      console.log('📊 [ANALYTICS] Fetching usage stats for org:', organizationId);
      
      const { data, error } = await supabase
        .from('organization_keyword_usage')
        .select('*')
        .eq('organization_id', organizationId)
        .order('month_year', { ascending: false })
        .limit(12); // Last 12 months

      if (error) {
        console.error('❌ [ANALYTICS] Usage stats error:', error);
        throw error;
      }

      console.log('✅ [ANALYTICS] Usage stats loaded:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ [ANALYTICS] Exception in getUsageStats:', error);
      return [];
    }
  }

  /**
   * Get historical snapshots for a keyword
   */
  async getKeywordHistory(
    organizationId: string,
    appId: string,
    keyword: string,
    daysBack = 90
  ): Promise<KeywordSnapshot[]> {
    try {
      console.log('📈 [ANALYTICS] Fetching keyword history for:', keyword);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const { data, error } = await supabase
        .from('keyword_ranking_snapshots')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('app_id', appId)
        .eq('keyword', keyword)
        .gte('snapshot_date', cutoffDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      if (error) {
        console.error('❌ [ANALYTICS] Keyword history error:', error);
        throw error;
      }

      // Transform and validate the data
      const snapshots: KeywordSnapshot[] = (data || []).map((row: any) => ({
        id: row.id,
        keyword: row.keyword,
        rank_position: row.rank_position,
        search_volume: row.search_volume,
        difficulty_score: row.difficulty_score,
        volume_trend: row.volume_trend && isValidVolumeTrend(row.volume_trend) ? row.volume_trend : null,
        rank_change: row.rank_change,
        volume_change: row.volume_change,
        snapshot_date: row.snapshot_date,
        data_source: row.data_source
      }));

      console.log('✅ [ANALYTICS] Keyword history loaded:', snapshots.length);
      return snapshots;
    } catch (error) {
      console.error('❌ [ANALYTICS] Exception in getKeywordHistory:', error);
      return [];
    }
  }
}

export const enhancedKeywordAnalyticsService = new EnhancedKeywordAnalyticsService();
