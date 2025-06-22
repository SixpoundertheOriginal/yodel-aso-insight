
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api/client';

interface RateLimitInfo {
  tier: 'free' | 'pro' | 'enterprise';
  limits: {
    hourly: number;
    daily: number;
    monthly: number;
  };
  usage: {
    hourly: number;
    daily: number;
    monthly: number;
  };
  remaining: {
    hourly: number;
    daily: number;
    monthly: number;
  };
  resetTimes: {
    hourly: Date;
    daily: Date;
    monthly: Date;
  };
}

const TIER_LIMITS = {
  free: { hourly: 10, daily: 50, monthly: 100 },
  pro: { hourly: 100, daily: 500, monthly: 2000 },
  enterprise: { hourly: 1000, daily: 5000, monthly: 20000 }
};

export function useRateLimit() {
  const { user } = useAuth();
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setRateLimitInfo(null);
      setLoading(false);
      return;
    }

    fetchRateLimitInfo();
  }, [user]);

  const fetchRateLimitInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get rate limit data from database
      const { data, error: fetchError } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // If it's not a "not found" error, throw it
        throw fetchError;
      }

      // If no rate limit record exists, create one
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from('rate_limits')
          .insert({
            user_id: user!.id,
            user_tier: 'free'
          })
          .select()
          .single();

        if (insertError) throw insertError;
        
        setRateLimitInfo(transformRateLimitData(newData));
      } else {
        setRateLimitInfo(transformRateLimitData(data));
      }
    } catch (err: any) {
      console.error('Failed to fetch rate limit info:', err);
      setError(err.message || 'Failed to load rate limit information');
      
      // Set default data if there's an error
      setRateLimitInfo({
        tier: 'free',
        limits: TIER_LIMITS.free,
        usage: { hourly: 0, daily: 0, monthly: 0 },
        remaining: TIER_LIMITS.free,
        resetTimes: {
          hourly: new Date(Date.now() + 60 * 60 * 1000),
          daily: new Date(Date.now() + 24 * 60 * 60 * 1000),
          monthly: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const transformRateLimitData = (data: any): RateLimitInfo => {
    const tier = data.user_tier as keyof typeof TIER_LIMITS;
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
    
    const usage = {
      hourly: data.hourly_ai_calls || 0,
      daily: data.daily_ai_calls || 0,
      monthly: data.monthly_ai_calls || 0
    };

    const remaining = {
      hourly: Math.max(0, limits.hourly - usage.hourly),
      daily: Math.max(0, limits.daily - usage.daily),
      monthly: Math.max(0, limits.monthly - usage.monthly)
    };

    const now = new Date();
    const resetTimes = {
      hourly: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1),
      daily: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      monthly: new Date(now.getFullYear(), now.getMonth() + 1, 1)
    };

    return {
      tier,
      limits,
      usage,
      remaining,
      resetTimes
    };
  };

  const checkLimit = (type: 'hourly' | 'daily' | 'monthly' = 'hourly'): boolean => {
    if (!rateLimitInfo) return false;
    return rateLimitInfo.remaining[type] > 0;
  };

  const getUpgradeMessage = (): string | null => {
    if (!rateLimitInfo) return null;
    
    if (rateLimitInfo.tier === 'free' && rateLimitInfo.remaining.hourly === 0) {
      return 'Upgrade to Pro for 100 AI calls per hour';
    }
    
    if (rateLimitInfo.tier === 'pro' && rateLimitInfo.remaining.hourly === 0) {
      return 'Upgrade to Enterprise for 1000 AI calls per hour';
    }
    
    return null;
  };

  return {
    rateLimitInfo,
    loading,
    error,
    checkLimit,
    getUpgradeMessage,
    refresh: fetchRateLimitInfo
  };
}
