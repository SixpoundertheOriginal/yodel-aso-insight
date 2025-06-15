
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

const VERSION = '4.0.0-enterprise-microservices'

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
    const requestBody = await req.json()
    const { searchTerm, organizationId, includeCompetitorAnalysis, securityContext } = requestBody

    if (!searchTerm || !organizationId) {
      return responseBuilder.error('Search term/URL and Organization ID are required', 400)
    }

    // Generate request ID for tracking
    requestId = crypto.randomUUID()

    // Phase 1: Security Validation
    console.log(`[${requestId}] Starting security validation...`)
    const securityValidation = await securityService.validateRequest({
      searchTerm,
      organizationId,
      securityContext,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown'
    })

    if (!securityValidation.success) {
      await analyticsService.logEvent('security_validation_failed', {
        requestId,
        organizationId,
        reason: securityValidation.error
      })
      return responseBuilder.error(securityValidation.error, 403)
    }

    // Phase 2: Cache Check
    console.log(`[${requestId}] Checking cache...`)
    const cachedResult = await cacheService.get(searchTerm, organizationId)
    if (cachedResult) {
      await analyticsService.logEvent('cache_hit', { requestId, organizationId })
      return responseBuilder.success(cachedResult, { 'X-Cache': 'HIT' })
    }

    // Phase 3: Market Discovery
    console.log(`[${requestId}] Starting market discovery...`)
    const discoveryResult = await discoveryService.discover(searchTerm, {
      includeCompetitors: includeCompetitorAnalysis !== false,
      maxCompetitors: 5,
      country: securityValidation.data.country || 'us'
    })

    if (!discoveryResult.success) {
      await analyticsService.logEvent('discovery_failed', {
        requestId,
        organizationId,
        error: discoveryResult.error
      })
      return responseBuilder.error(discoveryResult.error, 404)
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
      })
      return responseBuilder.error(metadataResult.error, 422)
    }

    // Phase 5: Screenshot Analysis (if enabled)
    let analysisResult = null
    if (includeCompetitorAnalysis) {
      console.log(`[${requestId}] Analyzing screenshots...`)
      analysisResult = await screenshotService.analyze({
        targetApp: metadataResult.data.targetApp,
        competitors: metadataResult.data.competitors.slice(0, 3), // Top 3 for analysis
        analysisType: 'competitive-intelligence'
      })

      if (!analysisResult.success) {
        console.warn(`[${requestId}] Screenshot analysis failed: ${analysisResult.error}`)
        // Don't fail the entire request for screenshot analysis
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

    // Phase 7: Cache Result
    await cacheService.set(searchTerm, organizationId, finalMetadata, {
      ttl: 24 * 60 * 60, // 24 hours
      tags: ['metadata', 'competitive-analysis']
    })

    // Phase 8: Analytics & Monitoring
    const processingTime = Date.now() - startTime
    await analyticsService.logEvent('request_completed', {
      requestId,
      organizationId,
      processingTime,
      competitorsAnalyzed: discoveryResult.data.competitors.length,
      screenshotsAnalyzed: analysisResult?.data?.screenshotsProcessed || 0
    })

    console.log(`[${requestId}] Request completed in ${processingTime}ms`)

    return responseBuilder.success(finalMetadata, {
      'X-Processing-Time': `${processingTime}ms`,
      'X-Request-ID': requestId,
      'X-Cache': 'MISS'
    })

  } catch (error) {
    console.error(`[${requestId}] Critical error:`, error)
    
    await analyticsService.logEvent('critical_error', {
      requestId,
      error: error.message,
      stack: error.stack
    }).catch(() => {}) // Don't let analytics failure break error handling

    return errorHandler.handle(error, requestId)
  }
})
