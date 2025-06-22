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
   * Main keyword discovery orchestrator with real App Store integration
   */
  async discoverKeywords(options: KeywordDiscoveryOptions): Promise<DiscoveredKeyword[]> {
    const allKeywords: DiscoveredKeyword[] = [];
    const maxKeywords = options.maxKeywords || 100;
    
    console.log(`🔍 [DISCOVERY] Starting real app-specific keyword discovery for org: ${options.organizationId}`);
    
    // Get fresh app metadata from App Store if we have app store ID
    let enhancedAppData = options.targetApp;
    if (options.targetApp?.appId) {
      const freshMetadata = await this.getFreshAppMetadata(options.targetApp.appId, options.country);
      if (freshMetadata) {
        enhancedAppData = {
          ...options.targetApp,
          description: freshMetadata.description || options.targetApp.description,
          subtitle: freshMetadata.subtitle || options.targetApp.subtitle
        };
        console.log('🔄 [DISCOVERY] Enhanced app data with fresh App Store metadata');
      }
    }
    
    // 1. Extract keywords from real app metadata (60% of results)
    if (enhancedAppData) {
      console.log('📱 [DISCOVERY] Extracting real app-specific keywords...');
      const appKeywords = await this.extractRealAppKeywords(enhancedAppData, options.country);
      allKeywords.push(...appKeywords.slice(0, Math.floor(maxKeywords * 0.6)));
    }
    
    // 2. Generate intelligent semantic variations (25% of results)
    if (enhancedAppData) {
      console.log('🧠 [DISCOVERY] Generating intelligent semantic variations...');
      const semanticKeywords = await this.generateIntelligentSemanticVariations(enhancedAppData);
      allKeywords.push(...semanticKeywords.slice(0, Math.floor(maxKeywords * 0.25)));
    }
    
    // 3. Add contextual trending keywords (15% of results)
    if (enhancedAppData) {
      console.log('📈 [DISCOVERY] Finding contextual trending keywords...');
      const trendingKeywords = await this.findContextualTrendingKeywords(enhancedAppData);
      allKeywords.push(...trendingKeywords.slice(0, Math.floor(maxKeywords * 0.15)));
    }
    
    // Deduplicate, score relevance, and prioritize
    const uniqueKeywords = this.deduplicateAndScore(allKeywords, enhancedAppData);
    const finalKeywords = this.prioritizeByAppRelevance(uniqueKeywords, enhancedAppData);
    
    console.log(`✅ [DISCOVERY] Discovered ${finalKeywords.length} app-specific keywords`);
    
    return finalKeywords.slice(0, maxKeywords);
  }

  /**
   * Get fresh app metadata from App Store
   */
  private async getFreshAppMetadata(appStoreId: string, country: string = 'us'): Promise<any> {
    try {
      const lookupUrl = `${this.baseUrl}?id=${appStoreId}&country=${country}&entity=software`;
      const response = await fetch(lookupUrl);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const app = data.results[0];
        return {
          description: app.description,
          subtitle: app.trackName.includes(' - ') ? app.trackName.split(' - ').slice(1).join(' - ') : '',
          currentKeywords: this.extractKeywordsFromAppStore(app),
          reviews: app.userRatingCount,
          rating: app.averageUserRating
        };
      }
    } catch (error) {
      console.warn('[DISCOVERY] Failed to get fresh metadata:', error);
    }
    return null;
  }

  /**
   * Extract keywords from real App Store metadata
   */
  private extractKeywordsFromAppStore(appData: any): string[] {
    const keywords: string[] = [];
    
    // Extract from app name
    if (appData.trackName) {
      const nameWords = this.extractMeaningfulWords(appData.trackName);
      keywords.push(...nameWords);
    }
    
    // Extract from description key phrases
    if (appData.description) {
      const descKeywords = this.extractKeyPhrasesFromDescription(appData.description);
      keywords.push(...descKeywords);
    }
    
    return [...new Set(keywords)];
  }

  /**
   * Extract real app-specific keywords with intelligent analysis
   */
  private async extractRealAppKeywords(
    targetApp: KeywordDiscoveryOptions['targetApp'],
    country: string = 'us'
  ): Promise<DiscoveredKeyword[]> {
    const keywords: DiscoveredKeyword[] = [];
    
    if (!targetApp) return keywords;
    
    // Primary app name keyword
    const cleanName = targetApp.name.toLowerCase();
    keywords.push({
      keyword: cleanName,
      estimatedVolume: 5000,
      difficulty: 3.0,
      source: 'app_metadata',
      relevanceScore: 10.0
    });
    
    // Extract meaningful words from app name
    const nameKeywords = this.extractMeaningfulWords(targetApp.name);
    nameKeywords.forEach(word => {
      keywords.push({
        keyword: word,
        estimatedVolume: 3000,
        difficulty: 4.0,
        source: 'app_metadata',
        relevanceScore: 8.0
      });
    });
    
    // Extract from real description
    if (targetApp.description) {
      const descKeywords = this.extractKeyPhrasesFromDescription(targetApp.description);
      descKeywords.forEach(phrase => {
        keywords.push({
          keyword: phrase,
          estimatedVolume: 2000,
          difficulty: 4.5,
          source: 'app_metadata',
          relevanceScore: 7.0
        });
      });
    }
    
    // Extract from subtitle if available
    if (targetApp.subtitle) {
      const subtitleKeywords = this.extractMeaningfulWords(targetApp.subtitle);
      subtitleKeywords.forEach(word => {
        keywords.push({
          keyword: word,
          estimatedVolume: 1500,
          difficulty: 4.0,
          source: 'app_metadata',
          relevanceScore: 6.5
        });
      });
    }
    
    return keywords;
  }

  /**
   * Extract meaningful words from text, filtering out generic terms
   */
  private extractMeaningfulWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !this.isGenericWord(word) &&
        !this.isCommonWord(word)
      )
      .slice(0, 5);
  }

  /**
   * Extract key phrases from app description using intelligent analysis
   */
  private extractKeyPhrasesFromDescription(description: string): string[] {
    const phrases: string[] = [];
    
    // Split into sentences and analyze first few
    const sentences = description.split(/[.!?]+/).slice(0, 3);
    
    sentences.forEach(sentence => {
      // Extract 2-3 word meaningful phrases
      const words = sentence
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !this.isCommonWord(word));
      
      // Create 2-word phrases
      for (let i = 0; i < words.length - 1; i++) {
        const phrase = `${words[i]} ${words[i + 1]}`;
        if (this.isValuablePhrase(phrase)) {
          phrases.push(phrase);
        }
      }
      
      // Create 3-word phrases for more specific targeting
      for (let i = 0; i < words.length - 2; i++) {
        const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        if (this.isValuablePhrase(phrase)) {
          phrases.push(phrase);
        }
      }
    });
    
    return [...new Set(phrases)].slice(0, 10);
  }

  /**
   * Generate intelligent semantic variations based on app context
   */
  private async generateIntelligentSemanticVariations(
    targetApp: KeywordDiscoveryOptions['targetApp']
  ): Promise<DiscoveredKeyword[]> {
    const keywords: DiscoveredKeyword[] = [];
    
    if (!targetApp) return keywords;
    
    const appName = targetApp.name.toLowerCase();
    const appContext = this.analyzeAppContext(targetApp);
    
    // Generate context-aware variations
    const contextVariations = this.getContextualVariations(appContext);
    
    contextVariations.forEach(variation => {
      // App name + variation
      keywords.push({
        keyword: `${appName} ${variation}`,
        estimatedVolume: 1200,
        difficulty: 4.5,
        source: 'semantic',
        relevanceScore: 7.5
      });
      
      // Variation + core function
      if (appContext.coreFunction) {
        keywords.push({
          keyword: `${variation} ${appContext.coreFunction}`,
          estimatedVolume: 1000,
          difficulty: 4.0,
          source: 'semantic',
          relevanceScore: 7.0
        });
      }
    });
    
    return keywords;
  }

  /**
   * Analyze app context to understand what it actually does
   */
  private analyzeAppContext(targetApp: KeywordDiscoveryOptions['targetApp']): {
    type: string;
    coreFunction: string;
    targetAudience: string;
  } {
    const name = targetApp.name.toLowerCase();
    const description = (targetApp.description || '').toLowerCase();
    const category = (targetApp.category || '').toLowerCase();
    
    let type = 'general';
    let coreFunction = 'app';
    let targetAudience = 'users';
    
    // Analyze based on actual app content
    if (name.includes('mind') || description.includes('personal development') || description.includes('growth')) {
      type = 'personal_development';
      coreFunction = 'growth';
      targetAudience = 'learners';
    } else if (description.includes('fitness') || description.includes('workout')) {
      type = 'fitness';
      coreFunction = 'training';
      targetAudience = 'fitness enthusiasts';
    } else if (description.includes('productivity') || description.includes('task')) {
      type = 'productivity';
      coreFunction = 'organization';
      targetAudience = 'professionals';
    } else if (description.includes('learn') || category.includes('education')) {
      type = 'education';
      coreFunction = 'learning';
      targetAudience = 'students';
    }
    
    return { type, coreFunction, targetAudience };
  }

  /**
   * Get contextual variations based on app analysis
   */
  private getContextualVariations(context: { type: string; coreFunction: string }): string[] {
    const variationMap: Record<string, string[]> = {
      'personal_development': ['coaching', 'transformation', 'mindset', 'self improvement'],
      'fitness': ['workout', 'training', 'exercise', 'wellness'],
      'productivity': ['efficiency', 'organization', 'management', 'workflow'],
      'education': ['learning', 'course', 'tutorial', 'skill building'],
      'general': ['tool', 'solution', 'platform', 'system']
    };
    
    return variationMap[context.type] || variationMap['general'];
  }

  /**
   * Find contextual trending keywords based on app type
   */
  private async findContextualTrendingKeywords(
    targetApp: KeywordDiscoveryOptions['targetApp']
  ): Promise<DiscoveredKeyword[]> {
    const context = this.analyzeAppContext(targetApp);
    
    const trendingByContext: Record<string, string[]> = {
      'personal_development': ['mindfulness app', 'self care', 'mental wellness', 'life coaching'],
      'fitness': ['home workout', 'fitness tracking', 'wellness journey', 'health monitor'],
      'productivity': ['remote work', 'digital workspace', 'time management', 'task automation'],
      'education': ['online learning', 'skill development', 'knowledge platform', 'study companion'],
      'general': ['mobile solution', 'digital tool', 'smart platform', 'innovative app']
    };
    
    const trendingTerms = trendingByContext[context.type] || trendingByContext['general'];
    
    return trendingTerms.map(term => ({
      keyword: term,
      estimatedVolume: 2500,
      difficulty: 6.0,
      source: 'trending' as const,
      relevanceScore: 6.5
    }));
  }

  /**
   * Check if a phrase is valuable for keyword targeting
   */
  private isValuablePhrase(phrase: string): boolean {
    // Filter out phrases that are too generic or not valuable
    const lowValuePhrases = [
      'app store', 'mobile app', 'download now', 'get started', 'sign up',
      'easy to', 'simple to', 'designed for', 'perfect for'
    ];
    
    return !lowValuePhrases.some(lowValue => phrase.includes(lowValue)) && 
           phrase.length >= 6 && 
           phrase.length <= 25;
  }

  /**
   * Enhanced prioritization based on app relevance
   */
  private prioritizeByAppRelevance(
    keywords: DiscoveredKeyword[], 
    targetApp?: KeywordDiscoveryOptions['targetApp']
  ): DiscoveredKeyword[] {
    if (!targetApp) return keywords.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    const appName = targetApp.name.toLowerCase();
    
    return keywords.sort((a, b) => {
      let scoreA = a.relevanceScore;
      let scoreB = b.relevanceScore;
      
      // Boost keywords that contain app name
      if (a.keyword.includes(appName) || appName.includes(a.keyword)) scoreA += 3;
      if (b.keyword.includes(appName) || appName.includes(b.keyword)) scoreB += 3;
      
      // Boost app metadata keywords
      if (a.source === 'app_metadata') scoreA += 2;
      if (b.source === 'app_metadata') scoreB += 2;
      
      // Consider search volume/difficulty ratio
      const ratioA = a.estimatedVolume / (a.difficulty + 1);
      const ratioB = b.estimatedVolume / (b.difficulty + 1);
      
      return (scoreB + ratioB * 0.001) - (scoreA + ratioA * 0.001);
    });
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
      'app', 'application', 'mobile', 'phone', 'device', 'free', 'best', 'new', 'top',
      'get', 'use', 'make', 'help', 'now', 'all', 'more', 'most', 'one', 'way'
    ];
    return commonWords.includes(word.toLowerCase());
  }

  private isGenericWord(word: string): boolean {
    const genericWords = [
      'software', 'platform', 'solution', 'system', 'service', 'product',
      'digital', 'online', 'internet', 'web', 'technology'
    ];
    return genericWords.includes(word.toLowerCase());
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

  private async getAppMetadata(appId: string): Promise<any> {
    try {
      const { data } = await supabase
        .from('apps')
        .select('app_name, category')
        .eq('id', appId)
        .single();

      return data;
    } catch {
      return null;
    }
  }
}
