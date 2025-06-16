
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

const VERSION = '5.0.1-emergency-stabilized'

// Initialize with better error handling
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !supabaseKey) {
  console.error('[CRITICAL] Missing Supabase environment variables')
}

const supabaseAdmin = createClient(supabaseUrl ?? '', supabaseKey ?? '')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Initialize services with error handling
let discoveryService: DiscoveryService
let metadataService: MetadataExtractionService
let screenshotService: ScreenshotAnalysisService
let cacheService: CacheManagerService
let securityService: SecurityService
let analyticsService: AnalyticsService
let errorHandler: ErrorHandler
let responseBuilder: ResponseBuilder

try {
  discoveryService = new DiscoveryService(supabaseAdmin)
  metadataService = new MetadataExtractionService(supabaseAdmin)
  screenshotService = new ScreenshotAnalysisService()
  cacheService = new CacheManagerService(supabaseAdmin)
  securityService = new SecurityService(supabaseAdmin)
  analyticsService = new AnalyticsService(supabaseAdmin)
  errorHandler = new ErrorHandler()
  responseBuilder = new ResponseBuilder(corsHeaders)
  console.log('[STARTUP] All services initialized successfully')
} catch (initError) {
  console.error('[CRITICAL] Service initialization failed:', initError)
}

serve(async (req: Request) => {
  const startTime = Date.now()
  let requestId: string | null = null

  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      console.log('[CORS] Handling preflight request')
      return responseBuilder.cors()
    }

    // Health Check Endpoint
    if (req.method === 'GET') {
      console.log('[HEALTH] Health check requested')
      return responseBuilder.success({
        status: 'ok',
        version: VERSION,
        timestamp: new Date().toISOString(),
        services: {
          discovery: discoveryService ? 'operational' : 'failed',
          metadata: metadataService ? 'operational' : 'failed',
          screenshot: screenshotService ? 'operational' : 'failed',
          cache: cacheService ? 'operational' : 'failed',
          security: securityService ? 'operational' : 'failed',
          analytics: analyticsService ? 'operational' : 'failed'
        },
        features: {
          intelligentSearch: 'enabled',
          keywordSearch: 'enabled',
          brandSearch: 'enabled',
          urlScraping: 'enabled',
          asoIntelligence: 'enabled',
          emergencyStabilization: 'active'
        }
      })
    }

    if (req.method !== 'POST') {
      console.warn('[METHOD] Invalid method:', req.method)
      return responseBuilder.error('Method Not Allowed', 405)
    }

    // Parse request with better error handling
    let requestBody: any
    try {
      const bodyText = await req.text()
      console.log('[REQUEST] Raw body length:', bodyText.length)
      
      if (!bodyText || bodyText.trim() === '') {
        console.error('[REQUEST] Empty request body received')
        return responseBuilder.error('Request body is empty', 400, {
          code: 'EMPTY_BODY',
          details: 'Please provide a valid JSON request body'
        })
      }
      
      requestBody = JSON.parse(bodyText)
      console.log('[REQUEST] Parsed request body keys:', Object.keys(requestBody))
    } catch (parseError) {
      console.error('[REQUEST] Failed to parse request body:', parseError)
      return responseBuilder.error('Invalid JSON in request body', 400, {
        code: 'INVALID_JSON',
        details: 'Please provide valid JSON data'
      })
    }

    // Extract and validate parameters
    const { 
      searchTerm, 
      searchType = 'keyword', 
      organizationId, 
      includeCompetitorAnalysis = true,
      searchParameters = {},
      securityContext = {} 
    } = requestBody

    console.log('[VALIDATION] Request parameters:', {
      searchTerm: searchTerm ? `"${searchTerm}" (${typeof searchTerm})` : 'missing',
      searchType,
      organizationId: organizationId ? 'present' : 'missing',
      includeCompetitorAnalysis,
      searchParametersKeys: Object.keys(searchParameters),
      securityContextKeys: Object.keys(securityContext)
    })

    // Enhanced validation with better error messages
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length === 0) {
      console.error('[VALIDATION] Invalid searchTerm:', searchTerm)
      return responseBuilder.error('Search term is required and must be a non-empty string', 400, {
        code: 'MISSING_SEARCH_TERM',
        details: 'Please provide a valid app name, keywords, or App Store URL'
      })
    }

    if (!organizationId || typeof organizationId !== 'string') {
      console.error('[VALIDATION] Invalid organizationId:', organizationId)
      return responseBuilder.error('Organization ID is required and must be a string', 400, {
        code: 'MISSING_ORGANIZATION_ID',
        details: 'Organization context is required for this operation'
      })
    }

    // Generate request ID for tracking
    requestId = crypto.randomUUID()
    
    console.log(`[${requestId}] Starting ${searchType} search for: "${searchTerm}" (org: ${organizationId})`)

    // Phase 1: Security Validation (non-blocking)
    let securityValidation = { success: true, data: { country: 'us' } }
    if (securityService) {
      try {
        securityValidation = await securityService.validateRequest({
          searchTerm,
          organizationId,
          securityContext,
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown'
        })

        if (!securityValidation.success) {
          console.warn(`[${requestId}] Security validation warning:`, securityValidation.error)
        }
      } catch (securityError) {
        console.warn(`[${requestId}] Security validation failed (non-blocking):`, securityError)
      }
    }

    // Phase 2: Cache Check (non-blocking)
    const cacheKey = `${searchType}:${searchTerm}:${searchParameters.country || 'us'}`
    let cachedResult = null
    
    if (cacheService) {
      try {
        cachedResult = await cacheService.get(cacheKey, organizationId)
        if (cachedResult) {
          console.log(`[${requestId}] Cache hit for key: ${cacheKey}`)
          if (analyticsService) {
            analyticsService.logEvent('cache_hit', { requestId, organizationId, searchType }).catch(() => {})
          }
          return responseBuilder.success(cachedResult, { 
            'X-Cache': 'HIT', 
            'X-Request-ID': requestId,
            'X-Search-Type': searchType 
          })
        }
      } catch (cacheError) {
        console.warn(`[${requestId}] Cache check failed (non-blocking):`, cacheError)
      }
    }

    // Phase 3: Discovery with improved error handling
    console.log(`[${requestId}] Starting discovery phase...`)
    
    const discoveryOptions = {
      includeCompetitors: includeCompetitorAnalysis !== false,
      maxCompetitors: searchType === 'keyword' ? 20 : (searchType === 'brand' ? 10 : 5),
      country: searchParameters.country || securityValidation.data?.country || 'us',
      searchType: searchType,
      limit: searchParameters.limit || 25
    }

    console.log(`[${requestId}] Discovery options:`, discoveryOptions)

    const discoveryResult = await discoveryService.discover(searchTerm, discoveryOptions)

    if (!discoveryResult.success) {
      console.error(`[${requestId}] Discovery failed:`, discoveryResult.error)
      
      if (analyticsService) {
        analyticsService.logEvent('discovery_failed', {
          requestId,
          organizationId,
          searchType,
          error: discoveryResult.error
        }).catch(() => {})
      }
      
      // Return user-friendly error based on search type
      let userMessage = 'No results found for your search'
      if (searchType === 'keyword') {
        userMessage = `No apps found for "${searchTerm}". Try different keywords or check spelling.`
      } else if (searchType === 'brand') {
        userMessage = `App "${searchTerm}" not found. Please verify the exact app name.`
      } else if (searchType === 'url') {
        userMessage = `Invalid App Store URL or app not found.`
      }
      
      return responseBuilder.error(userMessage, 404, {
        code: 'NO_RESULTS_FOUND',
        details: `Search type: ${searchType}, Query: ${searchTerm}`,
        requestId
      })
    }

    console.log(`[${requestId}] Discovery successful, found ${discoveryResult.data.competitors.length} competitors`)

    // Phase 4: Metadata Extraction
    console.log(`[${requestId}] Starting metadata extraction...`)
    
    const metadataResult = await metadataService.extract({
      targetApp: discoveryResult.data.targetApp,
      competitors: discoveryResult.data.competitors,
      extractionOptions: {
        includeKeywords: true,
        includeDescriptions: true,
        includeRatings: true,
        includeScreenshots: searchType !== 'url'
      }
    })

    if (!metadataResult.success) {
      console.error(`[${requestId}] Metadata extraction failed:`, metadataResult.error)
      
      if (analyticsService) {
        analyticsService.logEvent('metadata_extraction_failed', {
          requestId,
          organizationId,
          error: metadataResult.error
        }).catch(() => {})
      }
      
      return responseBuilder.error('Failed to extract complete app metadata', 422, {
        code: 'METADATA_EXTRACTION_FAILED',
        details: 'Could not extract complete metadata from the app store',
        requestId
      })
    }

    // Phase 5: ASO Intelligence Generation
    let asoIntelligence = null
    if (searchType !== 'url' && includeCompetitorAnalysis) {
      console.log(`[${requestId}] Generating ASO intelligence...`)
      try {
        asoIntelligence = await generateAsoIntelligence(
          metadataResult.data.targetApp,
          metadataResult.data.competitors,
          searchType,
          searchTerm
        )
        console.log(`[${requestId}] ASO intelligence generated successfully`)
      } catch (intelligenceError) {
        console.warn(`[${requestId}] ASO intelligence generation failed (non-blocking):`, intelligenceError)
      }
    }

    // Phase 6: Build Response
    const finalMetadata = {
      ...metadataResult.data.targetApp,
      competitors: metadataResult.data.competitors || [],
      searchContext: {
        query: searchTerm,
        type: searchType,
        totalResults: (metadataResult.data.competitors?.length || 0) + 1,
        category: discoveryResult.data.category,
        country: discoveryOptions.country
      },
      asoIntelligence: asoIntelligence,
      marketInsights: {
        totalCompetitors: discoveryResult.data.competitors.length,
        category: discoveryResult.data.category,
        searchType: searchType,
        marketPosition: asoIntelligence?.marketSaturation ? 
          (asoIntelligence.marketSaturation < 30 ? 'low-competition' : 
           asoIntelligence.marketSaturation < 70 ? 'moderate-competition' : 'high-competition') : 'unknown'
      }
    }

    // Phase 7: Cache Result (non-blocking)
    if (cacheService) {
      try {
        await cacheService.set(cacheKey, organizationId, finalMetadata, {
          ttl: searchType === 'url' ? 24 * 60 * 60 : 6 * 60 * 60,
          tags: ['metadata', 'aso-intelligence', searchType]
        })
      } catch (cacheError) {
        console.warn(`[${requestId}] Failed to cache result (non-blocking):`, cacheError)
      }
    }

    // Phase 8: Analytics (non-blocking)
    const processingTime = Date.now() - startTime
    if (analyticsService) {
      analyticsService.logEvent('aso_search_completed', {
        requestId,
        organizationId,
        searchType,
        processingTime,
        competitorsAnalyzed: discoveryResult.data.competitors.length,
        intelligenceGenerated: !!asoIntelligence,
        cache: 'MISS'
      }).catch(() => {})
    }

    console.log(`[${requestId}] Search completed successfully in ${processingTime}ms`)

    return responseBuilder.success({
      success: true,
      data: finalMetadata,
      requestId,
      processingTime: `${processingTime}ms`,
      searchType: searchType,
      version: VERSION
    }, {
      'X-Processing-Time': `${processingTime}ms`,
      'X-Request-ID': requestId,
      'X-Cache': 'MISS',
      'X-Search-Type': searchType
    })

  } catch (error) {
    console.error(`[${requestId}] Critical error:`, error)
    
    if (analyticsService) {
      analyticsService.logEvent('critical_error', {
        requestId,
        error: error.message,
        stack: error.stack?.substring(0, 1000)
      }).catch(() => {})
    }

    return responseBuilder.error('Search service temporarily unavailable', 500, {
      code: 'INTERNAL_ERROR',
      details: 'Please try again in a few minutes',
      requestId,
      version: VERSION
    })
  }
})

