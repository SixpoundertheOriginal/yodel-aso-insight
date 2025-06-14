
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VERSION = '3.0.0-enterprise-scraper' // Versioning for monitoring deployment consistency

// --- Enterprise Architecture: Standardized Data Contracts ---
interface ScrapedMetadata {
  name?: string
  description?: string
  applicationCategory?: string
  operatingSystem?: string
  screenshot?: string[]
  url?: string
  author?: string
  ratingValue?: number
  reviewCount?: number
}

// Function to validate if the string is a plausible Apple App Store URL
const isAppStoreUrl = (str: string): boolean => {
  try {
    const url = new URL(str)
    return url.hostname === 'apps.apple.com'
  } catch (_) {
    return false
  }
}

// --- Enterprise Architecture: Resilient Extraction Helpers ---

/**
 * Extracts content from a meta tag using a flexible regex.
 * @param html The full HTML content of the page.
 * @param propertyType 'name' or 'property' to distinguish between <meta name="..."> and <meta property="...">.
 * @param value The value of the name/property attribute to look for (e.g., 'og:title').
 * @returns The extracted content string or null if not found.
 */
const extractMetaContent = (html: string, propertyType: 'name' | 'property', value: string): string | null => {
  const regex = new RegExp(`<meta\\s+${propertyType}="\\s*${value}\\s*"\\s+content="([^"]+)"`, 'i')
  const match = html.match(regex)
  return match ? match[1].trim() : null
}

/**
 * [Primary Strategy] Extracts metadata from the JSON-LD script tag.
 * This is the most structured and reliable source.
 */
const extractFromJsonLd = (html: string, data: ScrapedMetadata) => {
  console.log('Attempting extraction from JSON-LD...')
  const regex = /<script name="schema:software-application" type="application\/ld\+json">([\s\S]*?)<\/script>/
  const match = html.match(regex)
  if (match && match[1]) {
    try {
      const jsonData = JSON.parse(match[1])
      data.name = data.name ?? jsonData.name
      data.description = data.description ?? jsonData.description
      data.applicationCategory = data.applicationCategory ?? jsonData.applicationCategory
      data.operatingSystem = data.operatingSystem ?? jsonData.operatingSystem
      data.screenshot = data.screenshot ?? jsonData.screenshot
      data.url = data.url ?? jsonData.url
      data.author = data.author ?? jsonData.author?.name
      data.ratingValue = data.ratingValue ?? jsonData.aggregateRating?.ratingValue
      data.reviewCount = data.reviewCount ?? jsonData.aggregateRating?.reviewCount
      console.log('Successfully extracted data from JSON-LD.')
    } catch (e) {
      console.warn('Could not parse JSON-LD data.', e.message)
    }
  } else {
    console.log('JSON-LD script not found.')
  }
}

/**
 * [Secondary Strategy] Extracts metadata from Open Graph (OG) tags.
 * A common fallback for social media sharing.
 */
const extractFromOpenGraph = (html: string, data: ScrapedMetadata) => {
  console.log('Attempting extraction from Open Graph tags...')
  data.name = data.name ?? extractMetaContent(html, 'property', 'og:title')
  data.description = data.description ?? extractMetaContent(html, 'property', 'og:description')
  data.url = data.url ?? extractMetaContent(html, 'property', 'og:url')
  if (data.name) console.log('Extracted some data from Open Graph tags.')
}

/**
 * [Tertiary Strategy] Extracts metadata from standard meta tags.
 * A final fallback for basic page information.
 */
const extractFromStandardMeta = (html: string, data: ScrapedMetadata) => {
  console.log('Attempting extraction from standard meta tags...')
  data.description = data.description ?? extractMetaContent(html, 'name', 'description')
  data.author = data.author ?? extractMetaContent(html, 'name', 'author')
  // 'application-name' is sometimes used for the app's title
  data.name = data.name ?? extractMetaContent(html, 'name', 'application-name')
  if (data.description || data.name) console.log('Extracted some data from standard meta tags.')
}


serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Health Check Endpoint for monitoring
  if (req.method === 'GET') {
    console.log(`Health check requested. Responding with version: ${VERSION}`)
    return new Response(
      JSON.stringify({
        status: 'ok',
        version: VERSION,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  }

  // Ensure we only process POST requests for scraping
  if (req.method === 'POST') {
    try {
      const { appStoreUrl } = await req.json()

      if (!appStoreUrl) {
        return new Response(JSON.stringify({ error: 'App Store URL or App Name is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      let finalUrlToScrape = ''

      if (isAppStoreUrl(appStoreUrl)) {
        console.log(`Input is a valid App Store URL: ${appStoreUrl}`)
        finalUrlToScrape = appStoreUrl
      } else {
        console.log(`Input is not a URL, treating as search term: "${appStoreUrl}"`)
        const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
          appStoreUrl
        )}&entity=software&limit=1`
        
        console.log(`Searching iTunes API: ${searchUrl}`)
        const searchResponse = await fetch(searchUrl)

        if (!searchResponse.ok) {
          console.error(`iTunes Search API failed with status: ${searchResponse.status}`)
          return new Response(JSON.stringify({ error: 'Failed to search for the app. Please try again later.' }), {
            status: 502, // Bad Gateway
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const searchResult = await searchResponse.json()

        if (searchResult.resultCount === 0) {
          console.log(`No app found for search term: "${appStoreUrl}"`)
          return new Response(
            JSON.stringify({
              error: `No app found for "${appStoreUrl}". Try being more specific or using the full App Store URL.`,
            }),
            {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }

        finalUrlToScrape = searchResult.results[0].trackViewUrl
        console.log(`Found app via search. Scraping URL: ${finalUrlToScrape}`)
      }
      
      console.log(`Scraping URL: ${finalUrlToScrape}`)
      const scraperResponse = await fetch(finalUrlToScrape, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      })

      if (!scraperResponse.ok) {
        console.error(`Scraper fetch failed with status: ${scraperResponse.status}`)
        return new Response(
          JSON.stringify({ error: `Failed to fetch App Store page. Status: ${scraperResponse.status}` }),
          {
            status: scraperResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      const html = await scraperResponse.text()
      
      // --- Enterprise Architecture: Multi-Source Extraction Pipeline ---
      console.log('--- Starting multi-source extraction pipeline ---')
      const metadata: ScrapedMetadata = {}

      // 1. Primary Source: JSON-LD (most structured)
      extractFromJsonLd(html, metadata)

      // 2. Secondary Source: Open Graph tags (common fallback)
      extractFromOpenGraph(html, metadata)

      // 3. Tertiary Source: Standard meta tags
      extractFromStandardMeta(html, metadata)
      
      console.log('--- Extraction pipeline finished ---')

      // --- Enterprise Architecture: Final Validation and Response ---
      if (!metadata.name || !metadata.url) {
        console.error('Scraper could not find essential metadata (name, url) after trying all sources.')
        console.log('Final extracted data:', JSON.stringify(metadata, null, 2))
        return new Response(
          JSON.stringify({
            error: 'Could not automatically extract app data. The App Store page might be structured in a non-standard way. Please try again or check the URL.',
          }),
          {
            status: 422, // Unprocessable Entity
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
      
      // Ensure URL is absolute, falling back to the scraped URL if needed
      try {
        metadata.url = new URL(metadata.url, finalUrlToScrape).href
      } catch (e) {
         console.warn(`Invalid URL extracted ('${metadata.url}'), falling back to ${finalUrlToScrape}. Error: ${e.message}`)
         metadata.url = finalUrlToScrape
      }

      console.log(`Successfully scraped metadata for: ${metadata.name}`)

      return new Response(JSON.stringify(metadata), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } catch (error) {
      console.error('Critical error in app-store-scraper:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }
  }

  // Fallback for any other unhandled methods
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
