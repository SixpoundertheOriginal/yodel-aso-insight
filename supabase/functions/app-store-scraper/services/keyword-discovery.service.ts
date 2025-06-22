
export interface KeywordDiscoveryOptions {
  organizationId: string;
  targetApp?: {
    name: string;
    appId: string;
    category: string;
    description?: string;
    subtitle?: string;
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
  source: 'app_metadata' | 'competitor' | 'category' | 'semantic' | 'trending';
  competitorRank?: number;
  competitorApp?: string;
  relevanceScore: number;
}

export class KeywordDiscoveryService {
  private baseUrl = 'https://itunes.apple.com/search';

  /**
   * Main keyword discovery orchestrator with improved app-specific focus
   */
  async discoverKeywords(options: KeywordDiscoveryOptions): Promise<DiscoveredKeyword[]> {
    const allKeywords: DiscoveredKeyword[] = [];
    const maxKeywords = options.maxKeywords || 100;
    
    console.log(`🔍 [DISCOVERY] Starting enhanced keyword discovery for org: ${options.organizationId}`);
    
    // 1. Extract keywords from target app metadata (highest priority - 50% of results)
    if (options.targetApp) {
      console.log('📱 [DISCOVERY] Extracting app-specific keywords...');
      const appKeywords = await this.extractAppSpecificKeywords(options.targetApp, options.country);
      allKeywords.push(...appKeywords.slice(0, Math.floor(maxKeywords * 0.5)));
    }
    
    // 2. Generate semantic variations of app name and core terms (20% of results)
    if (options.targetApp) {
      console.log('🧠 [DISCOVERY] Generating semantic variations...');
      const semanticKeywords = await this.generateSemanticVariations(options.targetApp);
      allKeywords.push(...semanticKeywords.slice(0, Math.floor(maxKeywords * 0.2)));
    }
    
    // 3. Harvest from competitor apps (20% of results)
    if (options.competitorApps && options.competitorApps.length > 0) {
      console.log('🏢 [DISCOVERY] Analyzing competitor keywords...');
      const competitorKeywords = await this.analyzeCompetitorKeywords(
        options.competitorApps,
        options.country,
        options.targetApp
      );
      allKeywords.push(...competitorKeywords.slice(0, Math.floor(maxKeywords * 0.2)));
    }
    
    // 4. Category-specific trending keywords (10% of results)
    if (options.targetApp?.category) {
      console.log('📈 [DISCOVERY] Finding trending category keywords...');
      const trendingKeywords = await this.findTrendingCategoryKeywords(
        options.targetApp.category,
        options.country
      );
      allKeywords.push(...trendingKeywords.slice(0, Math.floor(maxKeywords * 0.1)));
    }
    
    // Deduplicate, score relevance, and prioritize
    const uniqueKeywords = this.deduplicateAndScore(allKeywords, options.targetApp);
    const finalKeywords = this.prioritizeByRelevance(uniqueKeywords);
    
    console.log(`✅ [DISCOVERY] Discovered ${finalKeywords.length} relevant keywords`);
    
    return finalKeywords.slice(0, maxKeywords);
  }

  /**
   * Extract app-specific keywords from metadata with intelligent parsing
   */
  private async extractAppSpecificKeywords(
    targetApp: KeywordDiscoveryOptions['targetApp'],
    country: string = 'us'
  ): Promise<DiscoveredKeyword[]> {
    const keywords: DiscoveredKeyword[] = [];
    
    if (!targetApp) return keywords;
    
    // Extract from app name components
    const nameKeywords = this.extractFromAppName(targetApp.name);
    keywords.push(...nameKeywords);
    
    // Extract from subtitle if available
    if (targetApp.subtitle) {
      const subtitleKeywords = this.extractFromText(targetApp.subtitle, 'app_metadata');
      keywords.push(...subtitleKeywords);
    }
    
    // Extract from description if available
    if (targetApp.description) {
      const descKeywords = this.extractFromDescription(targetApp.description);
      keywords.push(...descKeywords);
    }
    
    // Add brand and functionality keywords
    const brandKeywords = this.generateBrandKeywords(targetApp.name, targetApp.category);
    keywords.push(...brandKeywords);
    
    return keywords;
  }

