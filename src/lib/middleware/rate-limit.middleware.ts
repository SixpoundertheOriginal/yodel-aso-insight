
import { supabase } from '@/integrations/supabase/client';
import { MiddlewareFunction, ApiRequest, ApiResponse, RateLimitConfig } from './types';

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    tier: 'free',
    limits: { hourly: 10, daily: 50, monthly: 100 }
  },
  pro: {
    tier: 'pro', 
    limits: { hourly: 100, daily: 500, monthly: 2000 }
  },
  enterprise: {
    tier: 'enterprise',
    limits: { hourly: 1000, daily: 5000, monthly: 20000 }
  }
};

export function withRateLimit(actionType: string): MiddlewareFunction {
  return async (req, res, next) => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required for rate limiting',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    try {
      // Get or create rate limit record
      const { data: rateLimitData, error } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('user_id', req.user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error is ok
        console.error('Rate limit check error:', error);
        res.status(500).json({
          error: 'Rate limit check failed',
          code: 'RATE_LIMIT_ERROR'
        });
        return;
      }

      // Initialize rate limits if not found
      if (!rateLimitData) {
        const { data: newRateLimit, error: insertError } = await supabase
          .from('rate_limits')
          .insert({
            user_id: req.user.id,
            organization_id: req.organizationId,
            user_tier: 'free'
          })
          .select()
          .single();

        if (insertError) {
          console.error('Rate limit initialization error:', insertError);
          res.status(500).json({
            error: 'Rate limit initialization failed',
            code: 'RATE_LIMIT_INIT_ERROR'
          });
          return;
        }
      }

      const currentLimits = rateLimitData || { 
        user_tier: 'free',
        hourly_ai_calls: 0,
        daily_ai_calls: 0,
        monthly_ai_calls: 0
      };

      const tierLimits = RATE_LIMITS[currentLimits.user_tier] || RATE_LIMITS.free;
      
      // Check limits based on action type
      if (actionType.includes('ai') || actionType.includes('generation')) {
        if (currentLimits.hourly_ai_calls >= tierLimits.limits.hourly) {
          res.status(429).json({
            error: `Hourly rate limit exceeded. Limit: ${tierLimits.limits.hourly}`,
            code: 'RATE_LIMIT_HOURLY',
            resetTime: new Date(Date.now() + 60 * 60 * 1000), // Next hour
            tier: tierLimits.tier
          });
          return;
        }

        if (currentLimits.daily_ai_calls >= tierLimits.limits.daily) {
          res.status(429).json({
            error: `Daily rate limit exceeded. Limit: ${tierLimits.limits.daily}`,
            code: 'RATE_LIMIT_DAILY',
            resetTime: new Date(new Date().setHours(24, 0, 0, 0)), // Next day
            tier: tierLimits.tier
          });
          return;
        }
      }

      // Attach rate limit info to request
      req.rateLimitInfo = {
        remaining: tierLimits.limits.hourly - currentLimits.hourly_ai_calls,
        resetTime: new Date(Date.now() + 60 * 60 * 1000),
        tier: tierLimits.tier
      };

      await next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      res.status(500).json({
        error: 'Rate limiting check failed',
        code: 'RATE_LIMIT_ERROR'
      });
    }
  };
}
