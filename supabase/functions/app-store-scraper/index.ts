
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const VERSION = '6.0.0-emergency-simplified'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  let requestId = crypto.randomUUID()

  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      console.log('[CORS] Handling preflight request')
      return new Response(null, { headers: corsHeaders })
    }

    // Health Check Endpoint
    if (req.method === 'GET') {
      console.log('[HEALTH] Health check requested')
      return new Response(JSON.stringify({
        status: 'ok',
        version: VERSION,
        timestamp: new Date().toISOString(),
        mode: 'emergency-simplified'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method !== 'POST') {
      console.warn('[METHOD] Invalid method:', req.method)
      return new Response(JSON.stringify({
        success: false,
        error: 'Method Not Allowed'
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse request body
    let requestBody: SearchRequest
    try {
      const bodyText = await req.text()
      if (!bodyText || bodyText.trim() === '') {
        throw new Error('Request body is empty')
      }
      requestBody = JSON.parse(bodyText)
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse request:`, parseError)
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON in request body'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { searchTerm, searchType = 'keyword', organizationId, includeCompetitorAnalysis = true, searchParameters = {} } = requestBody

    // Basic validation
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length === 0) {
      console.error(`[${requestId}] Invalid searchTerm:`, searchTerm)
      return new Response(JSON.stringify({
        success: false,
        error: 'Search term is required and must be a non-empty string'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!organizationId || typeof organizationId !== 'string') {
      console.error(`[${requestId}] Invalid organizationId:`, organizationId)
      return new Response(JSON.stringify({
        success: false,
        error: 'Organization ID is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[${requestId}] Processing ${searchType} search: "${searchTerm}" (org: ${organizationId})`)

    // Determine search strategy
    let searchResult: AppData
    let competitors: AppData[] = []

    if (searchType === 'url' && isAppStoreUrl(searchTerm)) {
      // Handle App Store URL scraping
      searchResult = await scrapeAppStoreUrl(searchTerm, requestId)
    } else {
      // Handle keyword/brand search using iTunes Search API
      const searchResponse = await searchItunesApi(searchTerm, searchParameters.country || 'us', searchParameters.limit || 25, requestId)
      
      if (!searchResponse || searchResponse.length === 0) {
        console.error(`[${requestId}] No results found for: ${searchTerm}`)
        return new Response(JSON.stringify({
          success: false,
          error: `No apps found for "${searchTerm}". Try different keywords or check spelling.`
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // First result is the target app
      searchResult = searchResponse[0]
      
      // Rest are competitors (if requested)
      if (includeCompetitorAnalysis && searchResponse.length > 1) {
        competitors = searchResponse.slice(1, 6) // Limit to 5 competitors for performance
      }
    }

    // Build final response
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
    console.log(`[${requestId}] Search completed successfully in ${processingTime}ms`)

    return new Response(JSON.stringify({
      success: true,
      data: finalResult,
      requestId,
      processingTime: `${processingTime}ms`,
      version: VERSION
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Processing-Time': `${processingTime}ms`,
        'X-Request-ID': requestId
      }
    })

  } catch (error) {
    console.error(`[${requestId}] Critical error:`, error)
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Search service temporarily unavailable. Please try again.',
      requestId,
      version: VERSION
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

// Simplified iTunes Search API integration
async function searchItunesApi(term: string, country: string, limit: number, requestId: string): Promise<AppData[]> {
  try {
    console.log(`[${requestId}] Searching iTunes API: term="${term}", country="${country}", limit="${limit}"`)
    
    const encodedTerm = encodeURIComponent(term)
    const url = `https://itunes.apple.com/search?term=${encodedTerm}&country=${country}&entity=software&limit=${limit}`
    
    console.log(`[${requestId}] iTunes API URL: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ASO-Insights-Platform/6.0.0'
      }
    })

    if (!response.ok) {
      throw new Error(`iTunes API responded with status: ${response.status}`)
    }

    const data = await response.json()
    console.log(`[${requestId}] iTunes API returned ${data.results?.length || 0} results`)

    if (!data.results || data.results.length === 0) {
      return []
    }

    // Transform iTunes API results to our format
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
    console.error(`[${requestId}] iTunes API search failed:`, error)
    throw new Error(`iTunes search failed: ${error.message}`)
  }
}

// Basic App Store URL scraping (simplified)
async function scrapeAppStoreUrl(url: string, requestId: string): Promise<AppData> {
  try {
    console.log(`[${requestId}] Scraping App Store URL: ${url}`)
    
    // Extract app ID from URL
    const appIdMatch = url.match(/id(\d+)/)
    if (!appIdMatch) {
      throw new Error('Could not extract app ID from URL')
    }
    
    const appId = appIdMatch[1]
    
    // Use iTunes Lookup API for URL-based requests
    const lookupUrl = `https://itunes.apple.com/lookup?id=${appId}`
    console.log(`[${requestId}] iTunes Lookup URL: ${lookupUrl}`)
    
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
    console.error(`[${requestId}] App Store URL scraping failed:`, error)
    throw new Error(`Failed to scrape app data: ${error.message}`)
  }
}
