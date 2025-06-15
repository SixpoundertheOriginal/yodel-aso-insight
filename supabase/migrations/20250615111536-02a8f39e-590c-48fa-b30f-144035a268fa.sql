
-- Table to store generated metadata versions for A/B testing and tracking
CREATE TABLE public.metadata_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_store_id TEXT NOT NULL,
    organization_id UUID NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    keywords TEXT NOT NULL,
    score JSONB,
    is_live BOOLEAN NOT NULL DEFAULT false,
    notes TEXT
);

-- Table to track keyword ranking over time
CREATE TABLE public.keyword_rankings (
    id BIGSERIAL PRIMARY KEY,
    app_store_id TEXT NOT NULL,
    organization_id UUID NOT NULL,
    keyword TEXT NOT NULL,
    rank INTEGER,
    country VARCHAR(2) NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add a unique constraint to prevent duplicate ranking checks at the same time
CREATE UNIQUE INDEX keyword_rankings_unique_check ON public.keyword_rankings(app_store_id, keyword, country, checked_at);

-- Indexes for performance
CREATE INDEX ON public.metadata_versions(app_store_id);
CREATE INDEX ON public.metadata_versions(organization_id);
CREATE INDEX ON public.keyword_rankings(app_store_id, keyword, country, checked_at DESC);
CREATE INDEX ON public.keyword_rankings(organization_id);

-- Enable RLS
ALTER TABLE public.metadata_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_rankings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for metadata_versions
CREATE POLICY "Users can manage metadata versions for their own organization"
ON public.metadata_versions
FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for keyword_rankings
CREATE POLICY "Users can manage keyword rankings for their own organization"
ON public.keyword_rankings
FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

