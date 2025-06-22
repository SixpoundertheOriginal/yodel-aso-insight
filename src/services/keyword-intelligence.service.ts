
import { ScrapedMetadata } from '@/types/aso';

export interface SmartKeyword {
  keyword: string;
  priority: 'high' | 'medium' | 'low';
  type: 'branded' | 'category' | 'feature' | 'intent';
  searchVolume: 'high' | 'medium' | 'low';
  reason: string;
}

export interface CategoryTemplate {
  core: string[];
  specific: string[];
  branded: string[];
  intent: string[];
}

class KeywordIntelligenceService {
  /**
   * Enhanced category templates with app-specific intelligence
   */
  private categoryTemplates: Record<string, CategoryTemplate> = {
    'education': {
      core: ['learning platform', 'online education', 'skill development', 'knowledge sharing'],
      specific: ['interactive learning', 'educational content', 'course platform', 'study companion'],
      branded: [],
      intent: ['learn new skills', 'educational growth', 'knowledge expansion']
    },
    'personal_development': {
      core: ['personal growth', 'self improvement', 'mindfulness', 'life coaching'],
      specific: ['transformation platform', 'growth mindset', 'personal coaching', 'wellness journey'],
      branded: [],
      intent: ['improve yourself', 'personal transformation', 'mindful living']
    },
    'health': {
      core: ['wellness', 'health tracking', 'fitness journey', 'mindful health'],
      specific: ['health monitor', 'wellness coach', 'fitness companion', 'health insights'],
      branded: [],
      intent: ['stay healthy', 'wellness tracking', 'health improvement']
    },
    'productivity': {
      core: ['productivity boost', 'task organization', 'efficiency tool', 'workflow management'],
      specific: ['productivity system', 'task optimization', 'work efficiency', 'organization tool'],
      branded: [],
      intent: ['get organized', 'boost productivity', 'efficient workflow']
    },
    'entertainment': {
      core: ['entertainment app', 'interactive content', 'engaging experience', 'digital entertainment'],
      specific: ['entertainment platform', 'interactive media', 'engaging content', 'digital fun'],
      branded: [],
      intent: ['entertainment experience', 'fun activities', 'engaging content']
    },
    'lifestyle': {
      core: ['lifestyle improvement', 'daily wellness', 'life enhancement', 'personal lifestyle'],
      specific: ['lifestyle coach', 'daily habits', 'life optimization', 'lifestyle platform'],
      branded: [],
      intent: ['improve lifestyle', 'better living', 'lifestyle enhancement']
    }
  };

  /**
   * Detect app category and type with enhanced intelligence
   */
  private detectAppContext(metadata: ScrapedMetadata): {
    category: string;
    appType: string;
    coreFunction: string;
  } {
    const name = metadata.name?.toLowerCase() || '';
    const description = metadata.description?.toLowerCase() || '';
    const category = metadata.applicationCategory?.toLowerCase() || '';
    
    // Enhanced app-specific detection
    if (name.includes('mind') || name.includes('valley') || description.includes('personal development')) {
      return {
        category: 'personal_development',
        appType: 'coaching_platform',
        coreFunction: 'personal transformation'
      };
    }
    
    if (name.includes('fit') || description.includes('fitness') || description.includes('workout')) {
      return {
        category: 'health',
        appType: 'fitness_tracker',
        coreFunction: 'health and fitness'
      };
    }
    
    if (description.includes('task') || description.includes('productivity') || description.includes('organize')) {
      return {
        category: 'productivity',
        appType: 'productivity_tool',
        coreFunction: 'task management'
      };
    }
    
    if (description.includes('learn') || category.includes('education') || description.includes('course')) {
      return {
        category: 'education',
        appType: 'learning_platform',
        coreFunction: 'educational content'
      };
    }
    
    if (description.includes('social') || description.includes('community') || description.includes('connect')) {
      return {
        category: 'lifestyle',
        appType: 'social_platform',
        coreFunction: 'social connection'
      };
    }
    
    // Fallback analysis
    return {
      category: 'lifestyle',
      appType: 'general_app',
      coreFunction: 'user experience'
    };
  }

