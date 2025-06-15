import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Enterprise-grade: Initialize Supabase client with Service Role Key for admin operations.
// This allows us to interact with the cache table, bypassing RLS.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VERSION = '3.4.0-enterprise-root-fix' // Versioning for monitoring deployment consistency

// --- Enterprise Architecture: Standardized Data Contracts ---
// This interface now reflects the desired OUTPUT contract for the frontend
interface ScrapedMetadata {
  name?: string
  title?: string // The main app title (e.g., "TikTok")
  subtitle?: string // The app subtitle (e.g., "Videos, Music & Live")
  description?: string
  applicationCategory?: string
  operatingSystem?: string
  screenshot?: string[]
  url?: string
  author?: string // Keep original for reference
  ratingValue?: number // Keep original for reference
  reviewCount?: number // Keep original for reference
  icon?: string // URL for the app icon

  // Transformed fields for frontend consumption
  developer?: string
  rating?: number
  reviews?: number
  price?: string // Defaulted if not found
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

// NEW: Function to extract App ID from an App Store URL
const extractAppIdFromUrl = (url: string): string | null => {
  const match = url.match(/\/id(\d+)/)
  return match ? match[1] : null
}

// NEW: Function to map iTunes API data to our frontend contract
const mapItunesDataToMetadata = (itunesData: any): ScrapedMetadata => {
  const metadata: ScrapedMetadata = {}
  metadata.name = itunesData.trackName
  if (metadata.name) {
    // Enterprise Fix: More robust title/subtitle parsing.
    // Avoid splitting by '|' as it's often part of a brand name.
    // Only split by ' - ' as it's a more reliable separator for subtitles.
    const parts = itunesData.trackName.split(' - ')
    if (parts.length > 1 && parts[0].length > 0) {
      metadata.title = parts[0].trim()
      // Join back in case subtitle itself contains ' - '
      metadata.subtitle = parts.slice(1).join(' - ').trim()
    } else {
      metadata.title = itunesData.trackName.trim()
      // Initialize as empty; will be enriched by HTML scraper if found.
      metadata.subtitle = ''
    }
  }

  metadata.url = itunesData.trackViewUrl
  metadata.description = itunesData.description
  metadata.applicationCategory = itunesData.primaryGenreName
  metadata.operatingSystem = itunesData.supportedDevices?.join(', ') || 'iOS'
  metadata.icon = itunesData.artworkUrl512 || itunesData.artworkUrl100

  // Transformed fields for frontend consumption
  metadata.developer = itunesData.artistName
  metadata.rating = itunesData.averageUserRating
  metadata.reviews = itunesData.userRatingCount
  metadata.price = itunesData.formattedPrice || 'Free'

  // Raw fields for reference (optional)
  metadata.author = itunesData.artistName
  metadata.ratingValue = itunesData.averageUserRating
  metadata.reviewCount = itunesData.userRatingCount
  metadata.screenshot = itunesData.screenshotUrls

  return metadata
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
 * NEW: Extracts href from a link tag, which is needed for Apple's touch icon.
 * @param html The full HTML content of the page.
 * @param relValue The value of the rel attribute to look for (e.g., 'apple-touch-icon').
 * @returns The extracted href string or null if not found.
 */
const extractLinkHref = (html: string, relValue: string): string | null => {
  const regex = new RegExp(`<link\\s+[^>]*rel="\\s*${relValue}\\s*"[^>]*href="([^"]+)"`, 'i')
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

      // Ensure numeric types for rating and review count from JSON-LD
      const ratingVal = jsonData.aggregateRating?.ratingValue
      if (ratingVal !== undefined && data.ratingValue === undefined) {
        const numVal = Number(ratingVal)
        if (!isNaN(numVal)) data.ratingValue = numVal
      }
      const reviewVal = jsonData.aggregateRating?.reviewCount
      if (reviewVal !== undefined && data.reviewCount === undefined) {
        const numVal = Number(reviewVal)
        if (!isNaN(numVal)) data.reviewCount = numVal
      }

      data.icon = data.icon ?? jsonData.image // Extract icon from JSON-LD
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
  data.icon = data.icon ?? extractMetaContent(html, 'property', 'og:image') // Extract icon from OG tags
  if (data.name || data.icon) console.log('Extracted some data from Open Graph tags.')
}

/**
 * [NEW Secondary Strategy] Extracts app icon from Apple-specific tags.
 * This often provides a high-quality source for the icon.
 */
const extractFromAppleTags = (html: string, data: ScrapedMetadata) => {
  console.log('Attempting extraction from Apple-specific tags...')
  data.icon = data.icon ?? extractLinkHref(html, 'apple-touch-icon')
  if (data.icon) console.log('Extracted icon from apple-touch-icon tag.')
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

// NEW: Enterprise-grade data sanitization to ensure a stable contract with the frontend.
const sanitizeMetadata = (metadata: ScrapedMetadata): ScrapedMetadata => {
  const decodeHtmlEntities = (text?: string): string | undefined => {
    if (!text) return undefined;
    // Basic decoding for common entities
    return text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }
  
  return {
    ...metadata,
    name: decodeHtmlEntities(metadata.name) || 'Unknown App',
    url: metadata.url || '',
    title: decodeHtmlEntities(metadata.title) || decodeHtmlEntities(metadata.name) || 'App Title',
    subtitle: decodeHtmlEntities(metadata.subtitle) || '',
    description: metadata.description || 'No description available.',
    applicationCategory: metadata.applicationCategory || 'App',
    locale: '', // The frontend will add this based on the final URL
    icon: metadata.icon || undefined,
    developer: decodeHtmlEntities(metadata.developer || metadata.author) || undefined,
    rating: typeof metadata.rating === 'number' && !isNaN(metadata.rating) ? metadata.rating : 0,
    reviews: typeof metadata.reviews === 'number' && !isNaN(metadata.reviews) ? metadata.reviews : 0,
    price: metadata.price || 'Free',
  }
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
      const { appStoreUrl, organizationId } = await req.json()

      if (!appStoreUrl || !organizationId) {
        return new Response(JSON.stringify({ error: 'App Store URL/Name and Organization ID are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      let canonicalUrl = ''
      let metadata: ScrapedMetadata = {} // Start with empty object to merge data into
      let apiDataUsed = false

      // --- Enterprise Architecture: API-First Data Acquisition ---
      // The goal is to get structured JSON data from Apple's APIs first.

      const isUrl = isAppStoreUrl(appStoreUrl)
      const appId = isUrl ? extractAppIdFromUrl(appStoreUrl) : null

      // Strategy 1: Use iTunes Lookup API if we have an App ID from a URL
      if (isUrl && appId) {
        canonicalUrl = appStoreUrl // Use original URL for now, will be updated by API response
        console.log(`Extracted App ID: ${appId}. Querying iTunes Lookup API.`)
        const lookupUrl = `https://itunes.apple.com/lookup?id=${appId}`
        const apiResponse = await fetch(lookupUrl)
        if (apiResponse.ok) {
          const apiResult = await apiResponse.json()
          if (apiResult.resultCount > 0) {
            console.log('Successfully fetched base data from iTunes Lookup API.')
            metadata = mapItunesDataToMetadata(apiResult.results[0])
            canonicalUrl = metadata.url! // Use the canonical URL from the API response
            apiDataUsed = true
          } else {
            console.warn(`Lookup API found no results for app ID: ${appId}`)
          }
        } else {
          console.warn(`iTunes Lookup API failed with status: ${apiResponse.status}`)
        }
      }
      // Strategy 2: Use iTunes Search API if the input is not a URL
      else if (!isUrl) {
        console.log(`Input is not a URL, treating as search term: "${appStoreUrl}"`)
        const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
          appStoreUrl
        )}&entity=software&limit=1`

        console.log(`Searching iTunes API: ${searchUrl}`)
        const searchResponse = await fetch(searchUrl)

        if (searchResponse.ok) {
          const searchResult = await searchResponse.json()
          if (searchResult.resultCount > 0) {
            console.log('Found app via search. Using base data from iTunes Search API.')
            metadata = mapItunesDataToMetadata(searchResult.results[0])
            canonicalUrl = metadata.url! // Use the canonical URL from the API response
            apiDataUsed = true
          } else {
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
        } else {
          console.error(`iTunes Search API failed with status: ${searchResponse.status}`)
          return new Response(JSON.stringify({ error: 'Failed to search for the app. Please try again later.' }), {
            status: 502, // Bad Gateway
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
      // If input was a URL but we failed to get data from API, set canonicalUrl to scrape
      else if (isUrl && !apiDataUsed) {
        canonicalUrl = appStoreUrl
      }

      // --- Enterprise Architecture: Caching Layer ---
      // Now that we have a canonical URL, check cache.
      if (canonicalUrl) {
        console.log(`Checking cache for URL: ${canonicalUrl} in org: ${organizationId}`)
        const { data: cachedResult, error: cacheError } = await supabaseAdmin
          .from('scrape_cache')
          .select('status, data, error')
          .eq('url', canonicalUrl)
          .eq('organization_id', organizationId)
          .maybeSingle()

        if (cacheError) {
          console.error('Error reading from cache (non-fatal):', cacheError.message)
        }

        if (cachedResult) {
          console.log(`Cache hit with status: ${cachedResult.status}`)
          if (cachedResult.status === 'SUCCESS') {
            // Sanitize cached data to ensure it adheres to the latest contract
            const finalMetadata = sanitizeMetadata(cachedResult.data as ScrapedMetadata)
            return new Response(JSON.stringify(finalMetadata), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            })
          }
          if (cachedResult.status === 'FAILED') {
            return new Response(JSON.stringify({ error: cachedResult.error }), {
              status: 422, // Unprocessable Entity
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }
        }
        console.log('Cache miss. Proceeding to fetch data.')
      }

      // Fallback to HTML scraping if API-first approach did not yield data
      if (!metadata && canonicalUrl) {
        console.warn('API-first approach did not yield data. Falling back to HTML scraping.')

        console.log(`Scraping URL: ${canonicalUrl}`)
        const scraperResponse = await fetch(canonicalUrl, {
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

        // --- Multi-Source Extraction Pipeline (Enrichment) ---
        console.log('--- Starting multi-source enrichment pipeline ---')
        extractFromJsonLd(html, metadata)
        extractFromAppleTags(html, metadata)
        extractFromOpenGraph(html, metadata)
        extractFromStandardMeta(html, metadata)
        console.log('--- Enrichment pipeline finished ---')

        // --- Data Transformation & Validation for SCRAPED data ---
        // Only parse title/subtitle from name if API didn't provide them.
        if (!apiDataUsed && metadata.name) {
          // Use the same robust splitting logic for scraped names
          const parts = metadata.name.split(' - ')
          if (parts.length > 1) {
            metadata.title = parts[0].trim()
            metadata.subtitle = parts.slice(1).join(' - ').trim()
          } else {
            metadata.title = metadata.name.trim()
          }
        }
        
        console.log('Transforming raw scraped data to frontend contract...')
        // Use ?? to avoid overwriting API data with scraped data
        metadata.developer = metadata.developer ?? metadata.author
        metadata.rating = metadata.rating ?? metadata.ratingValue
        metadata.reviews = metadata.reviews ?? metadata.reviewCount
        metadata.price = metadata.price ?? 'Free' // Scraper can't get price reliably
        console.log(
          `Transformed fields: developer=${metadata.developer}, rating=${metadata.rating}, reviews=${metadata.reviews}, icon=${!!metadata.icon}`
        )
        
        try {
          metadata.url = new URL(metadata.url, canonicalUrl).href
        } catch (e) {
          metadata.url = canonicalUrl
        }
      }

      // --- Enterprise Architecture: Final Validation, Caching & Response ---
      if (!metadata || !metadata.name || !metadata.url) {
        const errorMsg =
          'Could not automatically extract app data. The App Store page might be structured in a non-standard way. Please try again or check the URL.'
        console.error('Scraper could not find essential metadata (name, url). Caching as FAILED.')
        await supabaseAdmin
          .from('scrape_cache')
          .upsert(
            {
              url: canonicalUrl || appStoreUrl, // Use what we have
              organization_id: organizationId,
              status: 'FAILED',
              error: errorMsg,
              expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Cache failure for 1 hour
            },
            { onConflict: 'url,organization_id' }
          )

        return new Response(JSON.stringify({ error: errorMsg }), {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.log(`Successfully processed metadata for: ${metadata.name}`)

      // Cache the successful result. Use canonicalUrl. Store the raw-ish data.
      await supabaseAdmin
        .from('scrape_cache')
        .upsert(
          {
            url: canonicalUrl,
            organization_id: organizationId,
            status: 'SUCCESS',
            data: metadata,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Cache success for 24 hours
          },
          { onConflict: 'url,organization_id' }
        )

      // Sanitize the metadata before sending it to the frontend.
      const finalMetadata = sanitizeMetadata(metadata)

      return new Response(JSON.stringify(finalMetadata), {
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
