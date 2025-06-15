
import { ValidationResult } from '@/types/aso';

export interface ValidationRule<T> {
  field: keyof T;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  message?: string;
}

class DataValidationService {
  /**
   * Generic validation engine for any data structure
   */
  validate<T>(data: any, rules: ValidationRule<T>[]): ValidationResult {
    const issues: string[] = [];
    const sanitized = { ...data };

    rules.forEach(rule => {
      const value = data[rule.field];
      const fieldName = String(rule.field);

      // Required field check
      if (rule.required && (value === undefined || value === null || value === '')) {
        issues.push(rule.message || `${fieldName} is required`);
        return;
      }

      // Skip further validation if field is not present and not required
      if (value === undefined || value === null) {
        return;
      }

      // Type validation
      if (rule.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rule.type) {
          issues.push(rule.message || `${fieldName} must be of type ${rule.type}`);
        }
      }

      // Length validation for strings
      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          issues.push(rule.message || `${fieldName} must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          issues.push(rule.message || `${fieldName} must be no more than ${rule.maxLength} characters`);
        }
      }

      // Pattern validation
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        issues.push(rule.message || `${fieldName} format is invalid`);
      }

      // Custom validation
      if (rule.custom && !rule.custom(value)) {
        issues.push(rule.message || `${fieldName} failed custom validation`);
      }
    });

    return {
      isValid: issues.length === 0,
      issues,
      sanitized: sanitized as any
    };
  }

  /**
   * Sanitize HTML content
   */
  sanitizeHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  /**
   * Validate URL format
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Sanitize string for safe storage
   */
  sanitizeString(str: string): string {
    return str
      .trim()
      .replace(/[<>]/g, '')
      .substring(0, 1000); // Prevent extremely long strings
  }
}

export const dataValidationService = new DataValidationService();
