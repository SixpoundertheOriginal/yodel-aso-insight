
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { appStoreUrl } = await req.json()

    if (!appStoreUrl) {
      return new Response(JSON.stringify({ error: 'appStoreUrl is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Scraping URL: ${appStoreUrl}`)

    const response = await fetch(appStoreUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    })
    
    if (!response.ok) {
      console.error(`Scraper fetch failed with status: ${response.status}`)
      return new Response(JSON.stringify({ error: `Failed to fetch App Store page. Status: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const html = await response.text()

    const regex = /<script name="schema:software-application" type="application\/ld\+json">([\s\S]*?)<\/script>/
    const match = html.match(regex)

    if (!match || !match[1]) {
      console.error('Scraper could not find metadata script tag.')
      return new Response(JSON.stringify({ error: 'Could not find schema:software-application ld+json script tag in the page source.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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
    console.error('Error in app-store-scraper:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
