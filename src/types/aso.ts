export interface ScrapedMetadata {
  name: string;
  url: string;
  appId: string;
  title: string;
  subtitle: string;
  description?: string;
  applicationCategory?: string;
  locale: string;
  icon?: string;
  developer?: string;
  rating?: number;
  reviews?: number;
  price?: string;
  [key: string]: any;
}

export interface CompetitorData {
  id: string;
  name: string;
  title: string;
  subtitle?: string;
  keywords?: string;
  description?: string;
  category: string;
  rating?: number;
  reviews?: number;
}

export interface CompetitorKeywordAnalysis {
  keyword: string;
  frequency: number;
  percentage: number;
  apps: string[];
}

export interface MetadataField {
  title: string;
  subtitle: string;
  keywords: string;
}

export interface MetadataScore {
  overall: number;
  title: number;
  subtitle: number;
  keywords: number;
  breakdown: {
    characterUsage: number;
    keywordDensity: number;
    uniqueness: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  sanitized: ScrapedMetadata;
}

export interface ImportConfig {
  organizationId: string;
  validateData?: boolean;
  includeCaching?: boolean;
  debugMode?: boolean;
}

export interface ExportFormat {
  format: 'json' | 'csv' | 'xlsx';
  includeMetadata?: boolean;
  includeAnalytics?: boolean;
}

// Add CPP-specific extensions to ScrapedMetadata
export interface ScrapedMetadata {
  name: string;
  url: string;
  appId: string;
  title: string;
  subtitle: string;
  description?: string;
  applicationCategory?: string;
  locale: string;
  icon?: string;
  developer?: string;
  rating?: number;
  reviews?: number;
  price?: string;
  
  // CPP Enhancement Fields
  screenshotAnalysis?: ScreenshotAnalysis[];
  suggestedCppThemes?: CppTheme[];
  competitorScreenshots?: CompetitorScreenshot[];
  
  [key: string]: any;
}

// Re-export CPP types for convenience
export type { ScreenshotAnalysis, CppTheme, CompetitorScreenshot, CppStrategyData, CppConfig } from './cpp';
