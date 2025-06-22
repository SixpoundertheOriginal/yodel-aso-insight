
-- Phase 1: Enhanced Database Schema for Keyword Intelligence

-- Create keyword pools table for storing large sets of keywords by category/source
CREATE TABLE public.keyword_pools (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  pool_name text NOT NULL,
  pool_type varchar(50) CHECK (pool_type IN ('category', 'competitor', 'trending', 'custom')),
  keywords text[] NOT NULL,
  metadata jsonb DEFAULT '{}',
  total_keywords integer GENERATED ALWAYS AS (array_length(keywords, 1)) STORED,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create historical keyword rankings for trend analysis
CREATE TABLE public.keyword_ranking_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  app_id text NOT NULL,
  keyword text NOT NULL,
  rank_position integer,
  search_volume integer,
  difficulty_score numeric(3,1),
  volume_trend varchar(10) CHECK (volume_trend IN ('up', 'down', 'stable')),
  rank_change integer, -- compared to previous snapshot
  volume_change numeric(5,2), -- percentage change
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  data_source varchar(50) DEFAULT 'system',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create rank distribution analysis table
CREATE TABLE public.keyword_rank_distributions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  app_id text NOT NULL,
  analysis_date date NOT NULL DEFAULT CURRENT_DATE,
  top_1_keywords integer DEFAULT 0,
  top_3_keywords integer DEFAULT 0,
  top_5_keywords integer DEFAULT 0,
  top_10_keywords integer DEFAULT 0,
  top_20_keywords integer DEFAULT 0,
  top_50_keywords integer DEFAULT 0,
  top_100_keywords integer DEFAULT 0,
  total_keywords integer DEFAULT 0,
  avg_rank numeric(5,2),
  median_rank numeric(5,2),
  visibility_score numeric(5,2), -- calculated metric
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create keyword collection jobs for background processing
CREATE TABLE public.keyword_collection_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  app_id text NOT NULL,
  job_type varchar(50) CHECK (job_type IN ('full_refresh', 'incremental', 'competitor_analysis')),
  status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress jsonb DEFAULT '{"current": 0, "total": 0}',
  keywords_collected integer DEFAULT 0,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  error_message text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create organization keyword usage tracking for SaaS billing
CREATE TABLE public.organization_keyword_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  month_year date NOT NULL, -- first day of month
  keywords_processed integer DEFAULT 0,
  api_calls_made integer DEFAULT 0,
  storage_used_mb numeric(10,2) DEFAULT 0,
  tier_limit integer DEFAULT 1000,
  overage_keywords integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organization_id, month_year)
);

-- Add indexes for performance
CREATE INDEX idx_keyword_pools_org_type ON public.keyword_pools(organization_id, pool_type);
CREATE INDEX idx_keyword_ranking_snapshots_app_date ON public.keyword_ranking_snapshots(app_id, snapshot_date DESC);
CREATE INDEX idx_keyword_ranking_snapshots_keyword ON public.keyword_ranking_snapshots(keyword, app_id);
CREATE INDEX idx_keyword_rank_distributions_app_date ON public.keyword_rank_distributions(app_id, analysis_date DESC);
CREATE INDEX idx_keyword_collection_jobs_org_status ON public.keyword_collection_jobs(organization_id, status);
CREATE INDEX idx_organization_keyword_usage_org_month ON public.organization_keyword_usage(organization_id, month_year DESC);

-- Enable RLS on all new tables
ALTER TABLE public.keyword_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_ranking_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_rank_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_collection_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_keyword_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for keyword_pools
CREATE POLICY "Users can manage keyword pools for their organization" 
  ON public.keyword_pools 
  FOR ALL
  USING (organization_id = get_current_user_organization_id())
  WITH CHECK (organization_id = get_current_user_organization_id());

-- RLS Policies for keyword_ranking_snapshots
CREATE POLICY "Users can manage keyword snapshots for their organization" 
  ON public.keyword_ranking_snapshots 
  FOR ALL
  USING (organization_id = get_current_user_organization_id())
  WITH CHECK (organization_id = get_current_user_organization_id());

-- RLS Policies for keyword_rank_distributions
CREATE POLICY "Users can view rank distributions for their organization" 
  ON public.keyword_rank_distributions 
  FOR SELECT
  USING (organization_id = get_current_user_organization_id());

CREATE POLICY "System can insert rank distributions" 
  ON public.keyword_rank_distributions 
  FOR INSERT
  WITH CHECK (organization_id = get_current_user_organization_id());

-- RLS Policies for keyword_collection_jobs
CREATE POLICY "Users can manage collection jobs for their organization" 
  ON public.keyword_collection_jobs 
  FOR ALL
  USING (organization_id = get_current_user_organization_id())
  WITH CHECK (organization_id = get_current_user_organization_id());

-- RLS Policies for organization_keyword_usage
CREATE POLICY "Users can view usage for their organization" 
  ON public.organization_keyword_usage 
  FOR SELECT
  USING (organization_id = get_current_user_organization_id());

