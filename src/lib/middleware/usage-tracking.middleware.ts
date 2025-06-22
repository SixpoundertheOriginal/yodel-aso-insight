
import { supabase } from '@/integrations/supabase/client';
import { MiddlewareFunction, ApiRequest, ApiResponse, UsageData } from './types';

export function withUsageTracking(actionType: string): MiddlewareFunction {
  return async (req, res, next) => {
    const startTime = Date.now();
    req.startTime = startTime;
    
    // Override res.json to capture response data
    const originalJson = res.json;
    let responseData: any;
    let success = true;
    
    res.json = function(data: any) {
      responseData = data;
      success = !data.error;
      return originalJson.call(this, data);
    };

    try {
      await next();
    } catch (error) {
      success = false;
      throw error;
    } finally {
      // Track usage regardless of success/failure
      await trackUsage(req, {
        actionType,
        processingTimeMs: Date.now() - startTime,
        success,
        aiCallsUsed: actionType.includes('ai') ? 1 : 0,
        metadataGenerated: responseData?.metadata || null,
        apiEndpoint: req.url || ''
      });
      
      // Update rate limits if successful
      if (success && req.user) {
        await updateRateLimits(req.user.id, actionType);
      }
    }
  };
}

async function trackUsage(req: ApiRequest, usage: UsageData) {
  if (!req.user) return;
  
  try {
    const usageData = {
      user_id: req.user.id,
      organization_id: req.organizationId,
      action_type: usage.actionType,
      ai_calls_used: usage.aiCallsUsed || 0,
      metadata_generated: usage.metadataGenerated,
      api_endpoint: usage.apiEndpoint,
      processing_time_ms: usage.processingTimeMs,
      success: usage.success
    };

    await supabase.from('user_usage').insert(usageData);
  } catch (error) {
    console.error('Failed to track usage:', error);
    // Don't throw - usage tracking failure shouldn't break the API
  }
}

async function updateRateLimits(userId: string, actionType: string) {
  if (!actionType.includes('ai') && !actionType.includes('generation')) {
    return; // Only update for AI/generation actions
  }
  
  try {
    // Increment the appropriate counters
    const { error } = await supabase.rpc('increment_rate_limits', {
      p_user_id: userId,
      p_action_type: actionType
    });

    if (error) {
      console.error('Failed to update rate limits:', error);
    }
  } catch (error) {
    console.error('Rate limit update error:', error);
  }
}
