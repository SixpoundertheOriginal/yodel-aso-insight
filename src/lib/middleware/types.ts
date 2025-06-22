
import { User, Session } from '@supabase/supabase-js';

export interface ApiRequest {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
  body?: any;
  query?: Record<string, any>;
  connection?: {
    remoteAddress?: string;
  };
  user?: User;
  session?: Session;
  organizationId?: string;
  rateLimitInfo?: {
    remaining: number;
    resetTime: Date;
    tier: string;
  };
  startTime?: number;
}

export interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: any) => ApiResponse;
  headersSent: boolean;
}

export type MiddlewareFunction = (
  req: ApiRequest,
  res: ApiResponse,
  next: () => Promise<void>
) => Promise<void>;

export interface RateLimitConfig {
  tier: 'free' | 'pro' | 'enterprise';
  limits: {
    hourly: number;
    daily: number;
    monthly: number;
  };
}

export interface UsageData {
  actionType: string;
  aiCallsUsed?: number;
  metadataGenerated?: any;
  apiEndpoint?: string;
  processingTimeMs?: number;
  success?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}
