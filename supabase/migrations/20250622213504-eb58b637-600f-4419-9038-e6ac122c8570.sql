
-- Add unique constraint to keyword_ranking_snapshots table to enable proper upsert operations
-- This will prevent duplicate entries and fix the "42P10" error we're seeing

ALTER TABLE public.keyword_ranking_snapshots 
ADD CONSTRAINT keyword_ranking_snapshots_unique_snapshot 
UNIQUE (organization_id, app_id, keyword, snapshot_date);

-- Add index for better performance on rank distribution queries
CREATE INDEX IF NOT EXISTS idx_keyword_ranking_snapshots_rank_lookup 
ON public.keyword_ranking_snapshots (organization_id, app_id, snapshot_date, rank_position);

-- Add index for keyword trends analysis
CREATE INDEX IF NOT EXISTS idx_keyword_ranking_snapshots_trends 
ON public.keyword_ranking_snapshots (organization_id, app_id, keyword, snapshot_date DESC);