  /**
   * Extract meaningful keywords from app name
   */
  private extractFromAppName(appName: string): DiscoveredKeyword[] {
    const keywords: DiscoveredKeyword[] = [];
    const cleanName = appName.toLowerCase();
    
    // Full app name as primary keyword
    keywords.push({
      keyword: cleanName,
      estimatedVolume: 5000,
      difficulty: 3.0,
      source: 'app_metadata',
      relevanceScore: 10.0
    });
    
    // Extract meaningful words from app name
    const words = cleanName
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.isCommonWord(word));
    
    words.forEach(word => {
      keywords.push({
        keyword: word,
        estimatedVolume: 3000,
        difficulty: 4.0,
        source: 'app_metadata',
        relevanceScore: 8.0
      });
    });
    
    // Combine significant words
    if (words.length >= 2) {
      for (let i = 0; i < words.length - 1; i++) {
        keywords.push({
          keyword: `${words[i]} ${words[i + 1]}`,
          estimatedVolume: 2000,
          difficulty: 3.5,
          source: 'app_metadata',
          relevanceScore: 7.0
        });
      }
    }
    
    return keywords;
  }

  /**
   * Extract keywords from app description with NLP-like processing
   */
  private extractFromDescription(description: string): DiscoveredKeyword[] {
    const keywords: DiscoveredKeyword[] = [];
    const sentences = description.split(/[.!?]+/).slice(0, 3); // First 3 sentences
    
    sentences.forEach(sentence => {
      const words = sentence
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !this.isCommonWord(word));
      
      // Extract 2-3 word phrases
      for (let i = 0; i < words.length - 1; i++) {
        const twoWordPhrase = `${words[i]} ${words[i + 1]}`;
        if (this.isRelevantPhrase(twoWordPhrase)) {
          keywords.push({
            keyword: twoWordPhrase,
            estimatedVolume: 1500,
            difficulty: 5.0,
            source: 'app_metadata',
            relevanceScore: 6.0
          });
        }
        
        if (i < words.length - 2) {
          const threeWordPhrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
          if (this.isRelevantPhrase(threeWordPhrase)) {
            keywords.push({
              keyword: threeWordPhrase,
              estimatedVolume: 800,
              difficulty: 4.0,
              source: 'app_metadata',
              relevanceScore: 5.5
            });
          }
        }
      }
    });
    
