
-- Fix the get_keyword_gap_analysis function to return proper text type for gap_opportunity column
CREATE OR REPLACE FUNCTION public.get_keyword_gap_analysis(p_organization_id uuid, p_target_app_id text, p_limit integer DEFAULT 50)
 RETURNS TABLE(keyword text, target_rank integer, best_competitor_rank integer, gap_opportunity text, search_volume integer, difficulty_score numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ck.keyword,
    ck.target_rank,
    MIN(ck.competitor_rank) as best_competitor_rank,
    ck.gap_opportunity::text,  -- Explicit cast to text to fix type mismatch
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
$function$
