
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { KeywordDiscoveryService } from './services/keyword-discovery.service.ts'

const VERSION = '8.3.0-stabilized'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface AppSearchRequest {
  searchTerm: string
  searchType?: 'keyword' | 'brand' | 'url'
  organizationId: string
  includeCompetitorAnalysis?: boolean
  searchParameters?: {
    country?: string
    limit?: number
  }
}

interface KeywordDiscoveryRequest {
  organizationId: string
  targetApp?: {
    name: string
    appId: string
    category: string
  }
  competitorApps?: string[]
  seedKeywords?: string[]
  country?: string
  maxKeywords?: number
}

interface AppData {
  name: string
  appId: string
  title: string
  subtitle: string
  description: string
  url: string
  icon: string
  rating: number
  reviews: number
  developer: string
  applicationCategory: string
  locale: string
}

serve(async (req: Request) => {
  const startTime = Date.now()
  const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID()

  console.log(`🔍 [${correlationId}] REQUEST RECEIVED:`, {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    contentType: req.headers.get('content-type'),
    contentLength: req.headers.get('content-length')
  })

  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      console.log(`✅ [${correlationId}] CORS preflight request`)
      return new Response(null, { 
        headers: corsHeaders,
        status: 200 
      })
    }

    // Health Check Endpoint
    if (req.method === 'GET') {
      console.log(`🏥 [${correlationId}] Health check requested`)
      return new Response(JSON.stringify({
        status: 'ok',
        version: VERSION,
        timestamp: new Date().toISOString(),
        mode: 'stabilized-routing',
        correlationId,
        message: 'App Store scraper with stabilized routing ready'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    if (req.method !== 'POST') {
      console.warn(`❌ [${correlationId}] Invalid method: ${req.method}`)
      return new Response(JSON.stringify({
        success: false,
        error: 'Method Not Allowed',
        correlationId,
        allowedMethods: ['GET', 'POST', 'OPTIONS']
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // STABILIZED REQUEST BODY PARSING with detailed debugging
    let requestBody: string | null = null
    let requestData: any = null
    
    try {
      // First, get the raw body text
      requestBody = await req.text()
      console.log(`📝 [${correlationId}] RAW REQUEST BODY:`, {
        length: requestBody?.length || 0,
        isEmpty: !requestBody || requestBody.trim() === '',
        firstChars: requestBody?.substring(0, 100) || 'EMPTY',
        lastChars: requestBody?.length > 100 ? requestBody.substring(requestBody.length - 50) : 'N/A'
      })

      // Check if body is empty or invalid
      if (!requestBody || requestBody.trim() === '') {
        console.error(`💥 [${correlationId}] EMPTY REQUEST BODY`)
        return new Response(JSON.stringify({
          success: false,
          error: 'Request body is empty',
          correlationId,
          debug: {
            bodyLength: requestBody?.length || 0,
            contentType: req.headers.get('content-type')
          }
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Parse JSON with error handling
      try {
        requestData = JSON.parse(requestBody)
        console.log(`✅ [${correlationId}] JSON PARSED SUCCESSFULLY:`, {
          hasSearchTerm: !!requestData.searchTerm,
          hasTargetApp: !!requestData.targetApp,
          hasCompetitorApps: !!requestData.competitorApps,
          hasSeedKeywords: !!requestData.seedKeywords,
          includeCompetitorAnalysis: requestData.includeCompetitorAnalysis,
          organizationId: requestData.organizationId?.substring(0, 8) + '...'
        })
      } catch (jsonError: any) {
        console.error(`💥 [${correlationId}] JSON PARSING FAILED:`, {
          error: jsonError.message,
          bodyPreview: requestBody.substring(0, 200),
          bodyLength: requestBody.length
        })
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
          correlationId,
          debug: {
            jsonError: jsonError.message,
            bodyPreview: requestBody.substring(0, 100)
          }
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    } catch (bodyError: any) {
      console.error(`💥 [${correlationId}] BODY READING FAILED:`, bodyError.message)
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to read request body',
        correlationId,
        details: bodyError.message
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // STABILIZED ROUTING LOGIC with clear criteria
    const hasSearchTerm = !!(requestData.searchTerm && typeof requestData.searchTerm === 'string' && requestData.searchTerm.trim().length > 0)
    const hasOrganizationId = !!(requestData.organizationId && typeof requestData.organizationId === 'string')
    const hasKeywordDiscoveryFields = !!(requestData.seedKeywords || requestData.competitorApps || requestData.targetApp)
    
    // Clear routing decision logic
    const isAppSearch = hasSearchTerm && hasOrganizationId && !hasKeywordDiscoveryFields
    const isKeywordDiscovery = hasKeywordDiscoveryFields || (!hasSearchTerm && hasOrganizationId)

    console.log(`🔀 [${correlationId}] STABILIZED ROUTING DECISION:`, {
      hasSearchTerm,
      hasOrganizationId,
      hasKeywordDiscoveryFields,
      isAppSearch,
      isKeywordDiscovery,
      searchTerm: requestData.searchTerm,
      includeCompetitorAnalysis: requestData.includeCompetitorAnalysis
    })

    // Validate routing decision
    if (!isAppSearch && !isKeywordDiscovery) {
      console.error(`❌ [${correlationId}] ROUTING VALIDATION FAILED`)
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid request: Cannot determine request type',
        correlationId,
        debug: {
          hasSearchTerm,
          hasOrganizationId,
          hasKeywordDiscoveryFields,
          receivedFields: Object.keys(requestData)
        },
        requirements: {
          appSearch: 'Requires: searchTerm + organizationId (no keyword discovery fields)',
          keywordDiscovery: 'Requires: organizationId + (seedKeywords OR competitorApps OR targetApp)'
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (isKeywordDiscovery) {
      console.log(`🔍 [${correlationId}] ROUTING TO: Keyword Discovery`)
      return await handleKeywordDiscovery(requestData as KeywordDiscoveryRequest, correlationId, startTime)
    }

    if (isAppSearch) {
      console.log(`📱 [${correlationId}] ROUTING TO: App Search`)
      return await handleAppSearch(requestData as AppSearchRequest, correlationId, startTime)
    }

    // This should never be reached due to validation above
    console.error(`❌ [${correlationId}] ROUTING FALLTHROUGH - This should not happen`)
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal routing error',
      correlationId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    const processingTime = Date.now() - startTime
    console.error(`💥 [${correlationId}] CRITICAL ERROR:`, {
      error: error.message,
      stack: error.stack,
      processingTime: `${processingTime}ms`
    })
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Service temporarily unavailable',
      correlationId,
      details: error.message,
      version: VERSION
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function handleKeywordDiscovery(
  request: KeywordDiscoveryRequest, 
  correlationId: string, 
  startTime: number
) {
  console.log(`🔍 [${correlationId}] KEYWORD DISCOVERY REQUEST:`, {
    organizationId: request.organizationId?.substring(0, 8) + '...',
    seedKeywords: request.seedKeywords?.length || 0,
    competitorApps: request.competitorApps?.length || 0,
    targetApp: !!request.targetApp
  })

  // Validate required fields for keyword discovery
  if (!request.organizationId) {
    console.error(`❌ [${correlationId}] KEYWORD DISCOVERY VALIDATION FAILED: Missing organizationId`)
    return new Response(JSON.stringify({
      success: false,
      error: 'Missing required field: organizationId is required for keyword discovery',
      correlationId
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const discoveryService = new KeywordDiscoveryService()
  
  try {
    const keywords = await discoveryService.discoverKeywords({
      organizationId: request.organizationId,
      targetApp: request.targetApp,
      competitorApps: request.competitorApps,
      seedKeywords: request.seedKeywords,
      country: request.country || 'us',
      maxKeywords: request.maxKeywords || 200
    })

    const processingTime = Date.now() - startTime
    console.log(`✅ [${correlationId}] KEYWORD DISCOVERY COMPLETED:`, {
      keywordsFound: keywords.length,
      processingTime: `${processingTime}ms`
    })

    return new Response(JSON.stringify({
      success: true,
      data: {
        keywords,
        totalFound: keywords.length,
        sources: [...new Set(keywords.map(k => k.source))],
        averageDifficulty: keywords.reduce((sum, k) => sum + k.difficulty, 0) / keywords.length,
        totalEstimatedVolume: keywords.reduce((sum, k) => sum + k.estimatedVolume, 0)
      },
      correlationId,
      processingTime: `${processingTime}ms`,
      version: VERSION
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Processing-Time': `${processingTime}ms`,
        'X-Correlation-ID': correlationId
      },
      status: 200
    })

  } catch (error: any) {
    console.error(`❌ [${correlationId}] KEYWORD DISCOVERY FAILED:`, error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Keyword discovery failed',
      details: error.message,
      correlationId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function handleAppSearch(
  request: AppSearchRequest, 
  correlationId: string, 
  startTime: number
) {
  // ENHANCED VALIDATION for app search
  if (!request.searchTerm || typeof request.searchTerm !== 'string' || request.searchTerm.trim() === '') {
    console.error(`❌ [${correlationId}] APP SEARCH VALIDATION FAILED: Invalid searchTerm`)
    return new Response(JSON.stringify({
      success: false,
      error: 'Missing or invalid searchTerm: must be a non-empty string',
      correlationId,
      received: {
        searchTerm: request.searchTerm,
        searchTermType: typeof request.searchTerm
      }
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (!request.organizationId || typeof request.organizationId !== 'string') {
    console.error(`❌ [${correlationId}] APP SEARCH VALIDATION FAILED: Invalid organizationId`)
    return new Response(JSON.stringify({
      success: false,
      error: 'Missing or invalid organizationId: must be a non-empty string',
      correlationId,
      received: {
        organizationId: request.organizationId,
        organizationIdType: typeof request.organizationId
      }
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { searchTerm, searchType = 'keyword', organizationId, searchParameters = {} } = request
  const country = searchParameters.country || 'us'
  const limit = Math.min(searchParameters.limit || 5, 25)

  console.log(`🚀 [${correlationId}] STARTING APP STORE SEARCH:`, {
    searchTerm: searchTerm.trim(),
    searchType,
    country,
    limit,
    includeCompetitors: request.includeCompetitorAnalysis
  })

  try {
    // Perform real App Store search using iTunes Search API
    const searchResults = await performRealAppStoreSearch(searchTerm.trim(), country, limit, correlationId)

    if (!searchResults || searchResults.length === 0) {
      console.log(`📭 [${correlationId}] NO RESULTS FOUND`)
      return new Response(JSON.stringify({
        success: false,
        error: `No apps found for "${searchTerm.trim()}" in ${country.toUpperCase()}`,
        correlationId,
        searchTerm: searchTerm.trim(),
        country,
        suggestions: [
          'Try a different app name or keyword',
          'Check the spelling of the app name',
          'Try searching for the developer name instead',
          'Use more specific search terms'
        ]
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const processingTime = Date.now() - startTime
    console.log(`✅ [${correlationId}] APP SEARCH COMPLETED:`, {
      resultsCount: searchResults.length,
      processingTime: `${processingTime}ms`
    })

    // If only one result, return it as the target app
    // If multiple results, return the first as target and rest as competitors
    const targetApp = searchResults[0]
    const competitors = request.includeCompetitorAnalysis ? searchResults.slice(1) : []

    return new Response(JSON.stringify({
      success: true,
      data: {
        ...targetApp,
        competitors
      },
      correlationId,
      processingTime: `${processingTime}ms`,
      version: VERSION,
      searchContext: {
        query: searchTerm.trim(),
        country,
        resultsReturned: searchResults.length,
        totalFound: searchResults.length,
        includeCompetitors: request.includeCompetitorAnalysis
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Processing-Time': `${processingTime}ms`,
        'X-Correlation-ID': correlationId
      },
      status: 200
    })

  } catch (error: any) {
    console.error(`❌ [${correlationId}] APP SEARCH FAILED:`, {
      error: error.message,
      searchTerm: searchTerm.trim(),
      country
    })
    
    return new Response(JSON.stringify({
      success: false,
      error: `App search failed: ${error.message}`,
      correlationId,
      searchTerm: searchTerm.trim(),
      details: 'The iTunes Search API may be temporarily unavailable. Please try again later.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function performRealAppStoreSearch(searchTerm: string, country: string, limit: number, correlationId: string): Promise<AppData[]> {
  try {
    console.log(`🔍 [${correlationId}] CALLING ITUNES SEARCH API:`, {
      term: searchTerm,
      country,
      limit
    })

    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&country=${country}&entity=software&limit=${limit}`
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'ASO-Insights-Platform/1.0'
      }
    })

    if (!response.ok) {
      console.error(`❌ [${correlationId}] ITUNES API ERROR:`, {
        status: response.status,
        statusText: response.statusText
      })
      throw new Error(`iTunes API returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    console.log(`📊 [${correlationId}] ITUNES API RESPONSE:`, {
      resultCount: data.resultCount,
      resultsLength: data.results?.length || 0
    })

    if (!data.results || data.results.length === 0) {
      return []
    }

    // Transform iTunes API results to our format
    const transformedResults: AppData[] = data.results.map((app: any) => ({
      name: app.trackName || app.bundleId,
      appId: app.trackId?.toString() || app.bundleId,
      title: app.trackName || app.bundleId,
      subtitle: app.subtitle || '',
      description: app.description || '',
      url: app.trackViewUrl || '',
      icon: app.artworkUrl512 || app.artworkUrl100 || app.artworkUrl60 || '',
      rating: app.averageUserRating || 0,
      reviews: app.userRatingCount || 0,
      developer: app.artistName || app.sellerName || '',
      applicationCategory: app.primaryGenreName || app.genres?.[0] || '',
      locale: 'en-US'
    }))

    console.log(`✅ [${correlationId}] TRANSFORMED ${transformedResults.length} RESULTS`)
    
    return transformedResults

  } catch (error: any) {
    console.error(`💥 [${correlationId}] SEARCH FAILED:`, {
      error: error.message,
      searchTerm,
      country
    })
    throw error
  }
}