    return keywords;
  }

  /**
   * Generate semantic variations and synonyms
   */
  private async generateSemanticVariations(
    targetApp: KeywordDiscoveryOptions['targetApp']
  ): Promise<DiscoveredKeyword[]> {
    const keywords: DiscoveredKeyword[] = [];
    
    if (!targetApp) return keywords;
    
    const appName = targetApp.name.toLowerCase();
    const category = targetApp.category.toLowerCase();
    
    // Category-specific semantic variations
    const semanticMap: Record<string, string[]> = {
      'education': ['learning', 'study', 'course', 'lesson', 'tutorial', 'training'],
      'productivity': ['efficiency', 'organization', 'management', 'workflow', 'planning'],
      'health & fitness': ['wellness', 'workout', 'exercise', 'nutrition', 'mindfulness'],
      'lifestyle': ['lifestyle', 'habits', 'personal', 'daily', 'routine'],
      'entertainment': ['fun', 'game', 'play', 'entertainment', 'leisure'],
      'social networking': ['social', 'connect', 'community', 'friends', 'network']
    };
    
    const variations = semanticMap[category] || [];
    
    variations.forEach(variation => {
      // Variation + app name
      keywords.push({
        keyword: `${variation} ${appName}`,
        estimatedVolume: 1200,
        difficulty: 4.5,
        source: 'semantic',
        relevanceScore: 7.5
      });
      
      // App name + variation
      keywords.push({
        keyword: `${appName} ${variation}`,
        estimatedVolume: 1000,
        difficulty: 4.0,
        source: 'semantic',
        relevanceScore: 7.0
      });
    });
    
    return keywords;
  }

  /**
   * Analyze competitor keywords with better extraction
   */
  private async analyzeCompetitorKeywords(
    competitorApps: string[],
    country: string = 'us',
    targetApp?: KeywordDiscoveryOptions['targetApp']
  ): Promise<DiscoveredKeyword[]> {
    const keywords: DiscoveredKeyword[] = [];
    
    for (const appId of competitorApps.slice(0, 3)) { // Limit to 3 competitors
      try {
        const appData = await this.getAppMetadata(appId, country);
        if (!appData) continue;
        
        // Extract competitor app name variations
        const nameKeywords = this.extractFromAppName(appData.trackName);
        nameKeywords.forEach(kw => {
          keywords.push({
            ...kw,
            source: 'competitor',
            competitorApp: appData.trackName,
            relevanceScore: kw.relevanceScore * 0.7 // Lower relevance for competitor terms
          });
        });
        
        // Extract from competitor description
        if (appData.description) {
          const descKeywords = this.extractFromDescription(appData.description);
          descKeywords.forEach(kw => {
            keywords.push({
              ...kw,
              source: 'competitor',
              competitorApp: appData.trackName,
              relevanceScore: kw.relevanceScore * 0.6
            });
          });
        }
      } catch (error) {
        console.warn(`Failed to analyze competitor ${appId}:`, error);
      }
    }
    
    return keywords;
  }

  /**
   * Find trending keywords for category
   */
  private async findTrendingCategoryKeywords(
    category: string,
    country: string = 'us'
  ): Promise<DiscoveredKeyword[]> {
    const trendingTerms: Record<string, string[]> = {
      'education': ['ai learning', 'personalized education', 'skill development', 'online courses'],
      'productivity': ['remote work', 'time management', 'task automation', 'digital workspace'],
      'health & fitness': ['mental health', 'home workout', 'nutrition tracking', 'wellness coach'],
      'lifestyle': ['mindfulness', 'habit tracking', 'personal growth', 'life coaching'],
      'entertainment': ['interactive content', 'streaming', 'social gaming', 'virtual reality'],
      'social networking': ['video chat', 'community building', 'content creation', 'live streaming']
    };
    
    const terms = trendingTerms[category.toLowerCase()] || [];
    
    return terms.map(term => ({
      keyword: term,
      estimatedVolume: 2500,
      difficulty: 6.0,
      source: 'trending' as const,
      relevanceScore: 6.5
    }));
  }

  /**
   * Generate brand-specific keywords
   */
  private generateBrandKeywords(appName: string, category: string): DiscoveredKeyword[] {
    const keywords: DiscoveredKeyword[] = [];
    const cleanName = appName.toLowerCase();
    
    // Brand + common action words
    const actionWords = ['app', 'download', 'free', 'premium', 'pro', 'plus'];
    actionWords.forEach(action => {
      keywords.push({
        keyword: `${cleanName} ${action}`,
        estimatedVolume: 800,
        difficulty: 3.0,
        source: 'app_metadata',
        relevanceScore: 6.0
      });
    });
    
    return keywords;
  }

  // Utility methods
  private extractFromText(text: string, source: DiscoveredKeyword['source']): DiscoveredKeyword[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isCommonWord(word))
      .map(word => ({
        keyword: word,
        estimatedVolume: 1000,
        difficulty: 4.0,
        source,
        relevanceScore: 5.0
      }));
  }

  private isCommonWord(word: string): boolean {
    const commonWords = [
      'the', 'and', 'for', 'with', 'your', 'you', 'are', 'can', 'will', 'this', 'that',
      'app', 'application', 'mobile', 'phone', 'device', 'free', 'best', 'new', 'top'
    ];
    return commonWords.includes(word.toLowerCase());
  }

  private isRelevantPhrase(phrase: string): boolean {
    // Filter out phrases that are too generic
    const irrelevantPhrases = [
      'app store', 'mobile app', 'download now', 'get started', 'sign up'
    ];
    return !irrelevantPhrases.includes(phrase.toLowerCase()) && phrase.length >= 6;
  }

  private deduplicateAndScore(
    keywords: DiscoveredKeyword[], 
    targetApp?: KeywordDiscoveryOptions['targetApp']
  ): DiscoveredKeyword[] {
    const seen = new Map<string, DiscoveredKeyword>();
    
    for (const keyword of keywords) {
      const key = keyword.keyword.toLowerCase().trim();
      if (!seen.has(key) || keyword.relevanceScore > seen.get(key)!.relevanceScore) {
        seen.set(key, keyword);
      }
    }
    
    return Array.from(seen.values());
  }

  private prioritizeByRelevance(keywords: DiscoveredKeyword[]): DiscoveredKeyword[] {
    return keywords.sort((a, b) => {
      // Priority: relevance score, then volume/difficulty ratio
      const scoreA = a.relevanceScore + (a.estimatedVolume / (a.difficulty + 1));
      const scoreB = b.relevanceScore + (b.estimatedVolume / (b.difficulty + 1));
      return scoreB - scoreA;
    });
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
}
