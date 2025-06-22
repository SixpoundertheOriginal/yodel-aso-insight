
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const VERSION = '8.0.0-real-search'

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

interface AppData {
  name: string
  appId: string
  title: string
  subtitle?: string
  description?: string
  url: string
  icon?: string
  rating?: number
  reviews?: number
  developer?: string
  applicationCategory?: string
  locale: string
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
        mode: 'real-search-enabled',
        correlationId,
        message: 'App Store scraper is ready for real searches'
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
        searchTerm: requestData.searchTerm,
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

    // Validate required fields
    if (!requestData.searchTerm || !requestData.organizationId) {
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

    const { searchTerm, searchType = 'keyword', organizationId, searchParameters = {} } = requestData
    const country = searchParameters.country || 'us'
    const limit = Math.min(searchParameters.limit || 5, 25) // Cap at 25 results

    console.log(`🚀 [${correlationId}] STARTING REAL APP STORE SEARCH:`, {
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

  } catch (error: any) {
    const processingTime = Date.now() - startTime
    console.error(`💥 [${correlationId}] CRITICAL ERROR:`, {
      error: error.message,
      stack: error.stack,
      processingTime: `${processingTime}ms`
    })
    
    return new Response(JSON.stringify({
      success: false,
      error: 'App Store search service temporarily unavailable',
      correlationId,
      details: error.message,
      version: VERSION
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

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
