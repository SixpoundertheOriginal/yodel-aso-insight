
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
   * Category-specific keyword templates for natural search terms
   */
  private categoryTemplates: Record<string, CategoryTemplate> = {
    'education': {
      core: ['learn', 'study', 'course', 'lessons', 'tutorial', 'education app'],
      specific: ['online course', 'study guide', 'learning app', 'educational tool'],
      branded: [],
      intent: ['how to learn', 'best course', 'study tips']
    },
    'health': {
      core: ['fitness', 'workout', 'health', 'exercise', 'wellness'],
      specific: ['fitness tracker', 'workout app', 'health monitor', 'exercise plan'],
      branded: [],
      intent: ['lose weight', 'build muscle', 'stay healthy', 'track fitness']
    },
    'productivity': {
      core: ['productivity', 'task', 'organize', 'manage', 'efficiency'],
      specific: ['task manager', 'todo list', 'note taking', 'productivity app'],
      branded: [],
      intent: ['get organized', 'manage tasks', 'increase productivity']
    },
    'entertainment': {
      core: ['game', 'play', 'fun', 'entertainment', 'puzzle'],
      specific: ['mobile game', 'puzzle game', 'casual game', 'brain game'],
      branded: [],
      intent: ['fun games', 'best games', 'addictive games']
    },
    'finance': {
      core: ['money', 'budget', 'finance', 'banking', 'invest'],
      specific: ['budget app', 'expense tracker', 'investment app', 'banking app'],
      branded: [],
      intent: ['save money', 'track expenses', 'manage budget']
    },
    'language': {
      core: ['language', 'learn', 'speak', 'translate', 'pronunciation'],
      specific: ['language learning', 'language course', 'language app', 'translation'],
      branded: [],
      intent: ['learn language', 'speak fluently', 'language practice']
    }
  };

  /**
   * Common languages for language learning apps
   */
  private languages = [
    'spanish', 'french', 'german', 'italian', 'portuguese', 'russian',
    'japanese', 'chinese', 'korean', 'arabic', 'hindi', 'english'
  ];

  /**
   * Extract mentioned languages from app metadata
   */
  private extractLanguages(metadata: ScrapedMetadata): string[] {
    const text = `${metadata.title} ${metadata.subtitle || ''} ${metadata.description || ''}`.toLowerCase();
    return this.languages.filter(lang => 
      text.includes(lang) || 
      text.includes(lang + 'e') || // française, deutsche
      text.includes(lang.slice(0, -1)) // japanes -> japanese
    );
  }

  /**
   * Detect app category from metadata
   */
  private detectAppCategory(metadata: ScrapedMetadata): string {
    const category = metadata.applicationCategory?.toLowerCase() || '';
    const text = `${metadata.title} ${metadata.description || ''}`.toLowerCase();
    
    // Direct category mapping
    if (category.includes('education') || category.includes('reference')) return 'education';
    if (category.includes('health') || category.includes('fitness')) return 'health';
    if (category.includes('productivity') || category.includes('business')) return 'productivity';
    if (category.includes('entertainment') || category.includes('games')) return 'entertainment';
    if (category.includes('finance')) return 'finance';
    
    // Language learning detection
    if (text.includes('language') || text.includes('learn') || 
        text.includes('speak') || text.includes('translate') ||
        this.extractLanguages(metadata).length > 0) {
      return 'language';
    }
    
    // Text-based detection
    if (text.includes('workout') || text.includes('fitness') || text.includes('health')) return 'health';
    if (text.includes('task') || text.includes('productivity') || text.includes('organize')) return 'productivity';
    if (text.includes('game') || text.includes('play') || text.includes('puzzle')) return 'entertainment';
    if (text.includes('money') || text.includes('budget') || text.includes('finance')) return 'finance';
    if (text.includes('learn') || text.includes('course') || text.includes('study')) return 'education';
    
    return 'productivity'; // Default fallback
  }

  /**
   * Generate branded keyword combinations
   */
  private generateBrandedKeywords(appName: string, category: string, languages: string[]): SmartKeyword[] {
    const keywords: SmartKeyword[] = [];
    const cleanAppName = appName.toLowerCase().replace(/[^\w\s]/g, '').trim();
    
    // Core branded terms
    keywords.push({
      keyword: cleanAppName,
      priority: 'high',
      type: 'branded',
      searchVolume: 'medium',
      reason: 'Primary brand term'
    });

    // Brand + category
    const template = this.categoryTemplates[category];
    if (template) {
      template.core.slice(0, 3).forEach(term => {
        keywords.push({
          keyword: `${cleanAppName} ${term}`,
          priority: 'medium',
          type: 'branded',
          searchVolume: 'low',
          reason: 'Brand + category combination'
        });
      });
    }

    // Language-specific branded terms (for language apps)
    if (category === 'language' && languages.length > 0) {
      languages.slice(0, 3).forEach(lang => {
        keywords.push({
          keyword: `${cleanAppName} ${lang}`,
          priority: 'medium',
          type: 'branded',
          searchVolume: 'low',
          reason: `Brand + ${lang} language`
        });
      });
    }

    return keywords;
  }

  /**
   * Generate category-specific keywords
   */
  private generateCategoryKeywords(category: string, languages: string[]): SmartKeyword[] {
    const keywords: SmartKeyword[] = [];
    const template = this.categoryTemplates[category];
    
    if (!template) return keywords;

    // Core category terms
    template.core.forEach((term, index) => {
      keywords.push({
        keyword: term,
        priority: index < 2 ? 'high' : 'medium',
        type: 'category',
        searchVolume: index < 2 ? 'high' : 'medium',
        reason: 'Core category keyword'
      });
    });

    // Specific category combinations
    template.specific.forEach(term => {
      keywords.push({
        keyword: term,
        priority: 'medium',
        type: 'category',
        searchVolume: 'medium',
        reason: 'Specific category term'
      });
    });

    // Language-specific keywords (for language learning apps)
    if (category === 'language' && languages.length > 0) {
      languages.forEach(lang => {
        keywords.push({
          keyword: `learn ${lang}`,
          priority: 'high',
          type: 'intent',
          searchVolume: 'high',
          reason: `Primary intent for ${lang}`
        });
        
        keywords.push({
          keyword: `${lang} lessons`,
          priority: 'medium',
          type: 'intent',
          searchVolume: 'medium',
          reason: `Lessons intent for ${lang}`
        });
        
        keywords.push({
          keyword: `${lang} course`,
          priority: 'medium',
          type: 'intent',
          searchVolume: 'medium',
          reason: `Course intent for ${lang}`
        });
      });
    }

    return keywords;
  }

  /**
   * Generate smart keywords using semantic analysis
   */
  generateSmartKeywords(metadata: ScrapedMetadata): SmartKeyword[] {
    console.log('🧠 [KEYWORD-INTELLIGENCE] Generating smart keywords for:', metadata.name);
    
    const category = this.detectAppCategory(metadata);
    const languages = this.extractLanguages(metadata);
    
    console.log('📊 [KEYWORD-INTELLIGENCE] Analysis:', {
      category,
      languages,
      appName: metadata.name
    });

    const keywords: SmartKeyword[] = [];
    
    // Generate branded keywords
    keywords.push(...this.generateBrandedKeywords(metadata.name, category, languages));
    
    // Generate category keywords
    keywords.push(...this.generateCategoryKeywords(category, languages));
    
    // Remove duplicates and prioritize
    const uniqueKeywords = keywords.reduce((acc, keyword) => {
      if (!acc.find(k => k.keyword === keyword.keyword)) {
        acc.push(keyword);
      }
      return acc;
    }, [] as SmartKeyword[]);
    
    // Sort by priority and limit results
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const sortedKeywords = uniqueKeywords
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      .slice(0, 15); // Limit to top 15 keywords
    
    console.log('✅ [KEYWORD-INTELLIGENCE] Generated', sortedKeywords.length, 'smart keywords');
    return sortedKeywords;
  }

  /**
   * Convert smart keywords to ranking format for compatibility
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
      // Estimate position based on keyword characteristics
      let estimatedPosition: number;
      
      if (smartKeyword.type === 'branded' && smartKeyword.priority === 'high') {
        estimatedPosition = Math.floor(Math.random() * 3) + 1; // 1-3 for brand terms
      } else if (smartKeyword.priority === 'high') {
        estimatedPosition = Math.floor(Math.random() * 10) + 1; // 1-10 for high priority
      } else if (smartKeyword.priority === 'medium') {
        estimatedPosition = Math.floor(Math.random() * 20) + 5; // 5-25 for medium priority
      } else {
        estimatedPosition = Math.floor(Math.random() * 40) + 15; // 15-55 for low priority
      }

      return {
        keyword: smartKeyword.keyword,
        position: estimatedPosition,
        volume: smartKeyword.searchVolume === 'high' ? 'High' as const : 
                smartKeyword.searchVolume === 'medium' ? 'Medium' as const : 'Low' as const,
        trend: 'stable' as const,
        searchResults: Math.floor(Math.random() * 1000) + 100,
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
