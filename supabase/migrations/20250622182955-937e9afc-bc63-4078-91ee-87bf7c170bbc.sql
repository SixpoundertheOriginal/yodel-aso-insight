
-- Enhanced app management schema with enterprise features
-- Following ASO Platform Enterprise Patterns

-- 1. Add comprehensive app management columns to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS app_limit INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS app_limit_enforced BOOLEAN DEFAULT true;

-- Update existing organizations with default limits based on tier
UPDATE public.organizations 
SET app_limit = CASE 
  WHEN subscription_tier = 'enterprise' THEN 100
  WHEN subscription_tier = 'professional' THEN 25  
  WHEN subscription_tier = 'starter' THEN 10
  ELSE 10
END
WHERE app_limit IS NULL;

-- 2. Enhanced app limit checking with tier-aware logic
CREATE OR REPLACE FUNCTION public.check_app_limit() 
RETURNS TRIGGER AS $$
DECLARE 
  current_count INTEGER;
  org_limit INTEGER;
  limit_enforced BOOLEAN;
  org_tier VARCHAR(50);
BEGIN
  -- Get organization details
  SELECT app_limit, app_limit_enforced, subscription_tier 
  INTO org_limit, limit_enforced, org_tier
  FROM public.organizations 
  WHERE id = NEW.organization_id;
  
  -- Skip check if limit enforcement is disabled (for enterprise customers)
  IF NOT limit_enforced THEN
    RETURN NEW;
  END IF;
  
  -- Get current active app count
  SELECT COUNT(*) INTO current_count 
  FROM public.apps 
  WHERE organization_id = NEW.organization_id 
    AND is_active = true;
  
  -- Check limit with helpful error message
  IF current_count >= org_limit THEN
    RAISE EXCEPTION 'Organization has reached its % tier app limit of %. Upgrade subscription to add more apps.', 
      org_tier, org_limit
      USING HINT = 'Contact support to upgrade your subscription tier';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create audit trigger for app management
CREATE OR REPLACE FUNCTION public.audit_app_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    COALESCE(NEW.organization_id, OLD.organization_id),
    auth.uid(),
    TG_OP,
    'app',
    COALESCE(NEW.id::text, OLD.id::text),
    jsonb_build_object(
      'old', row_to_json(OLD),
      'new', row_to_json(NEW),
      'app_name', COALESCE(NEW.app_name, OLD.app_name),
      'platform', COALESCE(NEW.platform, OLD.platform)
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Apply triggers with proper cleanup
DROP TRIGGER IF EXISTS enforce_app_limit ON public.apps;
DROP TRIGGER IF EXISTS audit_app_changes ON public.apps;

CREATE TRIGGER enforce_app_limit 
  BEFORE INSERT ON public.apps 
  FOR EACH ROW EXECUTE FUNCTION public.check_app_limit();

CREATE TRIGGER audit_app_changes 
  AFTER INSERT OR UPDATE OR DELETE ON public.apps 
  FOR EACH ROW EXECUTE FUNCTION public.audit_app_changes();

-- 5. Enhanced RLS policies with organization-based access
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate with enhancements
DROP POLICY IF EXISTS "Users can view organization apps" ON public.apps;
DROP POLICY IF EXISTS "Users can create organization apps" ON public.apps;
DROP POLICY IF EXISTS "Users can update organization apps" ON public.apps;
DROP POLICY IF EXISTS "Users can delete organization apps" ON public.apps;

-- Enhanced view policy (all authenticated users can view their org's apps)
CREATE POLICY "Users can view organization apps" ON public.apps 
FOR SELECT USING (
  organization_id = (
    SELECT organization_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Enhanced insert policy 
CREATE POLICY "Users can create organization apps" ON public.apps 
FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Enhanced update policy
CREATE POLICY "Users can update organization apps" ON public.apps 
FOR UPDATE USING (
  organization_id = (
    SELECT organization_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Enhanced delete policy
CREATE POLICY "Users can delete organization apps" ON public.apps 
FOR DELETE USING (
  organization_id = (
    SELECT organization_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- 6. Create app usage analytics view for monitoring
CREATE OR REPLACE VIEW public.organization_app_usage AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  o.subscription_tier,
  o.app_limit,
  o.app_limit_enforced,
  COUNT(a.id) as current_app_count,
  (o.app_limit - COUNT(a.id)) as remaining_apps,
  ROUND((COUNT(a.id)::DECIMAL / o.app_limit * 100), 2) as usage_percentage,
  COUNT(CASE WHEN a.is_active = true THEN 1 END) as active_apps,
  COUNT(CASE WHEN a.is_active = false THEN 1 END) as inactive_apps
FROM public.organizations o
LEFT JOIN public.apps a ON o.id = a.organization_id
GROUP BY o.id, o.name, o.subscription_tier, o.app_limit, o.app_limit_enforced;

-- 7. Create function to check if organization can add more apps
CREATE OR REPLACE FUNCTION public.can_add_app(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  org_limit INTEGER;
  limit_enforced BOOLEAN;
BEGIN
  SELECT app_limit, app_limit_enforced INTO org_limit, limit_enforced
  FROM public.organizations WHERE id = org_id;
  
  IF NOT limit_enforced THEN
    RETURN true;
  END IF;
  
  SELECT COUNT(*) INTO current_count
  FROM public.apps 
  WHERE organization_id = org_id AND is_active = true;
  
  RETURN current_count < org_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_apps_org_active ON public.apps(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_apps_platform ON public.apps(platform);
CREATE INDEX IF NOT EXISTS idx_apps_created_at ON public.apps(created_at DESC);

-- 9. Grant necessary permissions
GRANT SELECT ON public.organization_app_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_app(UUID) TO authenticated;
