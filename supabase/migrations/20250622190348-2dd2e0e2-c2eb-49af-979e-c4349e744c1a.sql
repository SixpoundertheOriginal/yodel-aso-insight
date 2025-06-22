
-- Fix the audit_app_changes function to handle UUID types correctly
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
    COALESCE(NEW.id, OLD.id),
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