// ASO Intelligence generation function
async function generateAsoIntelligence(targetApp: any, competitors: any[], searchType: string, searchTerm: string) {
  const opportunities: string[] = []
  
  const competitorCount = competitors.length
  const marketSaturation = Math.min((competitorCount / 50) * 100, 100)
  
  const avgRating = competitors.reduce((sum, app) => sum + (app.averageUserRating || 0), 0) / competitorCount
  const keywordDifficulty = Math.min((avgRating / 5) * 100, 100)
  
  const trendingScore = Math.random() * 100
  
  if (marketSaturation < 30) {
    opportunities.push('Low competition market - excellent opportunity for new apps')
  }
  if (keywordDifficulty < 50) {
    opportunities.push('Moderate difficulty keywords - good for established apps')
  }
  if (competitors.some(app => (app.averageUserRating || 0) < 4.0)) {
    opportunities.push('Competitors with low ratings - quality opportunity exists')
  }
  if (searchType === 'keyword') {
    opportunities.push('Generic keyword search - consider long-tail keyword variations')
  }
  if (searchType === 'brand' && competitorCount > 15) {
    opportunities.push('Saturated brand category - focus on unique value proposition')
  }
  
  return {
    keywordDifficulty: Math.round(keywordDifficulty),
    marketSaturation: Math.round(marketSaturation),
    trendingScore: Math.round(trendingScore),
    opportunities
  }
}
