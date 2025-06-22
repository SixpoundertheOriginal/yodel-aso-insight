
-- Phase 1: Database Schema Enhancement for Advanced Keyword Intelligence

-- Create keyword_volume_history table for tracking search volume trends
CREATE TABLE public.keyword_volume_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  keyword text NOT NULL,
  country varchar(2) NOT NULL DEFAULT 'US',
  search_volume integer,
  search_volume_trend varchar(10) CHECK (search_volume_trend IN ('up', 'down', 'stable')),
  popularity_score numeric(3,2), -- 0.00 to 1.00
  recorded_date date NOT NULL DEFAULT CURRENT_DATE,
  data_source varchar(50) DEFAULT 'estimated',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create competitor_keywords table for gap analysis
CREATE TABLE public.competitor_keywords (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  target_app_id text NOT NULL,
  competitor_app_id text NOT NULL,
  keyword text NOT NULL,
  target_rank integer,
  competitor_rank integer,
  keyword_difficulty numeric(3,1), -- 0.0 to 10.0
  search_volume integer,
  gap_opportunity varchar(20) CHECK (gap_opportunity IN ('high', 'medium', 'low', 'none')),
  analyzed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create keyword_difficulty_scores table
CREATE TABLE public.keyword_difficulty_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  keyword text NOT NULL,
  country varchar(2) NOT NULL DEFAULT 'US',
  difficulty_score numeric(3,1) NOT NULL, -- 0.0 to 10.0
  competition_level varchar(20) CHECK (competition_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
  top_apps_strength numeric(3,2), -- Average strength of top 10 apps
  search_volume integer,
  calculation_method varchar(50) DEFAULT 'algorithmic',
  calculated_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days')
);

-- Create keyword_clusters table for semantic grouping
CREATE TABLE public.keyword_clusters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  cluster_name text NOT NULL,
  primary_keyword text NOT NULL,
  related_keywords text[] NOT NULL,
  cluster_type varchar(30) CHECK (cluster_type IN ('semantic', 'category', 'intent', 'competitor')),
  total_search_volume integer,
  avg_difficulty numeric(3,1),
  opportunity_score numeric(3,2), -- 0.00 to 1.00
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_keyword_volume_history_org_keyword ON public.keyword_volume_history(organization_id, keyword);
CREATE INDEX idx_keyword_volume_history_date ON public.keyword_volume_history(recorded_date DESC);
CREATE INDEX idx_competitor_keywords_org_target ON public.competitor_keywords(organization_id, target_app_id);
CREATE INDEX idx_competitor_keywords_keyword ON public.competitor_keywords(keyword);
CREATE INDEX idx_difficulty_scores_org_keyword ON public.keyword_difficulty_scores(organization_id, keyword);
CREATE INDEX idx_difficulty_scores_expires ON public.keyword_difficulty_scores(expires_at);
CREATE INDEX idx_keyword_clusters_org ON public.keyword_clusters(organization_id);

-- Enable RLS on all new tables
ALTER TABLE public.keyword_volume_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_difficulty_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_clusters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for keyword_volume_history
CREATE POLICY "Users can view their organization's keyword volume history" 
  ON public.keyword_volume_history 
  FOR SELECT 
  USING (organization_id = get_current_user_organization_id());

CREATE POLICY "Users can insert keyword volume history for their organization" 
  ON public.keyword_volume_history 
  FOR INSERT 
  WITH CHECK (organization_id = get_current_user_organization_id());

-- RLS Policies for competitor_keywords  
CREATE POLICY "Users can view their organization's competitor keywords" 
  ON public.competitor_keywords 
  FOR SELECT 
  USING (organization_id = get_current_user_organization_id());

CREATE POLICY "Users can insert competitor keywords for their organization" 
  ON public.competitor_keywords 
  FOR INSERT 
  WITH CHECK (organization_id = get_current_user_organization_id());

-- RLS Policies for keyword_difficulty_scores
CREATE POLICY "Users can view their organization's keyword difficulty scores" 
  ON public.keyword_difficulty_scores 
  FOR SELECT 
  USING (organization_id = get_current_user_organization_id());

CREATE POLICY "Users can insert keyword difficulty scores for their organization" 
  ON public.keyword_difficulty_scores 
  FOR INSERT 
  WITH CHECK (organization_id = get_current_user_organization_id());

-- RLS Policies for keyword_clusters
CREATE POLICY "Users can view their organization's keyword clusters" 
  ON public.keyword_clusters 
  FOR SELECT 
  USING (organization_id = get_current_user_organization_id());

CREATE POLICY "Users can manage their organization's keyword clusters" 
  ON public.keyword_clusters 
  FOR ALL
  USING (organization_id = get_current_user_organization_id())
  WITH CHECK (organization_id = get_current_user_organization_id());

-- Function to get keyword volume trends
CREATE OR REPLACE FUNCTION public.get_keyword_volume_trends(
  p_organization_id uuid,
  p_keyword text,
  p_days_back integer DEFAULT 30
)
RETURNS TABLE (
  recorded_date date,
  search_volume integer,
  popularity_score numeric,
  trend_direction text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kvh.recorded_date,
    kvh.search_volume,
    kvh.popularity_score,
    kvh.search_volume_trend
  FROM public.keyword_volume_history kvh
  WHERE kvh.organization_id = p_organization_id
    AND kvh.keyword = p_keyword
    AND kvh.recorded_date >= CURRENT_DATE - p_days_back
  ORDER BY kvh.recorded_date DESC;
END;
$$;

-- Function to calculate keyword gap opportunities
CREATE OR REPLACE FUNCTION public.get_keyword_gap_analysis(
  p_organization_id uuid,
  p_target_app_id text,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  keyword text,
  target_rank integer,
  best_competitor_rank integer,
  gap_opportunity text,
  search_volume integer,
  difficulty_score numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ck.keyword,
    ck.target_rank,
    MIN(ck.competitor_rank) as best_competitor_rank,
    ck.gap_opportunity,
    MAX(ck.search_volume) as search_volume,
    AVG(ck.keyword_difficulty) as difficulty_score
  FROM public.competitor_keywords ck
  WHERE ck.organization_id = p_organization_id
    AND ck.target_app_id = p_target_app_id
    AND ck.gap_opportunity IN ('high', 'medium')
  GROUP BY ck.keyword, ck.target_rank, ck.gap_opportunity
  ORDER BY 
    CASE ck.gap_opportunity 
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      ELSE 3
    END,
    search_volume DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

-- Function to cleanup expired difficulty scores
CREATE OR REPLACE FUNCTION public.cleanup_expired_keyword_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove expired difficulty scores
  DELETE FROM public.keyword_difficulty_scores 
  WHERE expires_at < now();
  
  -- Keep only last 90 days of volume history
  DELETE FROM public.keyword_volume_history 
  WHERE recorded_date < CURRENT_DATE - INTERVAL '90 days';
  
  -- Keep only last 30 days of competitor analysis
  DELETE FROM public.competitor_keywords 
  WHERE analyzed_at < now() - INTERVAL '30 days';
END;
$$;
