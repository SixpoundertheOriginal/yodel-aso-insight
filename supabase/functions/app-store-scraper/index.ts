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
  title?: string
  subtitle?: string
  description?: string
  applicationCategory?: string
  operatingSystem?: string
  screenshot?: string[]
  url?: string
  author?: string
  ratingValue?: number
  reviewCount?: number
  icon?: string
  developer?: string
  rating?: number
  reviews?: number
  price?: string
  locale?: string
  competitorScreenshots?: CompetitorScreenshot[]
}

// NEW: Interface for competitor analysis results
interface CompetitorScreenshot {
  appName: string;
  url: string;
  analysis: string;
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

// --- NEW: AI-Powered Screenshot Analysis Helper ---
async function analyzeScreenshotWithAI(screenshotUrl: string): Promise<string> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    console.warn('OPENAI_API_KEY not set. Skipping AI analysis.');
    return 'AI analysis skipped: API key not configured.';
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: "Analyze this app screenshot for its key features, user flow, primary value proposition, and overall visual theme (e.g., minimalist, bold, playful). Provide a concise summary of your findings." },
              { type: 'image_url', image_url: { url: screenshotUrl } }
            ]
          }
        ],
        max_tokens: 250
      }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`OpenAI API Error: ${errorBody}`);
        throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error analyzing screenshot with AI:', error);
    return `AI analysis failed: ${error.message}`;
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
      const { searchTerm, organizationId, includeCompetitorAnalysis } = await req.json()

      if (!searchTerm || !organizationId) {
        return new Response(JSON.stringify({ error: 'Search term/URL and Organization ID are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      let canonicalUrl = ''
      let metadata: ScrapedMetadata = {}
      let apiDataUsed = false
      let targetApp: any;
      let competitorApps: any[] = [];
      
      const isUrl = isAppStoreUrl(searchTerm)

      // --- Phase 1: Market & Competitor Discovery ---
      if (isUrl) {
        const appId = extractAppIdFromUrl(searchTerm);
        if (appId) {
          console.log(`[URL Mode] Extracted App ID: ${appId}. Querying iTunes Lookup API.`);
          const lookupUrl = `https://itunes.apple.com/lookup?id=${appId}`;
          const apiResponse = await fetch(lookupUrl);
          if (apiResponse.ok) {
            const apiResult = await apiResponse.json();
            if (apiResult.resultCount > 0) {
              targetApp = apiResult.results[0];
              metadata = mapItunesDataToMetadata(targetApp);
              canonicalUrl = metadata.url!;
              apiDataUsed = true;
              
              // Find competitors based on category
              const categoryTerm = encodeURIComponent(targetApp.primaryGenreName);
              const country = new URL(canonicalUrl).pathname.split('/')[1] || 'us';
              const competitorSearchUrl = `https://itunes.apple.com/search?term=${categoryTerm}&country=${country}&entity=software&limit=10`;
              const competitorResponse = await fetch(competitorSearchUrl);
              if (competitorResponse.ok) {
                const competitorResult = await competitorResponse.json();
                competitorApps = competitorResult.results?.filter((c: any) => c.trackId !== targetApp.trackId).slice(0, 5) || [];
                console.log(`[URL Mode] Found ${competitorApps.length} competitors in category "${targetApp.primaryGenreName}".`);
              }
            }
          }
        }
      } else {
        console.log(`[Search Mode] Using search term: "${searchTerm}"`);
        const countryMatch = searchTerm.match(/in\s+([a-zA-Z]{2})$/);
        const country = countryMatch ? countryMatch[1].toLowerCase() : 'us';
        const parsedSearchTerm = encodeURIComponent(searchTerm.replace(/in\s+([a-zA-Z]{2})$/, '').trim());
        
        const searchUrl = `https://itunes.apple.com/search?term=${parsedSearchTerm}&country=${country}&entity=software&limit=6`;
        const searchResponse = await fetch(searchUrl);
        
        if (searchResponse.ok) {
          const searchResult = await searchResponse.json();
          if (searchResult.resultCount > 0) {
            [targetApp, ...competitorApps] = searchResult.results;
            metadata = mapItunesDataToMetadata(targetApp);
            canonicalUrl = metadata.url!;
            apiDataUsed = true;
            console.log(`[Search Mode] Found target app "${targetApp.trackName}" and ${competitorApps.length} competitors.`);
          } else {
            return new Response(JSON.stringify({ error: `No app found for "${searchTerm}".` }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
      }

      if (!targetApp) {
        return new Response(JSON.stringify({ error: 'Could not find a target app based on your input.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

      // --- Phase 2: Data Enrichment & Analysis ---
      // 2.1 Enrich Target App Metadata
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
      
      // 2.2 Analyze Competitors
      if (includeCompetitorAnalysis && competitorApps.length > 0) {
        console.log(`Analyzing first 3 screenshots for ${competitorApps.length} competitors...`);
        
        const analysisPromises = competitorApps.flatMap(app => 
            (app.screenshotUrls || []).slice(0, 3).map(async (screenshotUrl: string): Promise<CompetitorScreenshot> => {
                const analysis = await analyzeScreenshotWithAI(screenshotUrl);
                return { appName: app.trackName, url: screenshotUrl, analysis };
            })
        );
        metadata.competitorScreenshots = await Promise.all(analysisPromises);
        console.log(`Completed competitor screenshot analysis.`);
      }

      // Final sanitization and mapping
      const finalMetadata = sanitizeMetadata(metadata)

      // --- Enterprise Architecture: Final Validation, Caching & Response ---
      if (!finalMetadata || !finalMetadata.name || !finalMetadata.url) {
        const errorMsg = 'Could not automatically extract app data. The App Store page might be structured in a non-standard way.'
        console.error('Scraper could not find essential metadata (name, url). Caching as FAILED.')
        await supabaseAdmin
          .from('scrape_cache')
          .upsert(
            {
              url: canonicalUrl || searchTerm,
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
