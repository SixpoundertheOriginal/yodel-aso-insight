
export interface SecurityValidationInput {
  searchTerm: string;
  organizationId: string;
  securityContext: any;
  ipAddress: string;
  userAgent: string;
}

export interface SecurityValidationResult {
  success: boolean;
  data?: {
    country: string;
    riskScore: number;
  };
  error?: string;
}

export class SecurityService {
  constructor(private supabase: any) {}

  async validateRequest(input: SecurityValidationInput): Promise<SecurityValidationResult> {
    try {
      // Basic validation
      if (!this.isValidSearchTerm(input.searchTerm)) {
        return {
          success: false,
          error: 'Invalid search term format'
        };
      }

      // Check rate limiting
      const rateLimitCheck = await this.checkRateLimit(input.organizationId, input.ipAddress);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: 'Rate limit exceeded'
        };
      }

      // Validate organization exists and is active
      const orgValidation = await this.validateOrganization(input.organizationId);
      if (!orgValidation.success) {
        return {
          success: false,
          error: orgValidation.error
        };
      }

      // Calculate risk score
      const riskScore = this.calculateRiskScore(input);

      // Determine country (default to US)
      const country = this.extractCountryFromContext(input.securityContext) || 'us';

      return {
        success: true,
        data: {
          country,
          riskScore
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Security validation failed: ${error.message}`
      };
    }
  }

  private isValidSearchTerm(searchTerm: string): boolean {
    // Basic validation - no malicious patterns
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i
    ];

    return !maliciousPatterns.some(pattern => pattern.test(searchTerm));
  }

  private async checkRateLimit(organizationId: string, ipAddress: string): Promise<{allowed: boolean}> {
    try {
      // Simple rate limiting - 100 requests per hour per organization
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const { count } = await this.supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('action', 'app_store_scraper_request')
        .gte('created_at', oneHourAgo.toISOString());

      return { allowed: (count || 0) < 100 };
    } catch (error) {
      console.warn('Rate limit check failed:', error);
      return { allowed: true }; // Allow on error
    }
  }

  private async validateOrganization(organizationId: string): Promise<{success: boolean, error?: string}> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('id, subscription_status')
        .eq('id', organizationId)
        .single();

      if (error || !data) {
        return {
          success: false,
          error: 'Organization not found'
        };
      }

      if (data.subscription_status !== 'active') {
        return {
          success: false,
          error: 'Organization subscription is not active'
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Organization validation failed: ${error.message}`
      };
    }
  }

  private calculateRiskScore(input: SecurityValidationInput): number {
    let score = 0;

    // Higher risk for suspicious search terms
    if (input.searchTerm.length > 200) score += 2;
    if (input.searchTerm.includes('..')) score += 3;
    if (input.searchTerm.match(/[<>'"]/)) score += 1;

    // Check user agent
    if (!input.userAgent || input.userAgent.length < 10) score += 2;

    return Math.min(score, 10); // Cap at 10
  }

  private extractCountryFromContext(securityContext: any): string | null {
    if (securityContext?.country && typeof securityContext.country === 'string') {
      return securityContext.country.toLowerCase();
    }
    return null;
  }
}
