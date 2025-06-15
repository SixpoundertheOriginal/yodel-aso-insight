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
  locale?: string
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

  // Helper to ensure we get a number, using a fallback if needed.
  const getValidNumber = (primary: any, fallback: any): number => {
    const primaryNum = Number(primary);
    if (typeof primary === 'number' && !isNaN(primaryNum)) return primaryNum;
    
    const fallbackNum = Number(fallback);
    if (typeof fallback === 'number' && !isNaN(fallbackNum)) return fallbackNum;

    return 0;
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
    // --- CRITICAL FIX: Use helper to ensure rating/reviews are correctly populated ---
    rating: getValidNumber(metadata.rating, metadata.ratingValue),
    reviews: getValidNumber(metadata.reviews, metadata.reviewCount),
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
      let metadata: ScrapedMetadata = {}
      let apiDataUsed = false

      // --- Enterprise Architecture: API-First Data Acquisition ---
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
      
      // --- Enterprise Architecture: Data Enrichment via HTML Scraping ---
      // We always attempt to scrape the HTML to enrich the API data, as some fields like
      // the true subtitle or a higher-quality icon might be found there.
      let html = '';
      if (canonicalUrl) {
          console.log(`Scraping for enrichment: ${canonicalUrl}`)
          const scraperResponse = await fetch(canonicalUrl, {
              headers: {
                  'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              },
          })

          if (scraperResponse.ok) {
              html = await scraperResponse.text();
          } else {
              console.warn(`HTML scrape for enrichment failed with status: ${scraperResponse.status}`)
          }
      }

      // --- Multi-Source Extraction & Intelligent Merging ---
      if (html) {
          const scrapedData: ScrapedMetadata = {};
          console.log('--- Starting multi-source enrichment pipeline ---')
          extractFromJsonLd(html, scrapedData)
          extractFromAppleTags(html, scrapedData)
          extractFromOpenGraph(html, scrapedData)
          extractFromStandardMeta(html, scrapedData)
          console.log('--- Enrichment pipeline finished ---')

          // Merge scraped data into our primary metadata object.
          // API data takes precedence for core, structured fields.
          // HTML data is used for enrichment or as a fallback.
          metadata.name = metadata.name ?? scrapedData.name;
          metadata.description = scrapedData.description ?? metadata.description;
          metadata.icon = metadata.icon ?? scrapedData.icon;
          metadata.screenshot = metadata.screenshot ?? scrapedData.screenshot;
          
          // Only take scraped rating/reviews if API failed to provide them.
          metadata.ratingValue = metadata.ratingValue ?? scrapedData.ratingValue;
          metadata.reviewCount = metadata.reviewCount ?? scrapedData.reviewCount;
      }

      // --- Data Transformation & Validation for SCRAPED data ---
      if (!apiDataUsed && metadata.name && !metadata.title) {
        const parts = metadata.name.split(' - ')
        if (parts.length > 1) {
          metadata.title = parts[0].trim()
          metadata.subtitle = parts.slice(1).join(' - ').trim()
        } else {
          metadata.title = metadata.name.trim()
        }
      }

      // Final mapping to frontend contract fields
      metadata.developer = metadata.developer ?? metadata.author;
      metadata.rating = metadata.rating ?? metadata.ratingValue;
      metadata.reviews = metadata.reviews ?? metadata.reviewCount;
      metadata.price = metadata.price ?? 'Free';
      
      // --- NEW: Enterprise Architecture: Competitor Analysis ---
      let competitors: ScrapedMetadata[] = []
      if (metadata.applicationCategory && canonicalUrl) {
        console.log(`Analyzing competitors for category: ${metadata.applicationCategory}`)
        try {
          const url = new URL(canonicalUrl)
          const country = url.pathname.split('/')[1] || 'us'

          const searchTerm = encodeURIComponent(metadata.applicationCategory)
          // Search for top 10 competitors in the same category and country
          const competitorSearchUrl = `https://itunes.apple.com/search?term=${searchTerm}&country=${country}&entity=software&limit=10`
          
          console.log(`Fetching competitors from: ${competitorSearchUrl}`)
          const competitorResponse = await fetch(competitorSearchUrl)

          if (competitorResponse.ok) {
            const competitorResult = await competitorResponse.json()
            if (competitorResult.resultCount > 0) {
              const appIdNum = appId ? parseInt(appId, 10) : -1
              // Filter out the original app and map data for competitors
              competitors = competitorResult.results
                .filter((comp: any) => comp.trackId !== appIdNum)
                .map((comp: any) => sanitizeMetadata(mapItunesDataToMetadata(comp)))
              console.log(`Found ${competitors.length} competitors.`)
            }
          } else {
            console.warn(`Competitor search failed with status: ${competitorResponse.status}`)
          }
        } catch (e) {
          console.error('Error during competitor analysis:', e.message)
        }
      }

      // Sanitize the main app metadata.
      const finalMetadata = sanitizeMetadata(metadata)

      // WORKAROUND: Embed competitor data into the description field as a JSON string.
      // This is necessary to pass data through read-only parent components that we cannot modify.
      if (competitors.length > 0) {
        finalMetadata.description += `\n<!--COMPETITORS_START-->${JSON.stringify(competitors)}<!--COMPETITORS_END-->`;
      }

      // --- Enterprise Architecture: Final Validation, Caching & Response ---
      if (!finalMetadata || !finalMetadata.name || !finalMetadata.url) {
        const errorMsg = 'Could not automatically extract app data. The App Store page might be structured in a non-standard way.'
        console.error('Scraper could not find essential metadata (name, url). Caching as FAILED.')
        await supabaseAdmin
          .from('scrape_cache')
          .upsert(
            {
              url: canonicalUrl || appStoreUrl,
              organization_id: organizationId,
              status: 'FAILED',
              error: errorMsg,
              expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            },
            { onConflict: 'url,organization_id' }
          )

        return new Response(JSON.stringify({ error: errorMsg }), {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.log(`Successfully processed metadata for: ${finalMetadata.name}`)

      // Cache the successful result. Use canonicalUrl. Store the final object.
      await supabaseAdmin
        .from('scrape_cache')
        .upsert(
          {
            url: canonicalUrl,
            organization_id: organizationId,
            status: 'SUCCESS',
            data: finalMetadata, // Cache the object with embedded competitor data
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
          { onConflict: 'url,organization_id' }
        )

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
