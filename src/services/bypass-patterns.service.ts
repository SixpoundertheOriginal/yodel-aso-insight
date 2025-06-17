
/**
 * Emergency Bypass Patterns Service
 * Identifies safe inputs that can bypass complex validation
 */

export interface BypassResult {
  shouldBypass: boolean;
  confidence: number;
  pattern: 'safe-keyword' | 'app-name' | 'simple-phrase' | 'unknown';
  reason: string;
}

class BypassPatternsService {
  private safeKeywords = new Set([
    'fitness', 'meditation', 'learning', 'education', 'music', 'photo', 'video',
    'health', 'workout', 'yoga', 'diet', 'recipe', 'cooking', 'finance', 'banking',
    'productivity', 'notes', 'calendar', 'weather', 'news', 'social', 'messaging',
    'shopping', 'travel', 'games', 'puzzle', 'entertainment', 'streaming',
    // ASO Search Terms
    'language', 'training', 'course', 'lesson', 'study', 'practice', 'fluent', 
    'speak', 'learn', 'business', 'food'
  ]);

  private knownAppNames = new Set([
    'instagram', 'tiktok', 'facebook', 'twitter', 'youtube', 'spotify', 'netflix',
    'duolingo', 'headspace', 'calm', 'whatsapp', 'telegram', 'discord', 'slack',
    'zoom', 'teams', 'gmail', 'outlook', 'dropbox', 'onedrive', 'uber', 'lyft',
    // Language Learning Apps (Critical for ASO)
    'pimsleur', 'babbel', 'rosetta stone', 'busuu', 'memrise', 'lingoda', 
    'italki', 'hellotalk', 'tandem'
  ]);

  private simplePatterns = [
    /^[a-zA-Z\s]{3,30}$/,  // Simple words/phrases
    /^\w+\s+(app|game)$/i, // "word app" or "word game"
    /^(best|top|free)\s+\w+$/i // "best fitness", "top games"
  ];

  /**
   * Determines if input can safely bypass complex validation
   */
  analyzeForBypass(input: string): BypassResult {
    const cleanInput = input.trim().toLowerCase();
    
    // Single safe keyword
    if (this.safeKeywords.has(cleanInput)) {
      return {
        shouldBypass: true,
        confidence: 0.95,
        pattern: 'safe-keyword',
        reason: `Known safe keyword: ${cleanInput}`
      };
    }

    // Known app name
    if (this.knownAppNames.has(cleanInput)) {
      return {
        shouldBypass: true,
        confidence: 0.9,
        pattern: 'app-name',
        reason: `Known app name: ${cleanInput}`
      };
    }

    // Check for keyword containment (e.g., "pimsleur french" contains "pimsleur")
    for (const appName of this.knownAppNames) {
      if (cleanInput.includes(appName)) {
        return {
          shouldBypass: true,
          confidence: 0.85,
          pattern: 'app-name',
          reason: `Contains known app name: ${appName}`
        };
      }
    }

    // Check for safe keyword containment
    for (const keyword of this.safeKeywords) {
      if (cleanInput.includes(keyword)) {
        return {
          shouldBypass: true,
          confidence: 0.8,
          pattern: 'safe-keyword',
          reason: `Contains safe keyword: ${keyword}`
        };
      }
    }

    // Simple phrase pattern
    for (const pattern of this.simplePatterns) {
      if (pattern.test(cleanInput)) {
        return {
          shouldBypass: true,
          confidence: 0.8,
          pattern: 'simple-phrase',
          reason: `Matches simple phrase pattern`
        };
      }
    }

    // Check for obviously unsafe patterns
    if (this.containsSuspiciousContent(cleanInput)) {
      return {
        shouldBypass: false,
        confidence: 0.95,
        pattern: 'unknown',
        reason: 'Contains suspicious content'
      };
    }

    // Default: use complex validation for unknown inputs
    return {
      shouldBypass: false,
      confidence: 0.7,
      pattern: 'unknown',
      reason: 'Unknown pattern, using full validation'
    };
  }

  private containsSuspiciousContent(input: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:text\/html/i,
      /\.\./,
      /[<>'"]/
    ];

    return suspiciousPatterns.some(pattern => pattern.test(input));
  }
}

export const bypassPatternsService = new BypassPatternsService();
