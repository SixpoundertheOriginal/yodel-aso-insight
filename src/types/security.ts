
export interface SecurityContext {
  organizationId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  userId: string;
  action: string;
  resourceType: 'cpp-analysis' | 'screenshot-analysis' | 'theme-generation';
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface RateLimitConfig {
  organizationId: string;
  tier: 'starter' | 'professional' | 'enterprise' | 'enterprise-plus';
  requestsPerHour: number;
  requestsPerDay: number;
  requestsPerMonth: number;
  currentUsage: {
    hour: number;
    day: number;
    month: number;
  };
}

export interface DataRetentionPolicy {
  organizationId: string;
  screenshotAnalysisRetentionDays: number;
  cacheRetentionDays: number;
  auditLogRetentionDays: number;
  enableAutoCleanup: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface SecureResponse<T = any> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  auditId?: string;
  rateLimitRemaining?: number;
}
