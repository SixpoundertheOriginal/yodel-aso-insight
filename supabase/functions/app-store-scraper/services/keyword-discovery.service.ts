
export interface KeywordDiscoveryOptions {
  organizationId: string;
  targetApp?: {
    name: string;
    appId: string;
    category: string;
  };
  competitorApps?: string[];
  seedKeywords?: string[];
  country?: string;
  maxKeywords?: number;
}

export interface DiscoveredKeyword {
  keyword: string;
  estimatedVolume: number;
  difficulty: number;
  source: 'autocomplete' | 'competitor' | 'seed' | 'category';
  competitorRank?: number;
  competitorApp?: string;
}

export class KeywordDiscoveryService {
  private baseUrl = 'https://itunes.apple.com/search';
  private autocompleteUrl = 'https://search.itunes.apple.com/WebObjects/MZSearchHints.woa/wa/hints';

  /**
   * Harvest keywords from App Store autocomplete
   */
  async harvestAutocompleteKeywords(
    seedKeywords: string[],
    country: string = 'us',
    maxPerSeed: number = 20
  ): Promise<DiscoveredKeyword[]> {
    const keywords: DiscoveredKeyword[] = [];
    
    for (const seed of seedKeywords) {
      try {
        // Get autocomplete suggestions
        const suggestions = await this.getAutocompleteSuggestions(seed, country);
        
        for (const suggestion of suggestions.slice(0, maxPerSeed)) {
          // Estimate volume based on suggestion order (higher = more popular)
          const position = suggestions.indexOf(suggestion);
          const estimatedVolume = Math.max(1000, 10000 - (position * 500));
          
          keywords.push({
            keyword: suggestion,
            estimatedVolume,
            difficulty: await this.estimateKeywordDifficulty(suggestion, country),
            source: 'autocomplete'
          });
        }
      } catch (error) {
        console.warn(`Failed to get autocomplete for "${seed}":`, error);
      }
    }
    
    return this.deduplicateKeywords(keywords);
  }

  /**
   * Extract keywords from competitor apps
   */
  async harvestCompetitorKeywords(
    competitorApps: string[],
    country: string = 'us'
  ): Promise<DiscoveredKeyword[]> {
    const keywords: DiscoveredKeyword[] = [];
    
    for (const appId of competitorApps) {
      try {
        const appData = await this.getAppMetadata(appId, country);
        if (!appData) continue;
        
        // Extract keywords from app metadata
        const extractedKeywords = this.extractKeywordsFromMetadata(appData);
        
        for (const keyword of extractedKeywords) {
          keywords.push({
            keyword,
            estimatedVolume: await this.estimateVolumeFromCategory(keyword, appData.primaryGenreName),
            difficulty: await this.estimateKeywordDifficulty(keyword, country),
            source: 'competitor',
            competitorApp: appData.trackName
          });
        }
      } catch (error) {
        console.warn(`Failed to extract keywords from app ${appId}:`, error);
      }
    }
    
    return this.deduplicateKeywords(keywords);
  }

  /**
   * Discover keywords by category analysis
   */
  async harvestCategoryKeywords(
    category: string,
    country: string = 'us',
    maxApps: number = 50
  ): Promise<DiscoveredKeyword[]> {
    try {
      // Search for top apps in category
      const topApps = await this.getTopAppsInCategory(category, country, maxApps);
      const appIds = topApps.map(app => app.trackId.toString());
      
      // Extract keywords from all top apps
      return await this.harvestCompetitorKeywords(appIds, country);
    } catch (error) {
      console.error('Failed to harvest category keywords:', error);
      return [];
    }
  }

  /**
   * Main keyword discovery orchestrator
   */
  async discoverKeywords(options: KeywordDiscoveryOptions): Promise<DiscoveredKeyword[]> {
    const allKeywords: DiscoveredKeyword[] = [];
    const maxKeywords = options.maxKeywords || 200;
    
    console.log(`🔍 [DISCOVERY] Starting keyword discovery for org: ${options.organizationId}`);
    
    // 1. Harvest from seed keywords via autocomplete
    if (options.seedKeywords && options.seedKeywords.length > 0) {
      console.log('📝 [DISCOVERY] Harvesting autocomplete keywords...');
      const autocompleteKeywords = await this.harvestAutocompleteKeywords(
        options.seedKeywords,
        options.country,
        Math.floor(maxKeywords * 0.4 / options.seedKeywords.length) // 40% from autocomplete
      );
      allKeywords.push(...autocompleteKeywords);
    }
    
    // 2. Harvest from competitor apps
    if (options.competitorApps && options.competitorApps.length > 0) {
      console.log('🏢 [DISCOVERY] Harvesting competitor keywords...');
      const competitorKeywords = await this.harvestCompetitorKeywords(
        options.competitorApps,
        options.country
      );
      allKeywords.push(...competitorKeywords.slice(0, Math.floor(maxKeywords * 0.4))); // 40% from competitors
    }
    
    // 3. Harvest from category if target app provided
    if (options.targetApp?.category) {
      console.log('📱 [DISCOVERY] Harvesting category keywords...');
      const categoryKeywords = await this.harvestCategoryKeywords(
        options.targetApp.category,
        options.country,
        20
      );
      allKeywords.push(...categoryKeywords.slice(0, Math.floor(maxKeywords * 0.2))); // 20% from category
    }
    
    // Deduplicate and prioritize
    const uniqueKeywords = this.deduplicateKeywords(allKeywords);
    const prioritizedKeywords = this.prioritizeKeywords(uniqueKeywords);
    
    console.log(`✅ [DISCOVERY] Discovered ${prioritizedKeywords.length} unique keywords`);
    
    return prioritizedKeywords.slice(0, maxKeywords);
  }

