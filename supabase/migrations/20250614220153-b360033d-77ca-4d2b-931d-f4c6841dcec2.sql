
-- Phase 1 Correction: Make Scrape Cache Tenant-Aware

-- 1. Add organization_id column to the scrape_cache table for tenant isolation.
-- This column is essential for RLS to distinguish which organization owns a cache entry.
ALTER TABLE public.scrape_cache ADD COLUMN IF NOT EXISTS organization_id UUID;
COMMENT ON COLUMN public.scrape_cache.organization_id IS 'The organization that owns this cache entry, for tenant isolation.';

-- Add a foreign key to the organizations table to maintain data integrity.
-- This script checks if the constraint already exists to ensure it can be re-run safely.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scrape_cache_organization_id_fkey') THEN
    ALTER TABLE public.scrape_cache 
    ADD CONSTRAINT scrape_cache_organization_id_fkey 
    FOREIGN KEY (organization_id) 
    REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Create an index on the new column for fast, tenant-specific cache lookups.
CREATE INDEX IF NOT EXISTS idx_scrape_cache_organization_id ON public.scrape_cache(organization_id);

-- 2. Update the uniqueness constraint to be tenant-aware.
-- A scraped URL should now be unique *per organization*, not globally.
-- First, drop the old global uniqueness constraint.
ALTER TABLE public.scrape_cache DROP CONSTRAINT IF EXISTS scrape_cache_url_key;

-- Then, create the new composite unique constraint for tenant-specific URLs.
ALTER TABLE public.scrape_cache ADD CONSTRAINT scrape_cache_url_organization_id_key UNIQUE (url, organization_id);

-- 3. Apply a strict RLS policy to enforce tenant isolation on the cache.
-- This ensures that authenticated users can only interact with cache entries belonging to their own organization.
-- The scraper edge function, using a service_role key, will bypass this to write entries, but this policy protects all client-side access.
DROP POLICY IF EXISTS "Users can manage scrape_cache entries for their own org" ON public.scrape_cache;
CREATE POLICY "Users can manage scrape_cache entries for their own org" ON public.scrape_cache
  FOR ALL USING (organization_id = public.get_current_user_organization_id())
  WITH CHECK (organization_id = public.get_current_user_organization_id());

-- 4. Secure the scrape_cache RLS policy for anonymous users
-- The scraper edge function will use the service role to bypass this.
ALTER TABLE public.scrape_cache ENABLE ROW LEVEL SECURITY;