  /**
   * Generate smart keywords with enhanced app context
   */
  generateSmartKeywords(metadata: ScrapedMetadata): SmartKeyword[] {
    console.log('🧠 [KEYWORD-INTELLIGENCE] Generating smart keywords for:', metadata.name);
    
    const context = this.detectAppContext(metadata);
    
    console.log('📊 [KEYWORD-INTELLIGENCE] Enhanced analysis:', {
      category: context.category,
      appType: context.appType,
      coreFunction: context.coreFunction,
      appName: metadata.name
    });

    const keywords: SmartKeyword[] = [];
    
    // Generate enhanced branded keywords
    keywords.push(...this.generateEnhancedBrandedKeywords(metadata, context));
    
    // Generate context-aware category keywords
    keywords.push(...this.generateContextAwareCategoryKeywords(context));
    
    // Generate intelligent feature keywords
    keywords.push(...this.generateIntelligentFeatureKeywords(metadata, context));
    
    // Remove duplicates and prioritize
    const uniqueKeywords = keywords.reduce((acc, keyword) => {
      if (!acc.find(k => k.keyword === keyword.keyword)) {
        acc.push(keyword);
      }
      return acc;
    }, [] as SmartKeyword[]);
    
    // Sort by relevance and limit results
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const sortedKeywords = uniqueKeywords
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      .slice(0, 20); // Increased limit for better coverage
    
    console.log('✅ [KEYWORD-INTELLIGENCE] Generated', sortedKeywords.length, 'intelligent keywords');
    return sortedKeywords;
  }

  /**
   * Generate enhanced branded keywords with app context
   */
  private generateEnhancedBrandedKeywords(
    metadata: ScrapedMetadata,
    context: { category: string; appType: string; coreFunction: string }
  ): SmartKeyword[] {
    const keywords: SmartKeyword[] = [];
    const cleanAppName = metadata.name.toLowerCase().replace(/[^\w\s]/g, '').trim();
    
    // Primary brand term
    keywords.push({
      keyword: cleanAppName,
      priority: 'high',
      type: 'branded',
      searchVolume: 'medium',
      reason: 'Primary brand search term'
    });

    // Brand + core function
    keywords.push({
      keyword: `${cleanAppName} ${context.coreFunction}`,
      priority: 'high',
      type: 'branded',
      searchVolume: 'medium',
      reason: `Brand name with core function: ${context.coreFunction}`
    });

    // Brand + app type
    if (context.appType !== 'general_app') {
      const appTypeReadable = context.appType.replace('_', ' ');
      keywords.push({
        keyword: `${cleanAppName} ${appTypeReadable}`,
        priority: 'medium',
        type: 'branded',
        searchVolume: 'low',
        reason: `Brand name with app type: ${appTypeReadable}`
      });
    }

    // App name + common app suffixes
    ['app', 'platform', 'tool'].forEach(suffix => {
      keywords.push({
        keyword: `${cleanAppName} ${suffix}`,
        priority: 'medium',
        type: 'branded',
        searchVolume: 'low',
        reason: `Brand name with ${suffix} suffix`
      });
    });

    return keywords;
  }

  /**
   * Generate context-aware category keywords
   */
  private generateContextAwareCategoryKeywords(
    context: { category: string; appType: string; coreFunction: string }
  ): SmartKeyword[] {
    const keywords: SmartKeyword[] = [];
    const template = this.categoryTemplates[context.category];
    
    if (!template) return keywords;

    // Core category terms with high priority
    template.core.forEach((term, index) => {
      keywords.push({
        keyword: term,
        priority: index < 2 ? 'high' : 'medium',
        type: 'category',
        searchVolume: index < 2 ? 'high' : 'medium',
        reason: `Core ${context.category} keyword`
      });
    });

    // Specific category combinations
    template.specific.forEach(term => {
      keywords.push({
        keyword: term,
        priority: 'medium',
        type: 'category',
        searchVolume: 'medium',
        reason: `Specific ${context.category} term`
      });
    });

    // Intent-based keywords
    template.intent.forEach(term => {
      keywords.push({
        keyword: term,
        priority: 'medium',
        type: 'intent',
        searchVolume: 'medium',
        reason: `User intent for ${context.category}`
      });
    });

    return keywords;
  }

  /**
   * Generate intelligent feature keywords from app description
   */
  private generateIntelligentFeatureKeywords(
    metadata: ScrapedMetadata,
    context: { category: string; appType: string; coreFunction: string }
  ): SmartKeyword[] {
    const keywords: SmartKeyword[] = [];
    
    if (!metadata.description) return keywords;
    
    // Extract meaningful phrases from description
    const meaningfulPhrases = this.extractMeaningfulPhrases(metadata.description);
    
    meaningfulPhrases.forEach(phrase => {
      // Filter out generic phrases and enhance with context
      if (this.isValuableFeaturePhrase(phrase, context)) {
        keywords.push({
          keyword: phrase,
          priority: 'medium',
          type: 'feature',
          searchVolume: 'low',
          reason: `Feature extracted from app description`
        });
      }
    });

    return keywords;
  }

