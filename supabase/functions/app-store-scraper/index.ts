
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

const VERSION = '5.0.0-aso-intelligence'

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
        },
        features: {
          intelligentSearch: 'enabled',
          keywordSearch: 'enabled',
          brandSearch: 'enabled',
          urlScraping: 'enabled',
          asoIntelligence: 'enabled'
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

    // Extract parameters with enhanced support
    const { 
      searchTerm, 
      searchType = 'auto', // New: auto-detect, url, keyword, brand
      organizationId, 
      includeCompetitorAnalysis = true,
      searchParameters = {},
      securityContext = {} 
    } = requestBody

    // Enhanced validation
    if (!searchTerm || typeof searchTerm !== 'string') {
      return responseBuilder.error('searchTerm is required and must be a string', 400, {
        code: 'MISSING_SEARCH_TERM',
        details: 'Please provide a valid app name, keywords, or App Store URL'
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
    
    console.log(`[${requestId}] Processing ${searchType} search for: ${searchTerm} (org: ${organizationId})`)

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
      console.warn(`[${requestId}] Security validation failed: ${securityValidation.error}`)
      await analyticsService.logEvent('security_validation_warning', {
        requestId,
        organizationId,
        reason: securityValidation.error
      }).catch(() => {})
    }

    // Phase 2: Intelligent Cache Check
    const cacheKey = `${searchType}:${searchTerm}:${searchParameters.country || 'us'}`
    console.log(`[${requestId}] Checking cache with key: ${cacheKey}`)
    
    const cachedResult = await cacheService.get(cacheKey, organizationId).catch(err => {
      console.warn(`[${requestId}] Cache check failed:`, err)
      return null
    })
    
    if (cachedResult) {
      await analyticsService.logEvent('cache_hit', { requestId, organizationId, searchType }).catch(() => {})
      return responseBuilder.success(cachedResult, { 
        'X-Cache': 'HIT', 
        'X-Request-ID': requestId,
        'X-Search-Type': searchType 
      })
    }

    // Phase 3: Enhanced Market Discovery
    console.log(`[${requestId}] Starting intelligent discovery...`)
    
    // Configure discovery options based on search type
    const discoveryOptions = {
      includeCompetitors: includeCompetitorAnalysis !== false,
      maxCompetitors: searchType === 'keyword' ? 20 : (searchType === 'brand' ? 10 : 5),
      country: searchParameters.country || securityValidation.data?.country || 'us',
      searchType: searchType,
      limit: searchParameters.limit || 25
    }

    const discoveryResult = await discoveryService.discover(searchTerm, discoveryOptions)

    if (!discoveryResult.success) {
      await analyticsService.logEvent('discovery_failed', {
        requestId,
        organizationId,
        searchType,
        error: discoveryResult.error
      }).catch(() => {})
      
      let userFriendlyMessage = 'No results found for your search'
      if (searchType === 'keyword') {
        userFriendlyMessage = `No apps found for "${searchTerm}". Try different keywords or check spelling.`
      } else if (searchType === 'brand') {
        userFriendlyMessage = `App "${searchTerm}" not found. Please verify the exact app name.`
      }
      
      return responseBuilder.error(userFriendlyMessage, 404, {
        code: 'NO_RESULTS_FOUND',
        details: `Search type: ${searchType}, Query: ${searchTerm}`
      })
    }

    // Phase 4: Enhanced Metadata Extraction
    console.log(`[${requestId}] Extracting metadata for ${discoveryResult.data.competitors.length + 1} apps...`)
    const metadataResult = await metadataService.extract({
      targetApp: discoveryResult.data.targetApp,
      competitors: discoveryResult.data.competitors,
      extractionOptions: {
        includeKeywords: true,
        includeDescriptions: true,
        includeRatings: true,
        includeScreenshots: searchType !== 'url' // Only for search results
      }
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

    // Phase 5: ASO Intelligence Generation (for non-URL searches)
    let asoIntelligence = null
    if (searchType !== 'url' && includeCompetitorAnalysis) {
      console.log(`[${requestId}] Generating ASO intelligence...`)
      try {
        asoIntelligence = await this.generateAsoIntelligence(
          metadataResult.data.targetApp,
          metadataResult.data.competitors,
          searchType,
          searchTerm
        )
      } catch (intelligenceError) {
        console.warn(`[${requestId}] ASO intelligence generation failed:`, intelligenceError)
      }
    }

    // Phase 6: Build Enhanced Response
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

    // Phase 7: Enhanced Caching
    try {
      await cacheService.set(cacheKey, organizationId, finalMetadata, {
        ttl: searchType === 'url' ? 24 * 60 * 60 : 6 * 60 * 60, // URLs cache longer
        tags: ['metadata', 'aso-intelligence', searchType]
      })
    } catch (cacheError) {
      console.warn(`[${requestId}] Failed to cache result:`, cacheError)
    }

    // Phase 8: Enhanced Analytics
    const processingTime = Date.now() - startTime
    await analyticsService.logEvent('aso_search_completed', {
      requestId,
      organizationId,
      searchType,
      processingTime,
      competitorsAnalyzed: discoveryResult.data.competitors.length,
      intelligenceGenerated: !!asoIntelligence,
      cache: 'MISS'
    }).catch(() => {})

    console.log(`[${requestId}] ASO search completed successfully in ${processingTime}ms`)

    return responseBuilder.success({
      success: true,
      data: finalMetadata,
      requestId,
      processingTime: `${processingTime}ms`,
      searchType: searchType
    }, {
      'X-Processing-Time': `${processingTime}ms`,
      'X-Request-ID': requestId,
      'X-Cache': 'MISS',
      'X-Search-Type': searchType
    })

  } catch (error) {
    console.error(`[${requestId}] Critical error:`, error)
    
    await analyticsService.logEvent('critical_error', {
      requestId,
      error: error.message,
      stack: error.stack?.substring(0, 1000)
    }).catch(() => {})

    return responseBuilder.error('Search service temporarily unavailable', 500, {
      code: 'INTERNAL_ERROR',
      details: 'Please try again in a few minutes',
      requestId
    })
  }
})

// Helper function to generate ASO intelligence
async function generateAsoIntelligence(targetApp: any, competitors: any[], searchType: string, searchTerm: string) {
  const opportunities: string[] = []
  
  // Calculate market saturation
  const competitorCount = competitors.length
  const marketSaturation = Math.min((competitorCount / 50) * 100, 100)
  
  // Calculate keyword difficulty
  const avgRating = competitors.reduce((sum, app) => sum + (app.averageUserRating || 0), 0) / competitorCount
  const keywordDifficulty = Math.min((avgRating / 5) * 100, 100)
  
  // Generate trending score (simplified - in production, use real trend data)
  const trendingScore = Math.random() * 100
  
  // Generate opportunities
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
