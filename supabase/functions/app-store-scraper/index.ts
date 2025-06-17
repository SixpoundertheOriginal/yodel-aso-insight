
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const VERSION = '7.1.0-emergency-debug'

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

  // EMERGENCY DEBUG: Log all request details
  console.log(`🔍 [${correlationId}] REQUEST RECEIVED:`, {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
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

    // Health Check Endpoint - Phase 2: Minimal Connectivity Test
    if (req.method === 'GET') {
      console.log(`🏥 [${correlationId}] Health check requested`)
      return new Response(JSON.stringify({
        status: 'ok',
        version: VERSION,
        timestamp: new Date().toISOString(),
        mode: 'emergency-debug-enabled',
        correlationId,
        message: 'Edge function is healthy and ready'
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

    // EMERGENCY DEBUG: Enhanced body parsing with multiple strategies
    let requestBody: SearchRequest
    let rawBody: string = ''
    
    try {
      // Strategy 1: Get raw text first
      rawBody = await req.text()
      console.log(`📥 [${correlationId}] RAW BODY RECEIVED:`, {
        length: rawBody.length,
        contentType: req.headers.get('content-type'),
        bodyPreview: rawBody.substring(0, 200),
        isEmpty: rawBody.trim() === '',
        isJson: rawBody.trim().startsWith('{')
      })

      // Strategy 2: Validate and parse JSON
      if (!rawBody || rawBody.trim() === '') {
        throw new Error('Request body is empty or undefined')
      }

      if (!rawBody.trim().startsWith('{')) {
        throw new Error(`Request body is not valid JSON. Received: ${rawBody.substring(0, 100)}`)
      }

      requestBody = JSON.parse(rawBody)
      console.log(`✅ [${correlationId}] PARSED REQUEST SUCCESSFULLY:`, {
        searchTerm: requestBody.searchTerm,
        searchType: requestBody.searchType,
        organizationId: requestBody.organizationId,
        hasOptionalParams: !!requestBody.searchParameters
      })

    } catch (parseError: any) {
      console.error(`❌ [${correlationId}] BODY PARSING FAILED:`, {
        error: parseError.message,
        rawBodyLength: rawBody.length,
        rawBodySample: rawBody.substring(0, 200),
        contentType: req.headers.get('content-type'),
        userAgent: req.headers.get('user-agent')
      })
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Request body parsing failed',
        correlationId,
        details: {
          parseError: parseError.message,
          receivedBodyLength: rawBody.length,
          receivedBodySample: rawBody.substring(0, 200),
          expectedFormat: '{"searchTerm": "string", "organizationId": "string"}'
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // EMERGENCY DEBUG: Enhanced validation with detailed error reporting
    const validationErrors: string[] = []
    
    if (!requestBody.searchTerm || typeof requestBody.searchTerm !== 'string' || requestBody.searchTerm.trim().length === 0) {
      validationErrors.push(`searchTerm is required and must be a non-empty string. Received: ${JSON.stringify(requestBody.searchTerm)}`)
    }

    if (!requestBody.organizationId || typeof requestBody.organizationId !== 'string') {
      validationErrors.push(`organizationId is required and must be a string. Received: ${JSON.stringify(requestBody.organizationId)}`)
    }

    if (validationErrors.length > 0) {
      console.error(`❌ [${correlationId}] VALIDATION FAILED:`, {
        errors: validationErrors,
        receivedRequest: requestBody
      })
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Request validation failed',
        correlationId,
        validationErrors,
        receivedRequest: requestBody,
        requiredFields: ['searchTerm', 'organizationId']
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // If we reach here, validation passed
    const { searchTerm, searchType = 'keyword', organizationId, includeCompetitorAnalysis = true, searchParameters = {} } = requestBody

    console.log(`🚀 [${correlationId}] PROCESSING VALIDATED REQUEST:`, {
      searchTerm,
      searchType,
      organizationId,
      includeCompetitorAnalysis,
      country: searchParameters.country || 'us',
      limit: searchParameters.limit || 25
    })

    // For now, let's return a simple success response to test connectivity
    // This will be replaced with actual scraping logic once we confirm the infrastructure is working
    const testResponse = {
      name: `Test App for "${searchTerm}"`,
      appId: `test-${Date.now()}`,
      title: `Search Results: ${searchTerm}`,
      subtitle: 'Infrastructure Test Response',
      description: `This is a test response for search term: ${searchTerm}. Infrastructure is working correctly.`,
      url: 'https://apps.apple.com/test',
      icon: '',
      rating: 4.5,
      reviews: 1000,
      developer: 'Test Developer',
      applicationCategory: 'Utilities',
      locale: 'en-US',
      competitors: [],
      searchContext: {
        query: searchTerm,
        type: searchType,
        totalResults: 1,
        category: 'Test',
        country: searchParameters.country || 'us'
      }
    }

    const processingTime = Date.now() - startTime
    console.log(`✅ [${correlationId}] REQUEST COMPLETED SUCCESSFULLY:`, {
      processingTime: `${processingTime}ms`,
      searchTerm,
      organizationId
    })

    return new Response(JSON.stringify({
      success: true,
      data: testResponse,
      correlationId,
      processingTime: `${processingTime}ms`,
      version: VERSION,
      debugMode: true,
      message: 'Infrastructure test successful - ready for real scraping'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Processing-Time': `${processingTime}ms`,
        'X-Correlation-ID': correlationId,
        'X-Debug-Mode': 'enabled'
      },
      status: 200
    })

  } catch (error: any) {
    const processingTime = Date.now() - startTime
    console.error(`💥 [${correlationId}] CRITICAL ERROR:`, {
      error: error.message,
      stack: error.stack,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString()
    })
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      correlationId,
      details: {
        message: error.message,
        stack: error.stack,
        processingTime: `${processingTime}ms`
      },
      version: VERSION,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Utility functions for when we restore full functionality
function isAppStoreUrl(input: string): boolean {
  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`)
    return url.hostname.includes('apps.apple.com') || url.hostname.includes('play.google.com')
  } catch {
    return false
  }
}
