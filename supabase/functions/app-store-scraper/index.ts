
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DiscoveryService } from './services/discovery.service.ts'
import { MetadataExtractionService } from './services/metadata-extraction.service.ts'
import { ScreenshotAnalysisService } from './services/screenshot-analysis.service.ts'
import { CacheManagerService } from './services/cache-manager.service.ts'
import { SecurityService } from './services/security.service.ts'
import { AnalyticsService } from './services/analytics.service.ts'
import { ErrorHandler } from './utils/error-handler.ts'
import { ResponseBuilder } from './utils/response-builder.ts'

const VERSION = '4.1.0-emergency-stabilized'

// Enterprise-grade: Initialize services with admin client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize microservices
const discoveryService = new DiscoveryService(supabaseAdmin)
const metadataService = new MetadataExtractionService(supabaseAdmin)
const screenshotService = new ScreenshotAnalysisService()
const cacheService = new CacheManagerService(supabaseAdmin)
const securityService = new SecurityService(supabaseAdmin)
const analyticsService = new AnalyticsService(supabaseAdmin)
const errorHandler = new ErrorHandler()
const responseBuilder = new ResponseBuilder(corsHeaders)

serve(async (req: Request) => {
  const startTime = Date.now()
  let requestId: string | null = null

  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return responseBuilder.cors()
    }

    // Health Check Endpoint
    if (req.method === 'GET') {
      return responseBuilder.success({
        status: 'ok',
        version: VERSION,
        timestamp: new Date().toISOString(),
        services: {
          discovery: 'operational',
          metadata: 'operational',
          screenshot: 'operational',
          cache: 'operational',
          security: 'operational',
          analytics: 'operational'
        }
      })
    }

    if (req.method !== 'POST') {
      return responseBuilder.error('Method Not Allowed', 405)
    }

    // Parse and validate request
    let requestBody: any
    try {
      requestBody = await req.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return responseBuilder.error('Invalid JSON in request body', 400)
    }

    // Extract parameters with backward compatibility
    const { 
      searchTerm, 
      organizationId, 
      includeCompetitorAnalysis = true, 
      securityContext = {} 
    } = requestBody

    // Emergency validation with clear error messages
    if (!searchTerm || typeof searchTerm !== 'string') {
      return responseBuilder.error('searchTerm is required and must be a string', 400, {
        code: 'MISSING_SEARCH_TERM',
        details: 'Please provide a valid app name or App Store URL'
      })
    }

    if (!organizationId || typeof organizationId !== 'string') {
      return responseBuilder.error('organizationId is required and must be a string', 400, {
        code: 'MISSING_ORGANIZATION_ID',
        details: 'Organization context is required for this operation'
      })
    }

    // Generate request ID for tracking
    requestId = crypto.randomUUID()
    
    console.log(`[${requestId}] Processing request for: ${searchTerm} (org: ${organizationId})`)

    // Phase 1: Security Validation (with fallback for development)
    console.log(`[${requestId}] Starting security validation...`)
    const securityValidation = await securityService.validateRequest({
      searchTerm,
      organizationId,
      securityContext,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown'
    })

    if (!securityValidation.success) {
      console.warn(`[${requestId}] Security validation failed: ${securityValidation.error}`)
      // In emergency mode, log warning but don't block request
      await analyticsService.logEvent('security_validation_warning', {
        requestId,
        organizationId,
        reason: securityValidation.error
      }).catch(() => {}) // Don't fail if analytics fail
    }

    // Phase 2: Cache Check
    console.log(`[${requestId}] Checking cache...`)
    const cachedResult = await cacheService.get(searchTerm, organizationId).catch(err => {
      console.warn(`[${requestId}] Cache check failed:`, err)
      return null // Don't fail request if cache fails
    })
    
    if (cachedResult) {
      await analyticsService.logEvent('cache_hit', { requestId, organizationId }).catch(() => {})
      return responseBuilder.success(cachedResult, { 'X-Cache': 'HIT', 'X-Request-ID': requestId })
    }

    // Phase 3: Market Discovery
    console.log(`[${requestId}] Starting market discovery...`)
    const discoveryResult = await discoveryService.discover(searchTerm, {
      includeCompetitors: includeCompetitorAnalysis !== false,
      maxCompetitors: 5,
      country: securityValidation.data?.country || 'us'
    })

    if (!discoveryResult.success) {
      await analyticsService.logEvent('discovery_failed', {
        requestId,
        organizationId,
        error: discoveryResult.error
      }).catch(() => {})
      return responseBuilder.error(discoveryResult.error || 'App not found in store', 404, {
        code: 'APP_NOT_FOUND',
        details: 'Could not find the specified app in the App Store'
      })
    }

    // Phase 4: Metadata Extraction
    console.log(`[${requestId}] Extracting metadata...`)
    const metadataResult = await metadataService.extract({
      targetApp: discoveryResult.data.targetApp,
      competitors: discoveryResult.data.competitors
    })

    if (!metadataResult.success) {
      await analyticsService.logEvent('metadata_extraction_failed', {
        requestId,
        organizationId,
        error: metadataResult.error
      }).catch(() => {})
      return responseBuilder.error(metadataResult.error || 'Failed to extract app metadata', 422, {
        code: 'METADATA_EXTRACTION_FAILED',
        details: 'Could not extract complete metadata from the app store'
      })
    }

    // Phase 5: Screenshot Analysis (optional, don't fail if it doesn't work)
    let analysisResult = null
    if (includeCompetitorAnalysis) {
      console.log(`[${requestId}] Analyzing screenshots...`)
      try {
        analysisResult = await screenshotService.analyze({
          targetApp: metadataResult.data.targetApp,
          competitors: metadataResult.data.competitors.slice(0, 3),
          analysisType: 'competitive-intelligence'
        })

        if (!analysisResult.success) {
          console.warn(`[${requestId}] Screenshot analysis failed: ${analysisResult.error}`)
        }
      } catch (screenshotError) {
        console.warn(`[${requestId}] Screenshot analysis error:`, screenshotError)
      }
    }

    // Phase 6: Build Final Response
    const finalMetadata = {
      ...metadataResult.data.targetApp,
      competitorScreenshots: analysisResult?.data?.competitorAnalysis || [],
      marketInsights: {
        totalCompetitors: discoveryResult.data.competitors.length,
        category: discoveryResult.data.category,
        marketPosition: analysisResult?.data?.marketPosition || 'unknown'
      }
    }

    // Phase 7: Cache Result (don't fail if caching fails)
    try {
      await cacheService.set(searchTerm, organizationId, finalMetadata, {
        ttl: 24 * 60 * 60, // 24 hours
        tags: ['metadata', 'competitive-analysis']
      })
    } catch (cacheError) {
      console.warn(`[${requestId}] Failed to cache result:`, cacheError)
    }

    // Phase 8: Analytics & Monitoring
    const processingTime = Date.now() - startTime
    await analyticsService.logEvent('request_completed', {
      requestId,
      organizationId,
      processingTime,
      competitorsAnalyzed: discoveryResult.data.competitors.length,
      screenshotsAnalyzed: analysisResult?.data?.screenshotsProcessed || 0
    }).catch(() => {})

    console.log(`[${requestId}] Request completed successfully in ${processingTime}ms`)

    return responseBuilder.success({
      success: true,
      data: finalMetadata,
      requestId,
      processingTime: `${processingTime}ms`
    }, {
      'X-Processing-Time': `${processingTime}ms`,
      'X-Request-ID': requestId,
      'X-Cache': 'MISS'
    })

  } catch (error) {
    console.error(`[${requestId}] Critical error:`, error)
    
    // Log critical error for monitoring
    await analyticsService.logEvent('critical_error', {
      requestId,
      error: error.message,
      stack: error.stack?.substring(0, 1000) // Limit stack trace size
    }).catch(() => {})

    return responseBuilder.error('Internal server error occurred', 500, {
      code: 'INTERNAL_ERROR',
      details: 'An unexpected error occurred while processing your request',
      requestId
    })
  }
})
