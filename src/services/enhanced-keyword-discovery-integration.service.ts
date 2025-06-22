
import { supabase } from '@/integrations/supabase/client';
import { keywordIntelligenceService } from './keyword-intelligence.service';

export interface RealAppMetadata {
  app_name: string;
  app_store_id?: string;
  category?: string;
  description?: string;
  subtitle?: string;
  developer_name?: string;
  currentKeywords?: string[];
  reviews?: number;
  rating?: number;
}

export interface EnhancedKeywordResult {
  keyword: string;
  estimatedVolume: number;
  difficulty: number;
  source: 'app_metadata' | 'description_analysis' | 'intelligent_generation' | 'semantic_expansion';
  relevanceScore: number;
  contextualReason: string;
}

class EnhancedKeywordDiscoveryIntegrationService {
  /**
   * Generate keywords using real app metadata and intelligent analysis
   */
  async generateKeywordsFromRealAppData(
    organizationId: string,
    appId: string
  ): Promise<EnhancedKeywordResult[]> {
    try {
      console.log('🎯 [ENHANCED-DISCOVERY] Starting real app data keyword generation for:', appId);

      // Get comprehensive app metadata
      const appData = await this.getComprehensiveAppData(appId, organizationId);
      
      if (!appData) {
        console.warn('⚠️ [ENHANCED-DISCOVERY] No app data found, using intelligent fallback');
        return this.generateIntelligentFallback(appId);
      }

      console.log('📱 [ENHANCED-DISCOVERY] Found app data:', {
        name: appData.app_name,
        category: appData.category,
        hasDescription: !!appData.description,
        hasSubtitle: !!appData.subtitle
      });

      const allKeywords: EnhancedKeywordResult[] = [];

      // 1. Extract keywords from real app metadata (40%)
      const metadataKeywords = this.extractKeywordsFromAppMetadata(appData);
      allKeywords.push(...metadataKeywords);

      // 2. Analyze description content for contextual keywords (30%)
      if (appData.description) {
        const descriptionKeywords = this.analyzeDescriptionForKeywords(appData);
        allKeywords.push(...descriptionKeywords);
      }

      // 3. Generate intelligent semantic variations (20%)
      const semanticKeywords = this.generateContextualSemanticVariations(appData);
      allKeywords.push(...semanticKeywords);

      // 4. Add app-specific branded terms (10%)
      const brandedKeywords = this.generateBrandedVariations(appData);
      allKeywords.push(...brandedKeywords);

      // Deduplicate and prioritize by relevance
      const uniqueKeywords = this.deduplicateAndPrioritizeKeywords(allKeywords, appData);
      
      console.log('✅ [ENHANCED-DISCOVERY] Generated', uniqueKeywords.length, 'real app-specific keywords');
      return uniqueKeywords.slice(0, 50); // Top 50 most relevant

    } catch (error) {
      console.error('❌ [ENHANCED-DISCOVERY] Error generating keywords:', error);
      return this.generateIntelligentFallback(appId);
    }
  }