CREATE POLICY "System can manage usage tracking" 
  ON public.organization_keyword_usage 
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to calculate rank distribution for an app
CREATE OR REPLACE FUNCTION public.calculate_rank_distribution(
  p_organization_id uuid,
  p_app_id text,
  p_analysis_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  top_1 integer,
  top_3 integer,
  top_5 integer,
  top_10 integer,
  top_20 integer,
  top_50 integer,
  top_100 integer,
  total_tracked integer,
  avg_rank numeric,
  visibility_score numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  v_top_1 integer := 0;
  v_top_3 integer := 0;
  v_top_5 integer := 0;
  v_top_10 integer := 0;
  v_top_20 integer := 0;
  v_top_50 integer := 0;
  v_top_100 integer := 0;
  v_total integer := 0;
  v_avg_rank numeric := 0;
  v_visibility numeric := 0;
BEGIN
  -- Get latest snapshot data for the app
  WITH latest_rankings AS (
    SELECT DISTINCT ON (keyword) 
      keyword, 
      rank_position,
      search_volume
    FROM public.keyword_ranking_snapshots
    WHERE organization_id = p_organization_id
      AND app_id = p_app_id
      AND snapshot_date <= p_analysis_date
      AND rank_position IS NOT NULL
    ORDER BY keyword, snapshot_date DESC
  )
  SELECT 
    COUNT(*) FILTER (WHERE rank_position <= 1),
    COUNT(*) FILTER (WHERE rank_position <= 3),
    COUNT(*) FILTER (WHERE rank_position <= 5),
    COUNT(*) FILTER (WHERE rank_position <= 10),
    COUNT(*) FILTER (WHERE rank_position <= 20),
    COUNT(*) FILTER (WHERE rank_position <= 50),
    COUNT(*) FILTER (WHERE rank_position <= 100),
    COUNT(*),
    AVG(rank_position)::numeric(5,2),
    -- Visibility score: weighted average based on rank position and volume
    (SUM(
      CASE 
        WHEN rank_position <= 3 THEN (COALESCE(search_volume, 100) * 1.0)
        WHEN rank_position <= 10 THEN (COALESCE(search_volume, 100) * 0.7)
        WHEN rank_position <= 20 THEN (COALESCE(search_volume, 100) * 0.4)
        WHEN rank_position <= 50 THEN (COALESCE(search_volume, 100) * 0.2)
        ELSE (COALESCE(search_volume, 100) * 0.1)
      END
    ) / NULLIF(SUM(COALESCE(search_volume, 100)), 0) * 100)::numeric(5,2)
  INTO v_top_1, v_top_3, v_top_5, v_top_10, v_top_20, v_top_50, v_top_100, v_total, v_avg_rank, v_visibility
  FROM latest_rankings;

  RETURN QUERY SELECT v_top_1, v_top_3, v_top_5, v_top_10, v_top_20, v_top_50, v_top_100, v_total, v_avg_rank, COALESCE(v_visibility, 0);
END;
$$;

-- Function to get keyword trend analysis
CREATE OR REPLACE FUNCTION public.get_keyword_trends(
  p_organization_id uuid,
  p_app_id text,
  p_days_back integer DEFAULT 30
)
RETURNS TABLE (
  keyword text,
  current_rank integer,
  previous_rank integer,
  rank_change integer,
  current_volume integer,
  volume_change_pct numeric,
  trend_direction text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_snapshots AS (
    SELECT 
      k.keyword,
      k.rank_position,
      k.search_volume,
      k.snapshot_date,
      ROW_NUMBER() OVER (PARTITION BY k.keyword ORDER BY k.snapshot_date DESC) as rn
    FROM public.keyword_ranking_snapshots k
    WHERE k.organization_id = p_organization_id
      AND k.app_id = p_app_id
      AND k.snapshot_date >= CURRENT_DATE - p_days_back
  ),
  current_data AS (
    SELECT keyword, rank_position as current_rank, search_volume as current_volume
    FROM ranked_snapshots WHERE rn = 1
  ),
  previous_data AS (
    SELECT keyword, rank_position as previous_rank, search_volume as previous_volume
    FROM ranked_snapshots WHERE rn = 2
  )
  SELECT 
    c.keyword,
    c.current_rank,
    p.previous_rank,
    COALESCE(p.previous_rank - c.current_rank, 0) as rank_change,
    c.current_volume,
    CASE 
      WHEN p.previous_volume > 0 THEN 
        ((c.current_volume::numeric - p.previous_volume::numeric) / p.previous_volume::numeric * 100)::numeric(5,2)
      ELSE 0::numeric(5,2)
    END as volume_change_pct,
    CASE 
      WHEN p.previous_rank IS NULL THEN 'new'::text
      WHEN p.previous_rank > c.current_rank THEN 'up'::text
      WHEN p.previous_rank < c.current_rank THEN 'down'::text
      ELSE 'stable'::text
    END as trend_direction
  FROM current_data c
  LEFT JOIN previous_data p ON c.keyword = p.keyword
  ORDER BY 
    CASE WHEN p.previous_rank IS NULL THEN 0 ELSE 1 END,
    ABS(COALESCE(p.previous_rank - c.current_rank, 0)) DESC;
END;
$$;

-- Function to update organization keyword usage
CREATE OR REPLACE FUNCTION public.update_keyword_usage(
  p_organization_id uuid,
  p_keywords_processed integer DEFAULT 1,
  p_api_calls integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_month date := date_trunc('month', CURRENT_DATE)::date;
BEGIN
  INSERT INTO public.organization_keyword_usage (
    organization_id,
    month_year,
    keywords_processed,
    api_calls_made,
    updated_at
  )
  VALUES (
    p_organization_id,
    current_month,
    p_keywords_processed,
    p_api_calls,
    now()
  )
  ON CONFLICT (organization_id, month_year)
  DO UPDATE SET
    keywords_processed = organization_keyword_usage.keywords_processed + p_keywords_processed,
    api_calls_made = organization_keyword_usage.api_calls_made + p_api_calls,
    updated_at = now();
END;
$$;
