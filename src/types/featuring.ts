
export interface FeaturingContent {
  editorialDescription: string;
  helpfulInfo: string;
}

export interface FeaturingValidationResult {
  editorial: {
    charCount: number;
    isValid: boolean;
    foundPhrases: string[];
  };
  helpfulInfo: {
    charCount: number;
    isValid: boolean;
  };
  isReadyForSubmission: boolean;
}

export const APPLE_ALIGNED_PHRASES = [
  '1:1 feedback',
  'Learning Pathways',
  'personalized experience',
  'community building',
  'creative tools',
  'health and wellness',
  'accessibility features',
  'privacy-focused',
  'family-friendly',
  'indie developer',
];

export const EDITORIAL_CHAR_LIMIT = 1000;
export const HELPFUL_INFO_CHAR_LIMIT = 500;