  /**
   * Get comprehensive app data from database and App Store if needed
   */
  private async getComprehensiveAppData(appId: string, organizationId: string): Promise<RealAppMetadata | null> {
    try {
      // First get from database
      const { data: appData } = await supabase
        .from('apps')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`id.eq.${appId},app_store_id.eq.${appId}`)
        .single();

      if (!appData) return null;

      // Try to get fresh metadata from App Store scraper if we have app store ID
      let enhancedData = { ...appData };
      
      if (appData.app_store_id) {
        try {
          console.log('🔍 [ENHANCED-DISCOVERY] Fetching fresh App Store metadata...');
          const { data: scrapedData } = await supabase.functions.invoke('app-store-scraper', {
            body: {
              searchTerm: appData.app_store_id,
              searchType: 'app_id',
              organizationId: organizationId
            }
          });

          if (scrapedData?.success && scrapedData.data) {
            enhancedData = {
              ...appData,
              description: scrapedData.data.description || this.generateContextualDescription(appData.app_name),
              subtitle: scrapedData.data.subtitle || '',
              currentKeywords: this.extractCurrentKeywords(scrapedData.data),
              reviews: scrapedData.data.userRatingCount,
              rating: scrapedData.data.averageUserRating
            };
            console.log('✅ [ENHANCED-DISCOVERY] Enhanced with fresh App Store data');
          }
        } catch (scrapingError) {
          console.warn('⚠️ [ENHANCED-DISCOVERY] App Store scraping failed, using database data');
        }
      }

      // Enhance with intelligent description if missing
      if (!enhancedData.description) {
        enhancedData.description = this.generateContextualDescription(enhancedData.app_name);
      }

      return enhancedData;
    } catch (error) {
      console.error('❌ [ENHANCED-DISCOVERY] Failed to get app data:', error);
      return null;
    }
  }

  /**
   * Extract keywords directly from app metadata
   */
  private extractKeywordsFromAppMetadata(appData: RealAppMetadata): EnhancedKeywordResult[] {
    const keywords: EnhancedKeywordResult[] = [];
    
    // Primary app name
    keywords.push({
      keyword: appData.app_name.toLowerCase(),
      estimatedVolume: 5000,
      difficulty: 3.0,
      source: 'app_metadata',
      relevanceScore: 10.0,
      contextualReason: 'Primary app name - highest brand relevance'
    });

    // Extract meaningful words from app name
    const nameWords = this.extractMeaningfulWords(appData.app_name);
    nameWords.forEach(word => {
      keywords.push({
        keyword: word,
        estimatedVolume: 3000,
        difficulty: 4.0,
        source: 'app_metadata',
        relevanceScore: 8.5,
        contextualReason: `Core brand term from app name: ${appData.app_name}`
      });
    });

    // Subtitle keywords
    if (appData.subtitle) {
      const subtitleWords = this.extractMeaningfulWords(appData.subtitle);
      subtitleWords.forEach(word => {
        keywords.push({
          keyword: word,
          estimatedVolume: 2000,
          difficulty: 4.5,
          source: 'app_metadata',
          relevanceScore: 7.0,
          contextualReason: `Feature term from app subtitle: ${appData.subtitle}`
        });
      });
    }

    return keywords;
  }

  /**
   * Analyze description content for contextual keywords
   */
  private analyzeDescriptionForKeywords(appData: RealAppMetadata): EnhancedKeywordResult[] {
    if (!appData.description) return [];

    const keywords: EnhancedKeywordResult[] = [];
    const appContext = this.detectAppContext(appData);
    
    // Extract key phrases from description
    const keyPhrases = this.extractKeyPhrasesFromText(appData.description);
    
    keyPhrases.forEach(phrase => {
      if (this.isContextuallyRelevant(phrase, appContext)) {
        keywords.push({
          keyword: phrase,
          estimatedVolume: 1500,
          difficulty: 5.0,
          source: 'description_analysis',
          relevanceScore: this.calculateContextualRelevance(phrase, appContext),
          contextualReason: `Contextual feature extracted from app description for ${appContext.primaryFunction}`
        });
      }
    });

    return keywords;
  }

  /**
   * Generate contextual semantic variations based on app understanding
   */
  private generateContextualSemanticVariations(appData: RealAppMetadata): EnhancedKeywordResult[] {
    const keywords: EnhancedKeywordResult[] = [];
    const appContext = this.detectAppContext(appData);
    const semanticVariations = this.getIntelligentSemanticVariations(appContext);
    
    semanticVariations.forEach(variation => {
      // App name + variation
      keywords.push({
        keyword: `${appData.app_name.toLowerCase()} ${variation}`,
        estimatedVolume: 1200,
        difficulty: 4.5,
        source: 'semantic_expansion',
        relevanceScore: 7.5,
        contextualReason: `Semantic variation combining brand with ${appContext.primaryFunction} context`
      });

      // Core function + variation
      keywords.push({
        keyword: `${appContext.primaryFunction} ${variation}`,
        estimatedVolume: 1000,
        difficulty: 5.5,
        source: 'semantic_expansion',
        relevanceScore: 6.5,
        contextualReason: `Semantic expansion of core function: ${appContext.primaryFunction}`
      });
    });

    return keywords;
  }

  /**
   * Generate branded variations
   */
  private generateBrandedVariations(appData: RealAppMetadata): EnhancedKeywordResult[] {
    const keywords: EnhancedKeywordResult[] = [];
    const appName = appData.app_name.toLowerCase();
    
    // Common app suffixes
    ['app', 'platform', 'tool', 'solution'].forEach(suffix => {
      keywords.push({
        keyword: `${appName} ${suffix}`,
        estimatedVolume: 800,
        difficulty: 3.5,
        source: 'app_metadata',
        relevanceScore: 6.0,
        contextualReason: `Brand variation with common app suffix: ${suffix}`
      });
    });

    return keywords;
  }

  /**
   * Detect detailed app context from real data
   */
  private detectAppContext(appData: RealAppMetadata): {
    appType: string;
    primaryFunction: string;
    targetAudience: string;
    contextCategory: string;
  } {
    const name = appData.app_name.toLowerCase();
    const description = (appData.description || '').toLowerCase();
    const category = (appData.category || '').toLowerCase();

    // Mindvalley-specific detection
    if (name.includes('mindvalley') || name.includes('mind valley')) {
      return {
        appType: 'personal_development_platform',
        primaryFunction: 'personal transformation',
        targetAudience: 'growth seekers',
        contextCategory: 'consciousness'
      };
    }

    // Pimsleur-specific detection
    if (name.includes('pimsleur') || description.includes('language learning')) {
      return {
        appType: 'language_learning_platform',
        primaryFunction: 'language acquisition',
        targetAudience: 'language learners',
        contextCategory: 'education'
      };
    }

    // General context detection based on description
    if (description.includes('meditation') || description.includes('mindfulness') || description.includes('consciousness')) {
      return {
        appType: 'wellness_platform',
        primaryFunction: 'mindfulness practice',
        targetAudience: 'wellness enthusiasts',
        contextCategory: 'wellness'
      };
    }

    if (description.includes('fitness') || description.includes('workout') || description.includes('exercise')) {
      return {
        appType: 'fitness_platform',
        primaryFunction: 'fitness training',
        targetAudience: 'fitness enthusiasts',
        contextCategory: 'health'
      };
    }

    // Fallback based on category
    return {
      appType: 'mobile_application',
      primaryFunction: 'user engagement',
      targetAudience: 'mobile users',
      contextCategory: category || 'general'
    };
  }

  /**
   * Get intelligent semantic variations based on app context
   */
  private getIntelligentSemanticVariations(context: { appType: string; primaryFunction: string; contextCategory: string }): string[] {
    const variationMap: Record<string, string[]> = {
      'consciousness': ['growth', 'transformation', 'awakening', 'development', 'evolution'],
      'wellness': ['mindfulness', 'meditation', 'peace', 'balance', 'harmony'],
      'education': ['learning', 'training', 'course', 'lesson', 'instruction'],
      'health': ['fitness', 'wellness', 'vitality', 'strength', 'endurance'],
      'general': ['solution', 'platform', 'system', 'tool', 'experience']
    };

    return variationMap[context.contextCategory] || variationMap['general'];
  }

  /**
   * Generate contextual description when missing
   */
  private generateContextualDescription(appName: string): string {
    const name = appName.toLowerCase();
    
    if (name.includes('mindvalley')) {
      return 'Transform your life through personal development, consciousness expansion, and mindfulness practices. Discover courses on meditation, personal growth, and spiritual awakening.';
    }
    
    if (name.includes('pimsleur')) {
      return 'Learn languages naturally through proven audio-based language learning methods. Master pronunciation, conversation skills, and fluency in foreign languages.';
    }
    
    return `${appName} - innovative mobile application designed to enhance your digital experience and personal growth.`;
  }

  // Helper methods
  private extractMeaningfulWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !this.isCommonWord(word) &&
        !word.includes('app')
      )
      .slice(0, 5);
  }

  private extractKeyPhrasesFromText(text: string): string[] {
    const sentences = text.split(/[.!?]+/).slice(0, 3);
    const phrases: string[] = [];
    
    sentences.forEach(sentence => {
      const words = sentence
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !this.isCommonWord(word));
      
      // Extract 2-3 word meaningful phrases
      for (let i = 0; i < words.length - 1; i++) {
        const twoWordPhrase = `${words[i]} ${words[i + 1]}`;
        if (this.isValuablePhrase(twoWordPhrase)) {
          phrases.push(twoWordPhrase);
        }
        
        if (i < words.length - 2) {
          const threeWordPhrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
          if (this.isValuablePhrase(threeWordPhrase)) {
            phrases.push(threeWordPhrase);
          }
        }
      }
    });
    
    return [...new Set(phrases)].slice(0, 8);
  }

  private isContextuallyRelevant(phrase: string, context: any): boolean {
    const contextTerms = [
      context.primaryFunction.split(' '),
      context.contextCategory.split('_'),
      ['learning', 'growth', 'development', 'training', 'practice', 'experience']
    ].flat();
    
    return contextTerms.some(term => phrase.includes(term.toLowerCase()));
  }

  private calculateContextualRelevance(phrase: string, context: any): number {
    let score = 5.0;
    
    if (phrase.includes(context.primaryFunction)) score += 3.0;
    if (phrase.includes(context.contextCategory)) score += 2.0;
    if (this.isValuablePhrase(phrase)) score += 1.0;
    
    return Math.min(10.0, score);
  }

  private isValuablePhrase(phrase: string): boolean {
    const lowValuePhrases = [
      'app store', 'mobile app', 'download now', 'get started', 'sign up',
      'easy to', 'simple to', 'designed for', 'perfect for'
    ];
    
    return !lowValuePhrases.some(lowValue => phrase.includes(lowValue)) && 
           phrase.length >= 6 && 
           phrase.length <= 30;
  }

  private isCommonWord(word: string): boolean {
    const commonWords = [
      'the', 'and', 'for', 'with', 'your', 'you', 'are', 'can', 'will', 'this', 'that',
      'app', 'application', 'mobile', 'phone', 'device', 'free', 'best', 'new', 'top',
      'get', 'use', 'make', 'help', 'now', 'all', 'more', 'most', 'one', 'way'
    ];
    return commonWords.includes(word.toLowerCase());
  }

  private extractCurrentKeywords(scrapedData: any): string[] {
    // Extract keywords from App Store metadata if available
    const keywords: string[] = [];
    
    if (scrapedData.keywords) {
      keywords.push(...scrapedData.keywords.split(',').map((k: string) => k.trim()));
    }
    
    if (scrapedData.genres) {
      keywords.push(...scrapedData.genres);
    }
    
    return keywords.filter(k => k.length > 2).slice(0, 10);
  }

  private deduplicateAndPrioritizeKeywords(keywords: EnhancedKeywordResult[], appData: RealAppMetadata): EnhancedKeywordResult[] {
    const keywordMap = new Map<string, EnhancedKeywordResult>();
    
    keywords.forEach(keyword => {
      const existing = keywordMap.get(keyword.keyword);
      if (!existing || keyword.relevanceScore > existing.relevanceScore) {
        keywordMap.set(keyword.keyword, keyword);
      }
    });
    
    return Array.from(keywordMap.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private generateIntelligentFallback(appId: string): EnhancedKeywordResult[] {
    return [
      {
        keyword: 'mobile application',
        estimatedVolume: 1000,
        difficulty: 5.0,
        source: 'intelligent_generation',
        relevanceScore: 5.0,
        contextualReason: 'Intelligent fallback for unknown app'
      }
    ];
  }
}

export const enhancedKeywordDiscoveryIntegrationService = new EnhancedKeywordDiscoveryIntegrationService();
