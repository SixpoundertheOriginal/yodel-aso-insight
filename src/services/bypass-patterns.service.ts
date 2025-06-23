
/**
 * Enhanced Bypass Patterns Service
 * Routes problematic searches directly to iTunes API to avoid edge function failures
 */

interface BypassAnalysis {
  shouldBypass: boolean;
  confidence: number;
  reason: string;
  pattern: string;
}

class BypassPatternsService {
  // Expanded patterns for direct iTunes API bypass
  private patterns = [
    // Specific app names that consistently fail
    { 
      pattern: /^(cutvibe|phoyo|cutvibes?|video\s*eraser|object\s*eraser)$/i, 
      reason: 'known-failing-app-name',
      confidence: 0.95 
    },
    
    // Short specific terms (likely app names)
    { 
      pattern: /^[a-zA-Z]{3,8}$/, 
      reason: 'short-specific-term',
      confidence: 0.8 
    },
    
    // CamelCase patterns (app naming convention)
    { 
      pattern: /^[A-Z][a-z]+[A-Z][a-zA-Z]*$/, 
      reason: 'camelcase-app-name',
      confidence: 0.85 
    },
    
    // App Store URLs
    { 
      pattern: /apps\.apple\.com|itunes\.apple\.com/i, 
      reason: 'app-store-url',
      confidence: 0.99 
    },
    
    // Brand names with numbers/special chars
    { 
      pattern: /^[a-zA-Z]+\d+[a-zA-Z]*$|^[a-zA-Z]+[_-][a-zA-Z]+$/i, 
      reason: 'branded-app-name',
      confidence: 0.9 
    },
    
    // Specific app name patterns with descriptors
    { 
      pattern: /^[a-zA-Z]+:\s*[a-zA-Z\s]+$/i, 
      reason: 'app-with-descriptor',
      confidence: 0.9 
    },
    
    // Common failing patterns detected from logs
    { 
      pattern: /^(fight|photo\s*editor|video\s*edit|camera\s*app)$/i, 
      reason: 'historically-failing-term',
      confidence: 0.85 
    }
  ];

  analyzeForBypass(input: string): BypassAnalysis {
    const trimmedInput = input.trim();
    
    // Check against all patterns
    for (const { pattern, reason, confidence } of this.patterns) {
      if (pattern.test(trimmedInput)) {
        return {
          shouldBypass: true,
          confidence,
          reason,
          pattern: pattern.toString()
        };
      }
    }

    // Additional heuristics for bypass decision
    const heuristicAnalysis = this.analyzeHeuristics(trimmedInput);
    if (heuristicAnalysis.shouldBypass) {
      return heuristicAnalysis;
    }

    return {
      shouldBypass: false,
      confidence: 0,
      reason: 'no-bypass-needed',
      pattern: 'none'
    };
  }

  private analyzeHeuristics(input: string): BypassAnalysis {
    // Length-based bypass for very specific terms
    if (input.length <= 6 && input.length >= 3 && !/\s/.test(input)) {
      return {
        shouldBypass: true,
        confidence: 0.75,
        reason: 'short-specific-term-heuristic',
        pattern: 'length-based'
      };
    }

    // Mixed case without spaces (likely app names)
    if (/^[a-zA-Z]+$/.test(input) && /[A-Z]/.test(input) && /[a-z]/.test(input) && input.length <= 12) {
      return {
        shouldBypass: true,
        confidence: 0.8,
        reason: 'mixed-case-app-name',
        pattern: 'case-pattern'
      };
    }

    // Terms that look like proper nouns
    if (/^[A-Z][a-z]+$/.test(input) && input.length <= 10) {
      return {
        shouldBypass: true,
        confidence: 0.7,
        reason: 'proper-noun-pattern',
        pattern: 'proper-noun'
      };
    }

    return {
      shouldBypass: false,
      confidence: 0,
      reason: 'heuristics-passed',
      pattern: 'none'
    };
  }

  // Method to add dynamic patterns based on failures
  addFailurePattern(searchTerm: string, reason: string) {
    console.log(`🔄 [BYPASS-PATTERNS] Adding failure pattern: ${searchTerm} (${reason})`);
    // This could be extended to dynamically learn from failures
  }
}

export const bypassPatternsService = new BypassPatternsService();
