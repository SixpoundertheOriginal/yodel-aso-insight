
import { z } from 'zod';

// Metadata generation schemas
export const metadataGenerationSchema = z.object({
  appInput: z.string()
    .min(1, 'App input is required')
    .max(500, 'Input too long')
    .refine(
      (input) => input.trim().length > 0,
      'Input cannot be empty or whitespace only'
    ),
  targetKeywords: z.string()
    .max(1000, 'Keywords too long')
    .optional(),
  includeIntelligence: z.boolean().optional().default(true),
  debugMode: z.boolean().optional().default(false),
  organizationId: z.string().uuid('Invalid organization ID')
});

// App URL validation
export const appUrlSchema = z.object({
  url: z.string()
    .url('Invalid URL format')
    .refine(
      (url) => {
        const validDomains = ['apps.apple.com', 'play.google.com'];
        return validDomains.some(domain => url.includes(domain));
      },
      'Only App Store and Google Play URLs are allowed'
    )
});

// Text input validation
export const textInputSchema = z.object({
  text: z.string()
    .min(1, 'Text cannot be empty')
    .max(10000, 'Text exceeds maximum length')
    .refine(
      (text) => {
        // Check for potentially malicious content
        const dangerousPatterns = [
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          /javascript:/gi,
          /on\w+=/gi,
          /data:text\/html/gi
        ];
        return !dangerousPatterns.some(pattern => pattern.test(text));
      },
      'Potentially malicious content detected'
    )
});

// Character limits for metadata fields
export const metadataFieldSchema = z.object({
  title: z.string()
    .max(30, 'Title must be 30 characters or less')
    .optional(),
  subtitle: z.string()
    .max(30, 'Subtitle must be 30 characters or less')
    .optional(),
  keywords: z.string()
    .max(100, 'Keywords must be 100 characters or less')
    .optional(),
  description: z.string()
    .max(4000, 'Description must be 4000 characters or less')
    .optional()
});

// File upload validation
export const fileUploadSchema = z.object({
  file: z.object({
    size: z.number().max(1024 * 1024, 'File size must be less than 1MB'),
    type: z.enum(['text/csv', 'text/tab-separated-values', 'text/plain'], {
      errorMap: () => ({ message: 'Only CSV and TSV files are allowed' })
    }),
    name: z.string().refine(
      (name) => /\.(csv|tsv|txt)$/i.test(name),
      'File must have .csv, .tsv, or .txt extension'
    )
  })
});

// API response validation
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  code: z.string().optional(),
  rateLimitInfo: z.object({
    remaining: z.number(),
    resetTime: z.date(),
    tier: z.enum(['free', 'pro', 'enterprise'])
  }).optional()
});
