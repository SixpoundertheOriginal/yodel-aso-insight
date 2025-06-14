
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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
    
    // --- Scraper Logic ---
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
    const regex = /<script name="schema:software-application" type="application\/ld\+json">([\s\S]*?)<\/script>/
    const match = html.match(regex)

    if (!match || !match[1]) {
      console.error('Scraper could not find metadata script tag.')
      return new Response(
        JSON.stringify({
          error: 'Could not find app metadata on the page. The page structure might have changed.',
        }),
        {
          status: 422, // Unprocessable Entity
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const jsonData = JSON.parse(match[1])

    const metadata = {
      name: jsonData.name,
      description: jsonData.description,
      applicationCategory: jsonData.applicationCategory,
      operatingSystem: jsonData.operatingSystem,
      screenshot: jsonData.screenshot,
      url: jsonData.url,
      author: jsonData.author?.name,
      ratingValue: jsonData.aggregateRating?.ratingValue,
      reviewCount: jsonData.aggregateRating?.reviewCount,
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
})