  // Helper methods
  private async getAutocompleteSuggestions(term: string, country: string): Promise<string[]> {
    try {
      const url = `${this.autocompleteUrl}?clientApplication=Software&term=${encodeURIComponent(term)}`;
      const response = await fetch(url);
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.hints || [];
    } catch {
      return [];
    }
  }

  private async getAppMetadata(appId: string, country: string): Promise<any> {
    try {
      const url = `${this.baseUrl}?id=${appId}&country=${country}&entity=software`;
      const response = await fetch(url);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.results?.[0] || null;
    } catch {
      return null;
    }
  }

  private async getTopAppsInCategory(category: string, country: string, limit: number): Promise<any[]> {
    try {
      const url = `${this.baseUrl}?term=${encodeURIComponent(category)}&country=${country}&entity=software&limit=${limit}`;
      const response = await fetch(url);
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.results || [];
    } catch {
      return [];
    }
  }

  private extractKeywordsFromMetadata(appData: any): string[] {
    const keywords: string[] = [];
    
    // Extract from app name and subtitle
    const title = appData.trackName || '';
    const subtitle = appData.trackCensoredName || '';
    const description = appData.description || '';
    
    // Simple keyword extraction (can be enhanced)
    const text = `${title} ${subtitle} ${description}`.toLowerCase();
    const words = text.match(/\b[a-z]{3,}\b/g) || [];
    
    // Filter common words and duplicates
    const commonWords = ['app', 'the', 'and', 'for', 'with', 'your', 'best', 'free', 'new'];
    const uniqueWords = [...new Set(words)]
      .filter(word => !commonWords.includes(word))
      .slice(0, 10);
    
    return uniqueWords;
  }

  private async estimateKeywordDifficulty(keyword: string, country: string): Promise<number> {
    try {
      // Simple difficulty estimation based on search results count
      const url = `${this.baseUrl}?term=${encodeURIComponent(keyword)}&country=${country}&entity=software&limit=200`;
      const response = await fetch(url);
      
      if (!response.ok) return 5.0;
      
      const data = await response.json();
      const resultCount = data.resultCount || 0;
      
      // Convert result count to difficulty score (0-10)
      if (resultCount > 500) return 9.0;
      if (resultCount > 200) return 7.5;
      if (resultCount > 100) return 6.0;
      if (resultCount > 50) return 4.5;
      return 3.0;
    } catch {
      return 5.0; // Default difficulty
    }
  }

  private async estimateVolumeFromCategory(keyword: string, category: string): Promise<number> {
    // Category-based volume estimation
    const categoryMultipliers: Record<string, number> = {
      'Health & Fitness': 1.5,
      'Lifestyle': 1.3,
      'Productivity': 1.2,
      'Education': 1.1,
      'Entertainment': 1.4,
      'Games': 2.0,
      'Social Networking': 1.6,
      'Utilities': 0.8
    };
    
    const baseVolume = 1000;
    const multiplier = categoryMultipliers[category] || 1.0;
    const keywordLength = keyword.split(' ').length;
    
    // Longer keywords typically have lower volume
    const lengthPenalty = keywordLength > 2 ? 0.7 : 1.0;
    
    return Math.floor(baseVolume * multiplier * lengthPenalty);
  }

  private deduplicateKeywords(keywords: DiscoveredKeyword[]): DiscoveredKeyword[] {
    const seen = new Map<string, DiscoveredKeyword>();
    
    for (const keyword of keywords) {
      const key = keyword.keyword.toLowerCase().trim();
      if (!seen.has(key) || keyword.estimatedVolume > seen.get(key)!.estimatedVolume) {
        seen.set(key, keyword);
      }
    }
    
    return Array.from(seen.values());
  }

  private prioritizeKeywords(keywords: DiscoveredKeyword[]): DiscoveredKeyword[] {
    return keywords.sort((a, b) => {
      // Priority: High volume, low difficulty
      const scoreA = a.estimatedVolume / (a.difficulty + 1);
      const scoreB = b.estimatedVolume / (b.difficulty + 1);
      return scoreB - scoreA;
    });
  }
}
