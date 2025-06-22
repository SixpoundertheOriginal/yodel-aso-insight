
-- Usage tracking table for analytics and billing
CREATE TABLE public.user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  ai_calls_used INTEGER DEFAULT 0,
  metadata_generated JSONB,
  api_endpoint TEXT,
  processing_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate limiting table for usage controls
CREATE TABLE public.rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  daily_ai_calls INTEGER DEFAULT 0,
  daily_metadata_generations INTEGER DEFAULT 0,
  hourly_ai_calls INTEGER DEFAULT 0,
  monthly_ai_calls INTEGER DEFAULT 0,
  last_daily_reset DATE DEFAULT CURRENT_DATE,
  last_hourly_reset TIMESTAMP WITH TIME ZONE DEFAULT DATE_TRUNC('hour', NOW()),
  last_monthly_reset DATE DEFAULT DATE_TRUNC('month', NOW()),
  user_tier TEXT DEFAULT 'free' CHECK (user_tier IN ('free', 'pro', 'enterprise')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error logs table for debugging and monitoring
CREATE TABLE public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL,
  error_message TEXT,
  error_code TEXT,
  api_endpoint TEXT,
  request_data JSONB,
  user_agent TEXT,
  ip_address INET,
  context JSONB,
  severity TEXT DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all new tables
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_usage table
CREATE POLICY "Users can view their own usage data" 
  ON public.user_usage 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage data" 
  ON public.user_usage 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for rate_limits table
CREATE POLICY "Users can view their own rate limits" 
  ON public.rate_limits 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate limits" 
  ON public.rate_limits 
  FOR ALL 
  USING (auth.uid() = user_id);

-- RLS Policies for error_logs table (more restrictive)
CREATE POLICY "Users can view their own error logs" 
  ON public.error_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert error logs" 
  ON public.error_logs 
  FOR INSERT 
  WITH CHECK (true); -- Allow system to log errors for any user

-- Create indexes for performance
CREATE INDEX idx_user_usage_user_id_created_at ON public.user_usage(user_id, created_at DESC);
CREATE INDEX idx_user_usage_organization_id ON public.user_usage(organization_id);
CREATE INDEX idx_user_usage_action_type ON public.user_usage(action_type);
CREATE INDEX idx_rate_limits_organization_id ON public.rate_limits(organization_id);
CREATE INDEX idx_error_logs_user_id_created_at ON public.error_logs(user_id, created_at DESC);
CREATE INDEX idx_error_logs_error_type ON public.error_logs(error_type);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity);

-- Function to reset rate limits automatically
CREATE OR REPLACE FUNCTION public.reset_rate_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset daily limits if date changed
  IF NEW.last_daily_reset < CURRENT_DATE THEN
    NEW.daily_ai_calls = 0;
    NEW.daily_metadata_generations = 0;
    NEW.last_daily_reset = CURRENT_DATE;
  END IF;
  
  -- Reset hourly limits if hour changed
  IF NEW.last_hourly_reset < DATE_TRUNC('hour', NOW()) THEN
    NEW.hourly_ai_calls = 0;
    NEW.last_hourly_reset = DATE_TRUNC('hour', NOW());
  END IF;
  
  -- Reset monthly limits if month changed
  IF NEW.last_monthly_reset < DATE_TRUNC('month', NOW())::DATE THEN
    NEW.monthly_ai_calls = 0;
    NEW.last_monthly_reset = DATE_TRUNC('month', NOW())::DATE;
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger to auto-reset rate limits
CREATE TRIGGER trigger_reset_rate_limits
  BEFORE UPDATE ON public.rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_rate_limits();

-- Function to initialize rate limits for new users
CREATE OR REPLACE FUNCTION public.initialize_user_rate_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.rate_limits (user_id, organization_id, user_tier)
  VALUES (
    NEW.id, 
    NEW.organization_id, 
    CASE 
      WHEN NEW.role = 'SUPER_ADMIN' THEN 'enterprise'
      WHEN NEW.role = 'ORGANIZATION_ADMIN' THEN 'pro'
      ELSE 'free'
    END
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to initialize rate limits when profile is created
CREATE TRIGGER trigger_initialize_rate_limits
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_rate_limits();
