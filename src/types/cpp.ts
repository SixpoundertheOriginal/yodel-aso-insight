
export interface ScreenshotAnalysis {
  url: string;
  index: number;
  analysis: {
    features: string[];
    userFlow: string;
    valueProposition: string;
    visualTheme: string;
    uiElements: string[];
    mood: string;
  };
}

export interface CppTheme {
  id: string;
  name: string;
  tagline: string;
  targetAudience: string;
  valueHook: string;
  searchTerms: string[];
  visualStyle: {
    mood: string;
    colors: string[];
    focusFeatures: string[];
  };
  deepLinkStrategy?: string;
}

export interface CompetitorScreenshot {
  appName: string;
  url: string;
  analysis: string;
}

export interface CppStrategyData {
  originalApp: {
    name: string;
    screenshots: ScreenshotAnalysis[];
  };
  suggestedThemes: CppTheme[];
  competitorInsights?: CompetitorScreenshot[];
  recommendations: {
    primaryTheme: string;
    alternativeThemes: string[];
    keyDifferentiators: string[];
  };
}

export interface CppConfig {
  organizationId: string;
  includeScreenshotAnalysis?: boolean;
  generateThemes?: boolean;
  includeCompetitorAnalysis?: boolean;
  debugMode?: boolean;
}
