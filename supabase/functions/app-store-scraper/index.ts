
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const VERSION = '7.2.0-emergency-body-fix'

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

    // Health Check Endpoint
    if (req.method === 'GET') {
      console.log(`🏥 [${correlationId}] Health check requested`)
      return new Response(JSON.stringify({
        status: 'ok',
        version: VERSION,
        timestamp: new Date().toISOString(),
        mode: 'emergency-body-fix',
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

    // EMERGENCY FIX: Robust body parsing with multiple strategies
    let requestData: any
    const contentType = req.headers.get('content-type') || ''
    
    console.log(`📋 [${correlationId}] PARSING REQUEST BODY:`, {
      contentType,
      hasBody: req.body !== null,
      bodyLocked: req.bodyUsed
    })

    try {
      // Strategy 1: Try standard JSON parsing first
      if (contentType.includes('application/json')) {
        console.log(`📥 [${correlationId}] Using JSON parsing strategy`)
        requestData = await req.json()
        console.log(`✅ [${correlationId}] JSON parsing successful:`, requestData)
      } else {
        // Strategy 2: Get raw text and attempt JSON parse
        console.log(`📥 [${correlationId}] Using text parsing strategy`)
        const rawText = await req.text()
        console.log(`📄 [${correlationId}] Raw body received:`, {
          length: rawText.length,
          content: rawText.substring(0, 500),
          isEmpty: rawText.trim() === ''
        })
        
        if (!rawText || rawText.trim() === '') {
          throw new Error('Request body is completely empty')
        }
        
        requestData = JSON.parse(rawText)
        console.log(`✅ [${correlationId}] Text-to-JSON parsing successful:`, requestData)
      }

      // Strategy 3: Validate parsed data structure
      if (!requestData || typeof requestData !== 'object') {
        throw new Error(`Invalid request data structure: ${typeof requestData}`)
      }

      console.log(`🎯 [${correlationId}] REQUEST DATA VALIDATED:`, {
        hasSearchTerm: !!requestData.searchTerm,
        hasOrgId: !!requestData.organizationId,
        searchTermType: typeof requestData.searchTerm,
        searchTermLength: requestData.searchTerm?.length || 0
      })

    } catch (parseError: any) {
      console.error(`💥 [${correlationId}] BODY PARSING FAILED:`, {
        error: parseError.message,
        stack: parseError.stack,
        contentType,
        receivedHeaders: Object.fromEntries(req.headers.entries())
      })
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Request body parsing failed',
        correlationId,
        details: {
          parseError: parseError.message,
          contentType,
          receivedHeaders: Object.fromEntries(req.headers.entries()),
          expectedFormat: '{"searchTerm": "string", "organizationId": "string"}'
        },
        version: VERSION
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Enhanced validation with detailed error reporting
    const validationErrors: string[] = []
    
    if (!requestData.searchTerm || typeof requestData.searchTerm !== 'string' || requestData.searchTerm.trim().length === 0) {
      validationErrors.push(`searchTerm is required and must be a non-empty string. Received: ${JSON.stringify(requestData.searchTerm)}`)
    }

    if (!requestData.organizationId || typeof requestData.organizationId !== 'string') {
      validationErrors.push(`organizationId is required and must be a string. Received: ${JSON.stringify(requestData.organizationId)}`)
    }

    if (validationErrors.length > 0) {
      console.error(`❌ [${correlationId}] VALIDATION FAILED:`, {
        errors: validationErrors,
        receivedRequest: requestData
      })
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Request validation failed',
        correlationId,
        validationErrors,
        receivedRequest: requestData,
        requiredFields: ['searchTerm', 'organizationId'],
        version: VERSION
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Extract validated request data
    const { searchTerm, searchType = 'keyword', organizationId, includeCompetitorAnalysis = true, searchParameters = {} } = requestData

    console.log(`🚀 [${correlationId}] PROCESSING VALIDATED REQUEST:`, {
      searchTerm,
      searchType,
      organizationId,
      includeCompetitorAnalysis,
      country: searchParameters.country || 'us',
      limit: searchParameters.limit || 25
    })

    // For now, return a test response to confirm body parsing is working
    const testResponse = {
      name: `Test App for "${searchTerm}"`,
      appId: `test-${Date.now()}`,
      title: `Search Results: ${searchTerm}`,
      subtitle: 'Emergency Body Fix Test Response',
      description: `This is a test response for search term: ${searchTerm}. Request body parsing is now working correctly.`,
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
      organizationId,
      bodyParsingFixed: true
    })

    return new Response(JSON.stringify({
      success: true,
      data: testResponse,
      correlationId,
      processingTime: `${processingTime}ms`,
      version: VERSION,
      debugMode: true,
      message: 'Emergency body fix successful - request parsing working'
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
