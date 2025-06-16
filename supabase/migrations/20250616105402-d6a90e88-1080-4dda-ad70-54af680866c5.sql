
-- Emergency Stabilization: Create missing database tables and fix schema issues

-- 1. Ensure organizations table has proper structure (it exists but may need updates)
-- Check if we need to add any missing columns to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS api_limits jsonb DEFAULT '{"requests_per_hour": 100, "requests_per_day": 500, "requests_per_month": 2000}'::jsonb;

-- 2. Ensure audit_logs table has proper structure for rate limiting
-- The table exists, let's make sure it has the right indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_action_time 
ON public.audit_logs (organization_id, action, created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_rate_limit 
ON public.audit_logs (organization_id, created_at) 
WHERE action = 'app_store_scraper_request';

-- 3. Ensure scrape_cache table has proper indexes
CREATE INDEX IF NOT EXISTS idx_scrape_cache_url_org 
ON public.scrape_cache (url, organization_id);

CREATE INDEX IF NOT EXISTS idx_scrape_cache_expires 
ON public.scrape_cache (expires_at);

-- 4. Add RLS policies for scrape_cache if missing
ALTER TABLE public.scrape_cache ENABLE ROW LEVEL SECURITY;

-- Policy for users to access their organization's cache
DROP POLICY IF EXISTS "Users can access their organization cache" ON public.scrape_cache;
CREATE POLICY "Users can access their organization cache" 
ON public.scrape_cache 
FOR ALL 
USING (
  organization_id IS NULL OR 
  organization_id = get_current_user_organization_id()
);

-- 5. Add RLS policies for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy for audit logs access
DROP POLICY IF EXISTS "Users can access their organization audit logs" ON public.audit_logs;
CREATE POLICY "Users can access their organization audit logs" 
ON public.audit_logs 
FOR ALL 
USING (
  organization_id IS NULL OR 
  organization_id = get_current_user_organization_id()
);

-- 6. Create a function to safely get user organization with fallback
CREATE OR REPLACE FUNCTION public.get_user_organization_with_fallback()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT organization_id FROM public.profiles WHERE id = auth.uid()),
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;

-- 7. Create emergency function to handle app store scraper requests without strict validation
CREATE OR REPLACE FUNCTION public.log_scraper_request(
  p_organization_id uuid,
  p_search_term text,
  p_user_agent text DEFAULT '',
  p_ip_address inet DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the request for rate limiting
  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    action,
    resource_type,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_organization_id,
    auth.uid(),
    'app_store_scraper_request',
    'api_request',
    jsonb_build_object('search_term', p_search_term),
    p_ip_address,
    p_user_agent
  );
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail if logging fails
    RETURN false;
END;
$$;