  /**
   * Extract meaningful phrases from description
   */
  private extractMeaningfulPhrases(description: string): string[] {
    const sentences = description.split(/[.!?]+/).slice(0, 3);
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
        if (twoWordPhrase.length >= 6 && twoWordPhrase.length <= 25) {
          phrases.push(twoWordPhrase);
        }
        
        if (i < words.length - 2) {
          const threeWordPhrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
          if (threeWordPhrase.length >= 8 && threeWordPhrase.length <= 30) {
            phrases.push(threeWordPhrase);
          }
        }
      }
    });
    
    return [...new Set(phrases)].slice(0, 8);
  }

  /**
   * Check if phrase is valuable for the app context
   */
  private isValuableFeaturePhrase(
    phrase: string,
    context: { category: string; appType: string; coreFunction: string }
  ): boolean {
    // Filter out generic phrases
    const genericPhrases = [
      'app store', 'mobile app', 'download now', 'get started', 'sign up',
      'easy to', 'simple to', 'designed for', 'perfect for', 'best app'
    ];
    
    if (genericPhrases.some(generic => phrase.includes(generic))) {
      return false;
    }
    
    // Boost phrases related to app context
    const contextRelevantTerms = [
      context.coreFunction.split(' '),
      context.category.split('_'),
      ['learning', 'growth', 'development', 'improvement', 'wellness', 'fitness', 'productivity']
    ].flat();
    
    return contextRelevantTerms.some(term => phrase.includes(term));
  }

  /**
   * Check if word is common/generic
   */
  private isCommonWord(word: string): boolean {
    const commonWords = [
      'the', 'and', 'for', 'with', 'your', 'you', 'are', 'can', 'will', 'this', 'that',
      'app', 'application', 'mobile', 'phone', 'device', 'free', 'best', 'new', 'top',
      'get', 'use', 'make', 'help', 'now', 'all', 'more', 'most', 'one', 'way', 'our'
    ];
    return commonWords.includes(word.toLowerCase());
  }

  /**
   * Convert smart keywords to ranking format with enhanced intelligence
   */
  convertToRankingFormat(smartKeywords: SmartKeyword[]): Array<{
    keyword: string;
    position: number;
    volume: 'Low' | 'Medium' | 'High';
    trend: 'up' | 'down' | 'stable';
    searchResults: number;
    lastChecked: Date;
    confidence: 'estimated' | 'actual';
    priority: 'high' | 'medium' | 'low';
    type: string;
    reason: string;
  }> {
    return smartKeywords.map((smartKeyword, index) => {
      // Enhanced position estimation based on keyword intelligence
      let estimatedPosition: number;
      
      if (smartKeyword.type === 'branded' && smartKeyword.priority === 'high') {
        estimatedPosition = Math.floor(Math.random() * 3) + 1; // 1-3 for high-priority brand terms
      } else if (smartKeyword.type === 'branded') {
        estimatedPosition = Math.floor(Math.random() * 8) + 2; // 2-10 for other brand terms
      } else if (smartKeyword.priority === 'high') {
        estimatedPosition = Math.floor(Math.random() * 15) + 5; // 5-20 for high priority non-brand
      } else if (smartKeyword.priority === 'medium') {
        estimatedPosition = Math.floor(Math.random() * 25) + 10; // 10-35 for medium priority
      } else {
        estimatedPosition = Math.floor(Math.random() * 40) + 20; // 20-60 for low priority
      }

      // Enhanced search volume estimation
      const volumeMapping: Record<string, 'Low' | 'Medium' | 'High'> = {
        'high': 'High',
        'medium': 'Medium',
        'low': 'Low'
      };

      return {
        keyword: smartKeyword.keyword,
        position: estimatedPosition,
        volume: volumeMapping[smartKeyword.searchVolume],
        trend: 'stable' as const,
        searchResults: Math.floor(Math.random() * 2000) + 500,
        lastChecked: new Date(),
        confidence: 'estimated' as const,
        priority: smartKeyword.priority,
        type: smartKeyword.type,
        reason: smartKeyword.reason
      };
    });
  }
}

export const keywordIntelligenceService = new KeywordIntelligenceService();
