
import { z } from 'zod';
import { MiddlewareFunction, ApiRequest, ApiResponse, ValidationError } from './types';

// Common validation schemas
export const metadataSchema = z.object({
  appInput: z.string().min(1, 'App input is required').max(500, 'Input too long'),
  targetKeywords: z.string().optional(),
  includeIntelligence: z.boolean().optional(),
  debugMode: z.boolean().optional()
});

export const appUrlSchema = z.object({
  url: z.string().url('Invalid URL format').refine(
    (url) => url.includes('apps.apple.com') || url.includes('play.google.com'),
    'Only App Store and Google Play URLs are allowed'
  )
});

export const textInputSchema = z.object({
  text: z.string()
    .min(1, 'Text cannot be empty')
    .max(10000, 'Text too long')
    .refine(
      (text) => !text.includes('<script>') && !text.includes('javascript:'),
      'Potentially malicious content detected'
    )
});

export function withValidation(schema: z.ZodSchema): MiddlewareFunction {
  return async (req, res, next) => {
    try {
      // Validate request body
      const validationResult = schema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errors: ValidationError[] = validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors
        });
      }

      // Sanitize validated data
      req.body = sanitizeInput(validationResult.data);
      
      await next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      return res.status(500).json({
        error: 'Validation processing failed',
        code: 'VALIDATION_PROCESSING_ERROR'
      });
    }
  };
}

function sanitizeInput(data: any): any {
  if (typeof data === 'string') {
    return data
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
}
