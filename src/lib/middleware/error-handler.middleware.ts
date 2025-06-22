
import { supabase } from '@/integrations/supabase/client';
import { MiddlewareFunction, ApiRequest, ApiResponse } from './types';

export const withErrorHandler: MiddlewareFunction = async (req, res, next) => {
  try {
    await next();
  } catch (error: any) {
    console.error('API Error:', error);
    
    // Log error to database
    await logError(req, error);
    
    // Determine error type and response
    const errorResponse = getErrorResponse(error);
    
    if (!res.headersSent) {
      res.status(errorResponse.status).json({
        error: errorResponse.message,
        code: errorResponse.code,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  }
};

async function logError(req: ApiRequest, error: any) {
  try {
    // Helper function to ensure string values
    const ensureString = (value: string | string[] | undefined): string => {
      if (Array.isArray(value)) return value[0] || '';
      return value || '';
    };

    const errorData = {
      user_id: req.user?.id || null,
      organization_id: req.organizationId || null,
      error_type: error.constructor.name || 'UnknownError',
      error_message: error.message || 'Unknown error occurred',
      error_code: error.code || null,
      api_endpoint: req.url || '',
      request_data: {
        method: req.method,
        body: req.body,
        query: req.query
      },
      user_agent: ensureString(req.headers['user-agent']),
      ip_address: ensureString(req.headers['x-forwarded-for']) || ensureString(req.connection?.remoteAddress),
      context: {
        timestamp: new Date().toISOString(),
        stack: error.stack
      },
      severity: getSeverity(error)
    };

    await supabase.from('error_logs').insert(errorData);
  } catch (logError) {
    console.error('Failed to log error to database:', logError);
  }
}

function getErrorResponse(error: any) {
  // Rate limiting errors
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    return {
      status: 429,
      message: 'Rate limit exceeded. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    };
  }
  
  // Validation errors
  if (error.code === 'VALIDATION_ERROR') {
    return {
      status: 400,
      message: error.message || 'Invalid input provided',
      code: 'VALIDATION_ERROR'
    };
  }
  
  // Authentication errors
  if (error.code === 'AUTH_ERROR' || error.message?.includes('auth')) {
    return {
      status: 401,
      message: 'Authentication failed',
      code: 'AUTH_ERROR'
    };
  }
  
  // AI service errors
  if (error.message?.includes('OpenAI') || error.message?.includes('AI')) {
    return {
      status: 503,
      message: 'AI service temporarily unavailable. Please try again.',
      code: 'AI_SERVICE_ERROR'
    };
  }
  
  // Database errors
  if (error.code?.startsWith('PG') || error.message?.includes('database')) {
    return {
      status: 500,
      message: 'Database error occurred. Please try again.',
      code: 'DATABASE_ERROR'
    };
  }
  
  // Generic server error
  return {
    status: 500,
    message: 'An unexpected error occurred. Please try again.',
    code: 'INTERNAL_ERROR'
  };
}

function getSeverity(error: any): string {
  if (error.code === 'RATE_LIMIT_EXCEEDED') return 'warning';
  if (error.code === 'VALIDATION_ERROR') return 'info';
  if (error.code === 'AUTH_ERROR') return 'warning';
  if (error.message?.includes('database')) return 'critical';
  return 'error';
}
