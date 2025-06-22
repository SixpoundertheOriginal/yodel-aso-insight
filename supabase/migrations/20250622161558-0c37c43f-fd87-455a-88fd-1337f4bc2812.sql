
-- Create table for historical keyword ranking data
CREATE TABLE public.keyword_ranking_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    app_id TEXT NOT NULL,
    keyword TEXT NOT NULL,
    position INTEGER,
    volume TEXT CHECK (volume IN ('Low', 'Medium', 'High')),
    trend TEXT CHECK (trend IN ('up', 'down', 'stable')),
    search_results INTEGER,
    confidence TEXT CHECK (confidence IN ('estimated', 'actual')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create table for background job processing
CREATE TABLE public.keyword_ranking_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    job_type TEXT NOT NULL CHECK (job_type IN ('batch_analysis', 'competitor_research', 'trend_analysis')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    input_data JSONB NOT NULL,
    result_data JSONB,
    error_message TEXT,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for service performance metrics
CREATE TABLE public.keyword_service_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit TEXT NOT NULL,
    tags JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_keyword_ranking_history_org_app ON public.keyword_ranking_history(organization_id, app_id);
CREATE INDEX idx_keyword_ranking_history_keyword ON public.keyword_ranking_history(keyword, created_at DESC);
CREATE INDEX idx_keyword_ranking_jobs_status ON public.keyword_ranking_jobs(status, scheduled_at);
CREATE INDEX idx_keyword_ranking_jobs_org ON public.keyword_ranking_jobs(organization_id, created_at DESC);
CREATE INDEX idx_keyword_service_metrics_org_name ON public.keyword_service_metrics(organization_id, metric_name, recorded_at DESC);

-- Enable RLS
ALTER TABLE public.keyword_ranking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_ranking_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_service_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for keyword_ranking_history
CREATE POLICY "Users can manage keyword ranking history for their organization"
ON public.keyword_ranking_history
FOR ALL
USING (organization_id = get_current_user_organization_id())
WITH CHECK (organization_id = get_current_user_organization_id());

-- RLS Policies for keyword_ranking_jobs
CREATE POLICY "Users can manage keyword ranking jobs for their organization"
ON public.keyword_ranking_jobs
FOR ALL
USING (organization_id = get_current_user_organization_id())
WITH CHECK (organization_id = get_current_user_organization_id());

-- RLS Policies for keyword_service_metrics
CREATE POLICY "Users can view service metrics for their organization"
ON public.keyword_service_metrics
FOR SELECT
USING (organization_id = get_current_user_organization_id());

CREATE POLICY "System can insert service metrics"
ON public.keyword_service_metrics
FOR INSERT
WITH CHECK (true);

-- Function to clean up old metrics data
CREATE OR REPLACE FUNCTION public.cleanup_old_keyword_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Keep only last 30 days of metrics data
  DELETE FROM public.keyword_service_metrics 
  WHERE recorded_at < NOW() - INTERVAL '30 days';
  
  -- Keep only last 90 days of ranking history
  DELETE FROM public.keyword_ranking_history 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;
