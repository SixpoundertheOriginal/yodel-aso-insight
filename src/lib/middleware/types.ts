
import { NextApiRequest, NextApiResponse } from 'next';
import { User, Session } from '@supabase/supabase-js';

export interface ApiRequest extends NextApiRequest {
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

export interface ApiResponse extends NextApiResponse {
  // Extended response object
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
