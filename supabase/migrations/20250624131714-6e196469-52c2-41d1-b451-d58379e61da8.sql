
-- Create organization_apps table for app discovery and approval workflow
CREATE TABLE public.organization_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  app_identifier VARCHAR(255) NOT NULL,
  app_name VARCHAR(255),
  data_source VARCHAR(50) DEFAULT 'bigquery',
  approval_status VARCHAR(50) DEFAULT 'pending',
  discovered_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_date TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.profiles(id),
  app_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, app_identifier, data_source)
);

-- Enable Row Level Security
ALTER TABLE public.organization_apps ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for tenant isolation
CREATE POLICY "organization_apps_tenant_isolation" ON public.organization_apps
  FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Create function to get pending app discoveries for an organization
CREATE OR REPLACE FUNCTION public.get_pending_app_discoveries(p_organization_id UUID)
RETURNS TABLE(
  id UUID,
  app_identifier VARCHAR(255),
  app_name VARCHAR(255),
  record_count INTEGER,
  first_seen DATE,
  last_seen DATE,
  days_with_data INTEGER,
  discovered_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    oa.id,
    oa.app_identifier,
    oa.app_name,
    (oa.app_metadata->>'record_count')::INTEGER as record_count,
    (oa.app_metadata->>'first_seen')::DATE as first_seen,
    (oa.app_metadata->>'last_seen')::DATE as last_seen,
    (oa.app_metadata->>'days_with_data')::INTEGER as days_with_data,
    oa.discovered_date
  FROM public.organization_apps oa
  WHERE oa.organization_id = p_organization_id
    AND oa.approval_status = 'pending'
  ORDER BY oa.discovered_date DESC;
END;
$$;

-- Create function to approve or reject apps
CREATE OR REPLACE FUNCTION public.update_app_approval_status(
  p_app_id UUID,
  p_status VARCHAR(50),
  p_approved_by UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.organization_apps
  SET 
    approval_status = p_status,
    approved_date = CASE WHEN p_status = 'approved' THEN NOW() ELSE NULL END,
    approved_by = CASE WHEN p_status = 'approved' THEN COALESCE(p_approved_by, auth.uid()) ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_app_id
    AND organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    );
  
  RETURN FOUND;
END;
$$;

-- Create function to get approved apps for filtering
CREATE OR REPLACE FUNCTION public.get_approved_apps(p_organization_id UUID)
RETURNS TABLE(app_identifier VARCHAR(255))
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT oa.app_identifier
  FROM public.organization_apps oa
  WHERE oa.organization_id = p_organization_id
    AND oa.approval_status = 'approved';
END;
$$;

-- Add indexes for performance
CREATE INDEX idx_organization_apps_org_status ON public.organization_apps(organization_id, approval_status);
CREATE INDEX idx_organization_apps_identifier ON public.organization_apps(app_identifier);
