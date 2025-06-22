import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { KeywordDiscoveryService } from './services/keyword-discovery.service.ts'

const VERSION = '8.1.0-keyword-discovery'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface SearchRequest {
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

serve(async (req: Request) => {
  const startTime = Date.now()
  const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID()

  console.log(`🔍 [${correlationId}] REQUEST RECEIVED:`, {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
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
        mode: 'real-search-with-keyword-discovery',
        correlationId,
        message: 'App Store scraper with keyword discovery ready'
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

    // Parse request body
    let requestData: any
    try {
      requestData = await req.json()
      console.log(`🎯 [${correlationId}] REQUEST PARSED:`, {
        hasSearchTerm: !!requestData.searchTerm,
        hasKeywordDiscovery: !!requestData.seedKeywords || !!requestData.competitorApps,
        organizationId: requestData.organizationId
      })
    } catch (error: any) {
      console.error(`💥 [${correlationId}] BODY PARSING FAILED:`, error.message)
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON in request body',
        correlationId
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Route to keyword discovery if appropriate parameters are present
    if (requestData.seedKeywords || requestData.competitorApps || requestData.targetApp) {
      return await handleKeywordDiscovery(requestData as KeywordDiscoveryRequest, correlationId, startTime)
    }

    // Continue with existing app search logic
    return await handleAppSearch(requestData as SearchRequest, correlationId, startTime)

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
    organizationId: request.organizationId,
    seedKeywords: request.seedKeywords?.length || 0,
    competitorApps: request.competitorApps?.length || 0,
    targetApp: !!request.targetApp
  })

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
  request: SearchRequest, 
  correlationId: string, 
  startTime: number
) {
  // Validate required fields
  if (!request.searchTerm || !request.organizationId) {
    console.error(`❌ [${correlationId}] VALIDATION FAILED`)
    return new Response(JSON.stringify({
      success: false,
      error: 'Missing required fields: searchTerm and organizationId',
      correlationId
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { searchTerm, searchType = 'keyword', organizationId, searchParameters = {} } = request
  const country = searchParameters.country || 'us'
  const limit = Math.min(searchParameters.limit || 5, 25)

  console.log(`🚀 [${correlationId}] STARTING APP STORE SEARCH:`, {
    searchTerm,
    searchType,
    country,
    limit
  })

  // Perform real App Store search using iTunes Search API
  const searchResults = await performRealAppStoreSearch(searchTerm, country, limit, correlationId)

  if (!searchResults || searchResults.length === 0) {
    console.log(`📭 [${correlationId}] NO RESULTS FOUND`)
    return new Response(JSON.stringify({
      success: false,
      error: `No apps found for "${searchTerm}" in ${country.toUpperCase()}`,
      correlationId,
      searchTerm,
      country
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const processingTime = Date.now() - startTime
  console.log(`✅ [${correlationId}] SEARCH COMPLETED:`, {
    resultsCount: searchResults.length,
    processingTime: `${processingTime}ms`
  })

  // Return multiple results for user selection
  return new Response(JSON.stringify({
    success: true,
    data: searchResults,
    correlationId,
    processingTime: `${processingTime}ms`,
    version: VERSION,
    searchContext: {
      query: searchTerm,
      country,
      resultsReturned: searchResults.length,
      totalFound: searchResults.length
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

function isAppStoreUrl(input: string): boolean {
  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`)
    return url.hostname.includes('apps.apple.com') || url.hostname.includes('play.google.com')
  } catch {
    return false
  }
}
