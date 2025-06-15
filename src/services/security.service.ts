
import { supabase } from '@/integrations/supabase/client';
import { SecurityContext, AuditLogEntry, RateLimitConfig, SecureResponse, ValidationError } from '@/types/security';

class SecurityService {
  /**
   * Validate and sanitize App Store URL input
   */
  validateAppStoreUrl(url: string): SecureResponse<string> {
    const errors: ValidationError[] = [];
    
    // Basic URL validation
    try {
      const urlObj = new URL(url);
      if (!urlObj.hostname.includes('apps.apple.com')) {
        errors.push({
          field: 'url',
          message: 'Only App Store URLs are allowed',
          code: 'INVALID_DOMAIN'
        });
      }
    } catch {
      errors.push({
        field: 'url',
        message: 'Invalid URL format',
        code: 'INVALID_URL'
      });
    }
    
    // XSS prevention - remove any script tags or javascript protocols
    const sanitizedUrl = url.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                           .replace(/javascript:/gi, '');
    
    if (errors.length > 0) {
      return { success: false, errors };
    }
    
    return { success: true, data: sanitizedUrl };
  }

  /**
   * Check rate limits for organization
   */
  async checkRateLimit(organizationId: string, action: string): Promise<SecureResponse<boolean>> {
    try {
      // Get organization's rate limit configuration
      const { data: orgData, error } = await supabase
        .from('organizations')
        .select('subscription_tier, api_limits')
        .eq('id', organizationId)
        .single();

      if (error) {
        return { success: false, errors: [{ field: 'organization', message: 'Organization not found', code: 'ORG_NOT_FOUND' }] };
      }

      const limits = orgData.api_limits as any;
      const tier = orgData.subscription_tier;
      
      // Get current usage from audit logs
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const { data: recentActions, error: auditError } = await supabase
        .from('audit_logs')
        .select('created_at')
        .eq('organization_id', organizationId)
        .eq('action', action)
        .gte('created_at', hourAgo.toISOString());

      if (auditError) {
        console.error('Error checking rate limits:', auditError);
        return { success: false, errors: [{ field: 'rate_limit', message: 'Unable to check rate limits', code: 'RATE_LIMIT_ERROR' }] };
      }

      const currentHourlyUsage = recentActions?.length || 0;
      const hourlyLimit = limits?.requests_per_hour || this.getDefaultLimits(tier).requestsPerHour;
      
      if (currentHourlyUsage >= hourlyLimit) {
        return { 
          success: false, 
          errors: [{ 
            field: 'rate_limit', 
            message: `Hourly rate limit of ${hourlyLimit} requests exceeded`, 
            code: 'RATE_LIMIT_EXCEEDED' 
          }],
          rateLimitRemaining: 0
        };
      }

      return { 
        success: true, 
        data: true, 
        rateLimitRemaining: hourlyLimit - currentHourlyUsage 
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return { success: false, errors: [{ field: 'rate_limit', message: 'Rate limit check failed', code: 'INTERNAL_ERROR' }] };
    }
  }

  /**
   * Log audit entry for security tracking
   */
  async logAuditEntry(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<SecureResponse<string>> {
    try {
      const auditEntry = {
        ...entry,
        timestamp: new Date().toISOString(),
        details: JSON.stringify(entry.details)
      };

      const { data, error } = await supabase
        .from('audit_logs')
        .insert(auditEntry)
        .select('id')
        .single();

      if (error) {
        console.error('Failed to log audit entry:', error);
        return { success: false, errors: [{ field: 'audit', message: 'Failed to log audit entry', code: 'AUDIT_ERROR' }] };
      }

      return { success: true, data: data.id, auditId: data.id };
    } catch (error) {
      console.error('Audit logging failed:', error);
      return { success: false, errors: [{ field: 'audit', message: 'Audit logging failed', code: 'INTERNAL_ERROR' }] };
    }
  }

  /**
   * Validate organization context and permissions
   */
  async validateOrganizationContext(organizationId: string, userId: string): Promise<SecureResponse<boolean>> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        return { success: false, errors: [{ field: 'user', message: 'User profile not found', code: 'USER_NOT_FOUND' }] };
      }

      if (profile.organization_id !== organizationId) {
        return { success: false, errors: [{ field: 'organization', message: 'Access denied to organization', code: 'ACCESS_DENIED' }] };
      }

      return { success: true, data: true };
    } catch (error) {
      console.error('Organization validation failed:', error);
      return { success: false, errors: [{ field: 'organization', message: 'Organization validation failed', code: 'INTERNAL_ERROR' }] };
    }
  }

  /**
   * Sanitize user input to prevent XSS and injection attacks
   */
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .substring(0, 1000); // Limit length
  }

  private getDefaultLimits(tier: string) {
    const limits = {
      starter: { requestsPerHour: 10, requestsPerDay: 50, requestsPerMonth: 100 },
      professional: { requestsPerHour: 100, requestsPerDay: 500, requestsPerMonth: 2000 },
      enterprise: { requestsPerHour: 1000, requestsPerDay: 5000, requestsPerMonth: 20000 },
      'enterprise-plus': { requestsPerHour: 10000, requestsPerDay: 50000, requestsPerMonth: 200000 }
    };
    
    return limits[tier as keyof typeof limits] || limits.starter;
  }
}

export const securityService = new SecurityService();
