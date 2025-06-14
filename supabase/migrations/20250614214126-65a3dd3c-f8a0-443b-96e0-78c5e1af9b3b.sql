
-- Create a table to cache App Store scrape results for performance and reliability.
CREATE TABLE public.scrape_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL UNIQUE,
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL, -- e.g., 'SUCCESS', 'PENDING', 'FAILED'
    data JSONB,
    error TEXT
);

-- Add an index on the URL for fast lookups.
CREATE INDEX idx_scrape_cache_url ON public.scrape_cache(url);

-- Add an index on expires_at for efficient cleaning of stale cache entries.
CREATE INDEX idx_scrape_cache_expires_at ON public.scrape_cache(expires_at);

-- Enable Row Level Security to protect the data by default.
-- The scraper edge function will use the service role to bypass this.
ALTER TABLE public.scrape_cache ENABLE ROW LEVEL SECURITY;

-- Add a comment to describe the purpose of the table.
COMMENT ON TABLE public.scrape_cache IS 'Caches results from the app-store-scraper edge function to improve performance and reduce redundant fetches.';
