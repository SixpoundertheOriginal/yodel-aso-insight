
-- Fix the get_keyword_trends function to resolve ambiguous column references
CREATE OR REPLACE FUNCTION public.get_keyword_trends(
  p_organization_id uuid,
  p_app_id text,
  p_days_back integer DEFAULT 30
)
RETURNS TABLE(
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
      ks.keyword,
      ks.rank_position,
      ks.search_volume,
      ks.snapshot_date,
      ROW_NUMBER() OVER (PARTITION BY ks.keyword ORDER BY ks.snapshot_date DESC) as rn
    FROM public.keyword_ranking_snapshots ks
    WHERE ks.organization_id = p_organization_id
      AND ks.app_id = p_app_id
      AND ks.snapshot_date >= CURRENT_DATE - p_days_back
  ),
  current_data AS (
    SELECT 
      rs.keyword, 
      rs.rank_position as current_rank, 
      rs.search_volume as current_volume
    FROM ranked_snapshots rs 
    WHERE rs.rn = 1
  ),
  previous_data AS (
    SELECT 
      rs.keyword, 
      rs.rank_position as previous_rank, 
      rs.search_volume as previous_volume
    FROM ranked_snapshots rs 
    WHERE rs.rn = 2
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
