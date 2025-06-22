
import { dataValidationService } from './data-validation.service';
import { securityService } from './security.service';

export interface KeywordValidationResult {
  isValid: boolean;
  sanitizedKeyword: string;
  errors: string[];
  metadata: {
    originalLength: number;
    sanitizedLength: number;
    wasModified: boolean;
  };
}

export interface KeywordSecurityContext {
  organizationId: string;
  userId?: string;
  maxKeywordLength?: number;
  allowSpecialChars?: boolean;
}

class KeywordValidationService {
  private readonly MAX_KEYWORD_LENGTH = 100;
  private readonly MIN_KEYWORD_LENGTH = 1;
  private readonly ALLOWED_SPECIAL_CHARS = /^[a-zA-Z0-9\s\-_\.]+$/;

  /**
   * Validate and sanitize keyword input with security context
   */
  validateKeyword(keyword: string, context: KeywordSecurityContext): KeywordValidationResult {
    const errors: string[] = [];
    const originalLength = keyword.length;
    let sanitizedKeyword = keyword;

    // Basic validation
    if (!keyword || typeof keyword !== 'string') {
      return {
        isValid: false,
        sanitizedKeyword: '',
        errors: ['Keyword must be a non-empty string'],
        metadata: { originalLength: 0, sanitizedLength: 0, wasModified: false }
      };
    }

    // Sanitize input for security
    sanitizedKeyword = securityService.sanitizeInput(keyword);

    // Length validation
    const maxLength = context.maxKeywordLength || this.MAX_KEYWORD_LENGTH;
    if (sanitizedKeyword.length > maxLength) {
      sanitizedKeyword = sanitizedKeyword.substring(0, maxLength);
      errors.push(`Keyword truncated to ${maxLength} characters`);
    }

    if (sanitizedKeyword.length < this.MIN_KEYWORD_LENGTH) {
      errors.push(`Keyword must be at least ${this.MIN_KEYWORD_LENGTH} character`);
    }

    // Character validation
    if (!context.allowSpecialChars && !this.ALLOWED_SPECIAL_CHARS.test(sanitizedKeyword)) {
      sanitizedKeyword = sanitizedKeyword.replace(/[^a-zA-Z0-9\s\-_\.]/g, '');
      errors.push('Special characters removed from keyword');
    }

    // Additional sanitization
    sanitizedKeyword = sanitizedKeyword.trim().toLowerCase();

    const wasModified = sanitizedKeyword !== keyword;
    const isValid = errors.length === 0 && sanitizedKeyword.length >= this.MIN_KEYWORD_LENGTH;

    return {
      isValid,
      sanitizedKeyword,
      errors,
      metadata: {
        originalLength,
        sanitizedLength: sanitizedKeyword.length,
        wasModified
      }
    };
  }

  /**
   * Validate multiple keywords in batch
   */
  validateKeywords(keywords: string[], context: KeywordSecurityContext): {
    valid: KeywordValidationResult[];
    invalid: KeywordValidationResult[];
    summary: {
      total: number;
      valid: number;
      invalid: number;
      modified: number;
    };
  } {
    const results = keywords.map(keyword => this.validateKeyword(keyword, context));
    const valid = results.filter(r => r.isValid);
    const invalid = results.filter(r => !r.isValid);
    const modified = results.filter(r => r.metadata.wasModified);

    return {
      valid,
      invalid,
      summary: {
        total: results.length,
        valid: valid.length,
        invalid: invalid.length,
        modified: modified.length
      }
    };
  }

  /**
   * Generate safe keyword variations for testing
   */
  generateKeywordVariations(baseKeyword: string, context: KeywordSecurityContext): string[] {
    const validation = this.validateKeyword(baseKeyword, context);
    if (!validation.isValid) {
      return [];
    }

    const keyword = validation.sanitizedKeyword;
    const variations: string[] = [keyword];

    // Add common variations
    if (keyword.includes(' ')) {
      variations.push(keyword.replace(/\s+/g, ''));
      variations.push(keyword.replace(/\s+/g, '-'));
    }

    // Add plural/singular forms
    if (!keyword.endsWith('s')) {
      variations.push(keyword + 's');
    } else {
      const singular = keyword.slice(0, -1);
      if (singular.length >= this.MIN_KEYWORD_LENGTH) {
        variations.push(singular);
      }
    }

    // Remove duplicates and validate all variations
    return [...new Set(variations)].filter(v => 
      this.validateKeyword(v, context).isValid
    );
  }
}

export const keywordValidationService = new KeywordValidationService();
