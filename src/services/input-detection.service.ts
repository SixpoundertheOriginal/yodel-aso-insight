
import { ValidationError, SecureResponse } from '@/types/security';

export interface InputAnalysis {
  type: 'url' | 'keyword' | 'brand';
  confidence: number;
  language?: string;
  region?: string;
  category?: string;
}

export interface SearchParameters {
  term: string;
  type: InputAnalysis['type'];
  country: string;
  limit: number;
  includeCompetitors: boolean;
}

class InputDetectionService {
  /**
   * Emergency stabilized input analysis - more permissive and robust
   */
  analyzeInput(input: string): SecureResponse<InputAnalysis> {
    console.log('🔍 [INPUT-DETECTION] Analyzing input:', input);
    
    const trimmed = input.trim();
    const errors: ValidationError[] = [];

    // Basic validation - be more permissive
    if (!trimmed || trimmed.length < 1) {
      errors.push({
        field: 'input',
        message: 'Search term cannot be empty',
        code: 'INPUT_EMPTY'
      });
      return { success: false, errors };
    }

    if (trimmed.length > 200) {
      errors.push({
        field: 'input',
        message: 'Search term is too long (max 200 characters)',
        code: 'INPUT_TOO_LONG'
      });
      return { success: false, errors };
    }

    // Security validation - only block obvious malicious content
    const maliciousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
      /on\w+\s*=/i
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(trimmed)) {
        console.warn('⚠️ [INPUT-DETECTION] Malicious pattern detected:', pattern);
        errors.push({
          field: 'input',
          message: 'Invalid characters detected in search term',
          code: 'MALICIOUS_INPUT'
        });
        return { success: false, errors };
      }
    }

    // Improved URL detection - more precise
    if (this.isDefinitelyUrl(trimmed)) {
      console.log('✅ [INPUT-DETECTION] Detected as URL');
      return {
        success: true,
        data: {
          type: 'url',
          confidence: 0.95,
          region: this.extractRegionFromUrl(trimmed)
        }
      };
    }

    // Improved brand detection
    if (this.isLikelyBrand(trimmed)) {
      console.log('✅ [INPUT-DETECTION] Detected as brand');
      return {
        success: true,
        data: {
          type: 'brand',
          confidence: 0.8,
          language: this.detectLanguage(trimmed),
          category: this.predictCategory(trimmed)
        }
      };
    }

    // Default to keyword - most permissive
    console.log('✅ [INPUT-DETECTION] Detected as keyword');
    return {
      success: true,
      data: {
        type: 'keyword',
        confidence: 0.7,
        language: this.detectLanguage(trimmed),
        category: this.predictCategory(trimmed)
      }
    };
  }

  /**
   * Create search parameters with better defaults
   */
  createSearchParameters(input: string, analysis: InputAnalysis): SearchParameters {
    const params = {
      term: this.normalizeSearchTerm(input, analysis.type),
      type: analysis.type,
      country: analysis.region || 'us',
      limit: this.getOptimalLimit(analysis.type),
      includeCompetitors: analysis.type !== 'url'
    };
    
    console.log('📊 [INPUT-DETECTION] Created search parameters:', params);
    return params;
  }

  /**
   * More precise URL detection
   */
  private isDefinitelyUrl(input: string): boolean {
    try {
      // Must start with protocol or be a clear domain
      if (!input.includes('://') && !input.startsWith('apps.apple.com') && !input.startsWith('play.google.com')) {
        return false;
      }
      
      const url = new URL(input.startsWith('http') ? input : `https://${input}`);
      const isAppStore = url.hostname.includes('apps.apple.com') || url.hostname.includes('play.google.com');
      
      console.log('🌐 [INPUT-DETECTION] URL analysis:', { hostname: url.hostname, isAppStore });
      return isAppStore;
    } catch (error) {
      console.log('❌ [INPUT-DETECTION] URL parsing failed:', error.message);
      return false;
    }
  }

  /**
   * Improved brand detection - less aggressive
   */
  private isLikelyBrand(input: string): boolean {
    // Single word with capital letter is likely a brand
    const words = input.trim().split(/\s+/);
    
    // Very short inputs are likely brands
    if (words.length === 1 && input.length >= 3 && input.length <= 20) {
      const hasCapital = /[A-Z]/.test(input);
      const isNotGeneric = !this.isGenericKeyword(input.toLowerCase());
      
      console.log('🏷️ [INPUT-DETECTION] Brand analysis:', { 
        hasCapital, 
        isNotGeneric, 
        input 
      });
      
      return hasCapital && isNotGeneric;
    }
    
    // Multiple words starting with capitals
    if (words.length <= 3 && words.every(word => /^[A-Z]/.test(word))) {
      return !this.containsGenericKeywords(input.toLowerCase());
    }
    
    return false;
  }

  private isGenericKeyword(input: string): boolean {
    const genericTerms = [
      'app', 'apps', 'game', 'games', 'learning', 'education', 'fitness', 
      'health', 'music', 'photo', 'video', 'social', 'messaging', 'chat',
      'productivity', 'finance', 'shopping', 'travel', 'food', 'sports',
      'news', 'weather', 'dating', 'meditation', 'workout', 'recipe',
      'calculator', 'notes', 'calendar', 'email', 'browser', 'camera'
    ];
    
    return genericTerms.includes(input);
  }

  private containsGenericKeywords(input: string): boolean {
    const genericKeywords = [
      'learn', 'education', 'fitness', 'health', 'music', 'photo',
      'social', 'messaging', 'productivity', 'finance', 'shopping',
      'travel', 'food', 'sports', 'news', 'weather', 'dating'
    ];

    return genericKeywords.some(keyword => input.includes(keyword));
  }

  private detectLanguage(input: string): string {
    if (/[\u4e00-\u9fff]/.test(input)) return 'zh';
    if (/[\u0590-\u05ff]/.test(input)) return 'he';
    if (/[\u0600-\u06ff]/.test(input)) return 'ar';
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(input)) return 'ja';
    if (/[\uac00-\ud7af]/.test(input)) return 'ko';
    return 'en';
  }

  private predictCategory(input: string): string {
    const categoryKeywords = {
      'Education': ['learn', 'education', 'study', 'language', 'math', 'science', 'school'],
      'Health & Fitness': ['fitness', 'health', 'workout', 'meditation', 'yoga', 'diet'],
      'Entertainment': ['music', 'video', 'movie', 'game', 'streaming', 'entertainment'],
      'Social Networking': ['social', 'chat', 'messaging', 'dating', 'community'],
      'Productivity': ['productivity', 'task', 'note', 'calendar', 'office', 'work'],
      'Finance': ['finance', 'banking', 'money', 'budget', 'crypto', 'investment'],
      'Shopping': ['shopping', 'ecommerce', 'store', 'marketplace', 'buy'],
      'Photo & Video': ['photo', 'camera', 'video', 'editor', 'filter', 'image']
    };

    const lowerInput = input.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerInput.includes(keyword))) {
        return category;
      }
    }

    return 'Utilities';
  }

  private extractRegionFromUrl(url: string): string {
    try {
      const match = url.match(/\/([a-z]{2})\//);
      return match ? match[1] : 'us';
    } catch {
      return 'us';
    }
  }

  private normalizeSearchTerm(input: string, type: InputAnalysis['type']): string {
    if (type === 'url') return input;
    
    // Less aggressive cleaning for keywords
    return input
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace only
      .substring(0, 100); // Reasonable length limit
  }

  private getOptimalLimit(type: InputAnalysis['type']): number {
    switch (type) {
      case 'url': return 1;
      case 'brand': return 10;
      case 'keyword': return 25;
      default: return 15;
    }
  }
}

export const inputDetectionService = new InputDetectionService();
