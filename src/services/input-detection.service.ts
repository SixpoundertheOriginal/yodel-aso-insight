
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
   * Intelligently detect input type and validate accordingly
   */
  analyzeInput(input: string): SecureResponse<InputAnalysis> {
    const trimmed = input.trim();
    const errors: ValidationError[] = [];

    // Empty input validation
    if (!trimmed || trimmed.length < 2) {
      errors.push({
        field: 'input',
        message: 'Search term must be at least 2 characters long',
        code: 'INPUT_TOO_SHORT'
      });
      return { success: false, errors };
    }

    // Length validation
    if (trimmed.length > 100) {
      errors.push({
        field: 'input',
        message: 'Search term must be less than 100 characters',
        code: 'INPUT_TOO_LONG'
      });
      return { success: false, errors };
    }

    // Security validation - detect malicious patterns
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(trimmed)) {
        errors.push({
          field: 'input',
          message: 'Invalid characters detected in search term',
          code: 'MALICIOUS_INPUT'
        });
        return { success: false, errors };
      }
    }

    // URL detection
    if (this.isAppStoreUrl(trimmed)) {
      return {
        success: true,
        data: {
          type: 'url',
          confidence: 0.95,
          region: this.extractRegionFromUrl(trimmed)
        }
      };
    }

    // Brand detection (specific app names)
    if (this.isBrandName(trimmed)) {
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

    // Keyword detection (generic search terms)
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
   * Create optimized search parameters based on input analysis
   */
  createSearchParameters(input: string, analysis: InputAnalysis): SearchParameters {
    return {
      term: this.normalizeSearchTerm(input, analysis.type),
      type: analysis.type,
      country: analysis.region || 'us',
      limit: this.getOptimalLimit(analysis.type),
      includeCompetitors: analysis.type !== 'url' // URLs get direct app data, keywords need competitors
    };
  }

  private isAppStoreUrl(input: string): boolean {
    try {
      const url = new URL(input.startsWith('http') ? input : `https://${input}`);
      return url.hostname.includes('apps.apple.com') || url.hostname.includes('play.google.com');
    } catch {
      return false;
    }
  }

  private isBrandName(input: string): boolean {
    // Known patterns for brand names
    const brandPatterns = [
      /^[A-Z][a-zA-Z0-9\s]{2,30}$/,  // Capitalized brand names
      /\b(app|mobile|pro|premium|plus)\b/i,  // Common app suffixes
    ];

    // Common generic keywords that indicate it's NOT a brand
    const genericKeywords = [
      'learning', 'education', 'fitness', 'health', 'music', 'photo', 'video',
      'social', 'messaging', 'productivity', 'finance', 'shopping', 'travel',
      'food', 'sports', 'news', 'weather', 'dating', 'meditation', 'workout'
    ];

    const hasGenericKeywords = genericKeywords.some(keyword => 
      input.toLowerCase().includes(keyword)
    );

    if (hasGenericKeywords) return false;

    return brandPatterns.some(pattern => pattern.test(input));
  }

  private detectLanguage(input: string): string {
    // Simple language detection based on character patterns
    if (/[\u4e00-\u9fff]/.test(input)) return 'zh';
    if (/[\u0590-\u05ff]/.test(input)) return 'he';
    if (/[\u0600-\u06ff]/.test(input)) return 'ar';
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(input)) return 'ja';
    if (/[\uac00-\ud7af]/.test(input)) return 'ko';
    return 'en';
  }

  private predictCategory(input: string): string {
    const categoryKeywords = {
      'Education': ['learn', 'education', 'study', 'language', 'math', 'science'],
      'Health & Fitness': ['fitness', 'health', 'workout', 'meditation', 'yoga'],
      'Entertainment': ['music', 'video', 'movie', 'game', 'streaming'],
      'Social Networking': ['social', 'chat', 'messaging', 'dating', 'community'],
      'Productivity': ['productivity', 'task', 'note', 'calendar', 'office'],
      'Finance': ['finance', 'banking', 'money', 'budget', 'crypto'],
      'Shopping': ['shopping', 'ecommerce', 'store', 'marketplace'],
      'Photo & Video': ['photo', 'camera', 'video', 'editor', 'filter']
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
    const match = url.match(/\/([a-z]{2})\//);
    return match ? match[1] : 'us';
  }

  private normalizeSearchTerm(input: string, type: InputAnalysis['type']): string {
    if (type === 'url') return input;
    
    // Clean and optimize search terms
    return input
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')  // Remove special chars except hyphens
      .replace(/\s+/g, ' ')       // Normalize whitespace
      .trim();
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
