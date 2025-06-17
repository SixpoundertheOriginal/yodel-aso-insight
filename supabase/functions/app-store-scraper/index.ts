
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const VERSION = '7.0.0-emergency-bypass'

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

  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      console.log(`[${correlationId}] CORS preflight request`)
      return new Response(null, { headers: corsHeaders })
    }

    // Health Check Endpoint
    if (req.method === 'GET') {
      console.log(`[${correlationId}] Health check requested`)
      return new Response(JSON.stringify({
        status: 'ok',
        version: VERSION,
        timestamp: new Date().toISOString(),
        mode: 'emergency-bypass-enabled',
        correlationId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method !== 'POST') {
      console.warn(`[${correlationId}] Invalid method: ${req.method}`)
      return new Response(JSON.stringify({
        success: false,
        error: 'Method Not Allowed',
        correlationId
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse request body with enhanced logging
    let requestBody: SearchRequest
    try {
      const bodyText = await req.text()
      console.log(`[${correlationId}] Request body received:`, bodyText)
      
      if (!bodyText || bodyText.trim() === '') {
        throw new Error('Request body is empty')
      }
      requestBody = JSON.parse(bodyText)
      console.log(`[${correlationId}] Parsed request:`, requestBody)
    } catch (parseError) {
      console.error(`[${correlationId}] Failed to parse request:`, parseError)
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON in request body',
        correlationId,
        details: parseError.message
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { searchTerm, searchType = 'keyword', organizationId, includeCompetitorAnalysis = true, searchParameters = {} } = requestBody

    // Enhanced validation with specific error messages
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length === 0) {
      console.error(`[${correlationId}] Invalid searchTerm:`, searchTerm)
      return new Response(JSON.stringify({
        success: false,
        error: 'Search term is required and must be a non-empty string',
        correlationId,
        field: 'searchTerm',
        received: searchTerm
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!organizationId || typeof organizationId !== 'string') {
      console.error(`[${correlationId}] Invalid organizationId:`, organizationId)
      return new Response(JSON.stringify({
        success: false,
        error: 'Organization ID is required',
        correlationId,
        field: 'organizationId',
        received: organizationId
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[${correlationId}] Processing ${searchType} search: "${searchTerm}" (org: ${organizationId})`)

    // Emergency bypass for simple cases - reduce validation overhead
    let searchResult: AppData
    let competitors: AppData[] = []

    if (searchType === 'url' && isAppStoreUrl(searchTerm)) {
      console.log(`[${correlationId}] URL search path`)
      searchResult = await scrapeAppStoreUrl(searchTerm, correlationId)
    } else {
      console.log(`[${correlationId}] iTunes API search path`)
      const searchResponse = await searchItunesApi(
        searchTerm, 
        searchParameters.country || 'us', 
        searchParameters.limit || 25, 
        correlationId
      )
      
      if (!searchResponse || searchResponse.length === 0) {
        console.error(`[${correlationId}] No results found for: ${searchTerm}`)
        return new Response(JSON.stringify({
          success: false,
          error: `No apps found for "${searchTerm}". Try different keywords or check spelling.`,
          correlationId,
          searchTerm,
          suggestions: ['Check spelling', 'Try different keywords', 'Use more specific terms']
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      searchResult = searchResponse[0]
      
      if (includeCompetitorAnalysis && searchResponse.length > 1) {
        competitors = searchResponse.slice(1, 6)
      }
    }

    // Build enhanced response
    const finalResult = {
      ...searchResult,
      competitors: competitors,
      searchContext: {
        query: searchTerm,
        type: searchType,
        totalResults: competitors.length + 1,
        category: searchResult.applicationCategory || 'Unknown',
        country: searchParameters.country || 'us'
      }
    }

    const processingTime = Date.now() - startTime
    console.log(`[${correlationId}] Search completed successfully in ${processingTime}ms`)

    return new Response(JSON.stringify({
      success: true,
      data: finalResult,
      correlationId,
      processingTime: `${processingTime}ms`,
      version: VERSION,
      bypassEnabled: true
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Processing-Time': `${processingTime}ms`,
        'X-Correlation-ID': correlationId
      }
    })

  } catch (error) {
    console.error(`[${correlationId}] Critical error:`, error)
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Search service temporarily unavailable. Please try again.',
      correlationId,
      version: VERSION,
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Helper function to check if input is an App Store URL
function isAppStoreUrl(input: string): boolean {
  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`)
    return url.hostname.includes('apps.apple.com') || url.hostname.includes('play.google.com')
  } catch {
    return false
  }
}

async function searchItunesApi(term: string, country: string, limit: number, correlationId: string): Promise<AppData[]> {
  try {
    console.log(`[${correlationId}] Searching iTunes API: term="${term}", country="${country}", limit="${limit}"`)
    
    const encodedTerm = encodeURIComponent(term)
    const url = `https://itunes.apple.com/search?term=${encodedTerm}&country=${country}&entity=software&limit=${limit}`
    
    console.log(`[${correlationId}] iTunes API URL: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ASO-Insights-Platform/7.0.0-emergency-bypass'
      }
    })

    if (!response.ok) {
      throw new Error(`iTunes API responded with status: ${response.status}`)
    }

    const data = await response.json()
    console.log(`[${correlationId}] iTunes API returned ${data.results?.length || 0} results`)

    if (!data.results || data.results.length === 0) {
      return []
    }

    return data.results.map((app: any) => ({
      name: app.trackName || 'Unknown App',
      appId: app.trackId?.toString() || `itunes-${Date.now()}`,
      title: app.trackName || 'Unknown App',
      subtitle: app.trackCensoredName || '',
      description: app.description || '',
      url: app.trackViewUrl || '',
      icon: app.artworkUrl512 || app.artworkUrl100 || '',
      rating: app.averageUserRating || 0,
      reviews: app.userRatingCount || 0,
      developer: app.artistName || 'Unknown Developer',
      applicationCategory: app.primaryGenreName || 'Unknown',
      locale: 'en-US'
    }))

  } catch (error) {
    console.error(`[${correlationId}] iTunes API search failed:`, error)
    throw new Error(`iTunes search failed: ${error.message}`)
  }
}

async function scrapeAppStoreUrl(url: string, correlationId: string): Promise<AppData> {
  try {
    console.log(`[${correlationId}] Scraping App Store URL: ${url}`)
    
    const appIdMatch = url.match(/id(\d+)/)
    if (!appIdMatch) {
      throw new Error('Could not extract app ID from URL')
    }
    
    const appId = appIdMatch[1]
    const lookupUrl = `https://itunes.apple.com/lookup?id=${appId}`
    console.log(`[${correlationId}] iTunes Lookup URL: ${lookupUrl}`)
    
    const response = await fetch(lookupUrl)
    
    if (!response.ok) {
      throw new Error(`iTunes Lookup API responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.results || data.results.length === 0) {
      throw new Error('App not found')
    }

    const app = data.results[0]
    
    return {
      name: app.trackName || 'Unknown App',
      appId: app.trackId?.toString() || appId,
      title: app.trackName || 'Unknown App',
      subtitle: app.trackCensoredName || '',
      description: app.description || '',
      url: app.trackViewUrl || url,
      icon: app.artworkUrl512 || app.artworkUrl100 || '',
      rating: app.averageUserRating || 0,
      reviews: app.userRatingCount || 0,
      developer: app.artistName || 'Unknown Developer',
      applicationCategory: app.primaryGenreName || 'Unknown',
      locale: 'en-US'
    }

  } catch (error) {
    console.error(`[${correlationId}] App Store URL scraping failed:`, error)
    throw new Error(`Failed to scrape app data: ${error.message}`)
  }
}
