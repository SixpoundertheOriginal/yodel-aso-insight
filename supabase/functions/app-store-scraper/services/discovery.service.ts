
export interface DiscoveryOptions {
  includeCompetitors: boolean;
  maxCompetitors: number;
  country: string;
  searchType?: string;
  limit?: number;
}

export interface DiscoveryResult {
  success: boolean;
  data?: {
    targetApp: any;
    competitors: any[];
    category: string;
    searchContext: string;
  };
  error?: string;
}

export class DiscoveryService {
  constructor(private supabase: any) {}

  async discover(searchTerm: string, options: DiscoveryOptions): Promise<DiscoveryResult> {
    try {
      console.log(`[DISCOVERY] Processing ${options.searchType || 'auto'} search: ${searchTerm}`)
      
      const searchType = options.searchType || this.detectSearchType(searchTerm)
      
      switch (searchType) {
        case 'url':
          return await this.discoverFromUrl(searchTerm, options)
        case 'brand':
          return await this.discoverFromBrandSearch(searchTerm, options)
        case 'keyword':
          return await this.discoverFromKeywordSearch(searchTerm, options)
        default:
          // Auto-detect: try brand first, then keyword
          const brandResult = await this.discoverFromBrandSearch(searchTerm, options)
          if (brandResult.success && brandResult.data?.targetApp) {
            return brandResult
          }
          return await this.discoverFromKeywordSearch(searchTerm, options)
      }
    } catch (error) {
      console.error('[DISCOVERY] Error:', error)
      return {
        success: false,
        error: `Discovery failed: ${error.message}`
      }
    }
  }

  private detectSearchType(searchTerm: string): string {
    if (this.isAppStoreUrl(searchTerm)) return 'url'
    if (this.isBrandName(searchTerm)) return 'brand'
    return 'keyword'
  }

  private async discoverFromUrl(url: string, options: DiscoveryOptions): Promise<DiscoveryResult> {
    const appId = this.extractAppIdFromUrl(url)
    if (!appId) {
      return { success: false, error: 'Invalid App Store URL format' }
    }

    try {
      const lookupUrl = `https://itunes.apple.com/lookup?id=${appId}&country=${options.country}`
      const response = await fetch(lookupUrl)
      
      if (!response.ok) {
        return { success: false, error: 'Failed to fetch app data from iTunes API' }
      }

      const result = await response.json()
      if (result.resultCount === 0) {
        return { success: false, error: 'App not found in the App Store' }
      }

      const targetApp = result.results[0]
      let competitors: any[] = []

      if (options.includeCompetitors) {
        competitors = await this.findCompetitorsByCategory(
          targetApp.primaryGenreName, 
          options.country, 
          options.maxCompetitors
        )
        competitors = competitors.filter(c => c.trackId !== targetApp.trackId)
      }

      return {
        success: true,
        data: {
          targetApp,
          competitors,
          category: targetApp.primaryGenreName,
          searchContext: 'url-based'
        }
      }
    } catch (error) {
      return { success: false, error: `URL lookup failed: ${error.message}` }
    }
  }

  private async discoverFromBrandSearch(brandName: string, options: DiscoveryOptions): Promise<DiscoveryResult> {
    try {
      // Search for exact brand match first
      const exactSearchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(brandName)}&country=${options.country}&entity=software&limit=${options.limit || 10}`
      const response = await fetch(exactSearchUrl)
      
      if (!response.ok) {
        return { success: false, error: 'iTunes search API unavailable' }
      }

      const result = await response.json()
      if (result.resultCount === 0) {
        return { success: false, error: `Brand "${brandName}" not found in the App Store` }
      }

      // Find the best match for the brand name
      const targetApp = this.findBestBrandMatch(result.results, brandName)
      if (!targetApp) {
        return { success: false, error: `No exact match found for brand "${brandName}"` }
      }

      // Get competitors in the same category
      let competitors: any[] = []
      if (options.includeCompetitors) {
        competitors = await this.findCompetitorsByCategory(
          targetApp.primaryGenreName,
          options.country,
          options.maxCompetitors
        )
        competitors = competitors.filter(c => c.trackId !== targetApp.trackId)
      }

      return {
        success: true,
        data: {
          targetApp,
          competitors,
          category: targetApp.primaryGenreName,
          searchContext: 'brand-based'
        }
      }
    } catch (error) {
      return { success: false, error: `Brand search failed: ${error.message}` }
    }
  }

  private async discoverFromKeywordSearch(keywords: string, options: DiscoveryOptions): Promise<DiscoveryResult> {
    try {
      // Enhanced keyword search with better results
      const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(keywords)}&country=${options.country}&entity=software&limit=${options.limit || 25}`
      const response = await fetch(searchUrl)
      
      if (!response.ok) {
        return { success: false, error: 'iTunes search API unavailable' }
      }

      const result = await response.json()
      if (result.resultCount === 0) {
        return { success: false, error: `No apps found for keywords "${keywords}"` }
      }

      // Sort results by relevance (rating, review count, name match)
      const sortedResults = this.sortByRelevance(result.results, keywords)
      const targetApp = sortedResults[0]
      const competitors = sortedResults.slice(1, options.maxCompetitors + 1)

      return {
        success: true,
        data: {
          targetApp,
          competitors,
          category: targetApp.primaryGenreName || 'Mixed Categories',
          searchContext: 'keyword-based'
        }
      }
    } catch (error) {
      return { success: false, error: `Keyword search failed: ${error.message}` }
    }
  }

  private async findCompetitorsByCategory(category: string, country: string, maxResults: number): Promise<any[]> {
    try {
      const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(category)}&country=${country}&entity=software&limit=${maxResults}`
      const response = await fetch(searchUrl)
      
      if (!response.ok) return []
      
      const result = await response.json()
      return result.results || []
    } catch (error) {
      console.warn('[DISCOVERY] Failed to find category competitors:', error)
      return []
    }
  }

  private findBestBrandMatch(results: any[], brandName: string): any | null {
    const lowerBrand = brandName.toLowerCase()
    
    // First, try exact name match
    let exactMatch = results.find(app => 
      app.trackName.toLowerCase() === lowerBrand
    )
    if (exactMatch) return exactMatch
    
    // Then, try artist/developer name match
    exactMatch = results.find(app => 
      app.artistName.toLowerCase().includes(lowerBrand) ||
      lowerBrand.includes(app.artistName.toLowerCase())
    )
    if (exactMatch) return exactMatch
    
    // Finally, try partial name match with highest rating
    const partialMatches = results.filter(app => 
      app.trackName.toLowerCase().includes(lowerBrand) ||
      lowerBrand.includes(app.trackName.toLowerCase())
    )
    
    if (partialMatches.length > 0) {
      return partialMatches.sort((a, b) => 
        (b.averageUserRating || 0) - (a.averageUserRating || 0)
      )[0]
    }
    
    // Return the first result if no good matches
    return results[0] || null
  }

  private sortByRelevance(results: any[], keywords: string): any[] {
    const lowerKeywords = keywords.toLowerCase()
    
    return results.sort((a, b) => {
      // Calculate relevance score
      let scoreA = 0
      let scoreB = 0
      
      // Name match bonus
      if (a.trackName.toLowerCase().includes(lowerKeywords)) scoreA += 10
      if (b.trackName.toLowerCase().includes(lowerKeywords)) scoreB += 10
      
      // Rating bonus
      scoreA += (a.averageUserRating || 0) * 2
      scoreB += (b.averageUserRating || 0) * 2
      
      // Review count bonus (logarithmic to prevent huge apps from dominating)
      scoreA += Math.log10((a.userRatingCount || 1) + 1)
      scoreB += Math.log10((b.userRatingCount || 1) + 1)
      
      // Developer name match bonus
      if (a.artistName.toLowerCase().includes(lowerKeywords)) scoreA += 5
      if (b.artistName.toLowerCase().includes(lowerKeywords)) scoreB += 5
      
      return scoreB - scoreA
    })
  }

  private isAppStoreUrl(str: string): boolean {
    try {
      const url = new URL(str.startsWith('http') ? str : `https://${str}`)
      return url.hostname.includes('apps.apple.com')
    } catch {
      return false
    }
  }

  private isBrandName(str: string): boolean {
    // Enhanced brand detection
    const brandPatterns = [
      /^[A-Z][a-zA-Z0-9\s]{2,30}$/,  // Capitalized names
      /\b(app|mobile|pro|premium|plus)\b/i,  // App suffixes
    ]

    const genericKeywords = [
      'learn', 'education', 'fitness', 'health', 'music', 'photo',
      'social', 'messaging', 'productivity', 'finance', 'shopping'
    ]

    const hasGenericKeywords = genericKeywords.some(keyword => 
      str.toLowerCase().includes(keyword)
    )

    if (hasGenericKeywords) return false
    return brandPatterns.some(pattern => pattern.test(str))
  }

  private extractAppIdFromUrl(url: string): string | null {
    const match = url.match(/\/id(\d+)/)
    return match ? match[1] : null
  }
}
