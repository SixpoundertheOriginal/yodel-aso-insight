
/**
 * User Experience Shield Service
 * Provides seamless UX layer that hides technical failures from users
 */

export interface LoadingState {
  isLoading: boolean;
  stage: 'initial' | 'searching' | 'fallback' | 'cache' | 'complete' | 'error';
  message: string;
  progress: number;
  showRetry: boolean;
}

export interface UserFriendlyError {
  title: string;
  message: string;
  suggestions: string[];
  severity: 'info' | 'warning' | 'error';
  canRetry: boolean;
  autoRetryIn?: number;
}

export interface SearchFeedback {
  searchTerm: string;
  resultSource: 'primary' | 'fallback' | 'cache' | 'similar';
  responseTime: number;
  userVisible: boolean;
  backgroundRetries: number;
}

class UserExperienceShieldService {
  private currentLoadingState: LoadingState = {
    isLoading: false,
    stage: 'initial',
    message: '',
    progress: 0,
    showRetry: false
  };

  private loadingMessages = {
    initial: 'Initializing search...',
    searching: 'Searching app stores...',
    fallback: 'Finding the best results...',
    cache: 'Retrieving cached data...',
    complete: 'Search completed!',
    error: 'Search encountered an issue'
  };

  private stageProgress = {
    initial: 10,
    searching: 40,
    fallback: 70,
    cache: 85,
    complete: 100,
    error: 0
  };

  /**
   * Start loading state with progressive updates
   */
  startLoading(searchTerm: string): LoadingState {
    console.log(`🛡️ [UX-SHIELD] Starting search shield for "${searchTerm}"`);
    
    this.currentLoadingState = {
      isLoading: true,
      stage: 'initial',
      message: this.loadingMessages.initial,
      progress: this.stageProgress.initial,
      showRetry: false
    };

    return { ...this.currentLoadingState };
  }

  /**
   * Update loading stage with smooth transitions
   */
  updateStage(stage: LoadingState['stage']): LoadingState {
    console.log(`🛡️ [UX-SHIELD] Transitioning to stage: ${stage}`);
    
    this.currentLoadingState.stage = stage;
    this.currentLoadingState.message = this.loadingMessages[stage];
    this.currentLoadingState.progress = this.stageProgress[stage];

    // Add slight delay for smooth UX (users perceive quality from slight delays)
    if (stage === 'fallback' || stage === 'cache') {
      setTimeout(() => {
        // Simulate processing time for better UX
      }, 300);
    }

    return { ...this.currentLoadingState };
  }

  /**
   * Complete loading successfully
   */
  completeLoading(feedback: SearchFeedback): LoadingState {
    console.log(`🛡️ [UX-SHIELD] Search completed successfully`, feedback);
    
    this.currentLoadingState = {
      isLoading: false,
      stage: 'complete',
      message: this.getSuccessMessage(feedback),
      progress: 100,
      showRetry: false
    };

    return { ...this.currentLoadingState };
  }

  /**
   * Handle error with user-friendly messaging
   */
  handleError(error: Error, context: { searchTerm: string; attempts: number }): UserFriendlyError {
    console.log(`🛡️ [UX-SHIELD] Processing error for user:`, { error: error.message, context });
    
    const userError = this.translateError(error, context);
    
    this.currentLoadingState = {
      isLoading: false,
      stage: 'error',
      message: userError.message,
      progress: 0,
      showRetry: userError.canRetry
    };

    return userError;
  }

  /**
   * Translate technical errors to user-friendly messages
   */
  private translateError(error: Error, context: { searchTerm: string; attempts: number }): UserFriendlyError {
    const errorMessage = error.message.toLowerCase();
    const { searchTerm, attempts } = context;

    // No results found
    if (errorMessage.includes('no apps found') || errorMessage.includes('no results')) {
      return {
        title: 'No Results Found',
        message: `We couldn't find any apps matching "${searchTerm}".`,
        suggestions: [
          'Try different keywords or app names',
          'Check spelling and try again',
          'Use more specific search terms',
          'Search for the developer name instead'
        ],
        severity: 'info',
        canRetry: true
      };
    }

    // Rate limiting
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      return {
        title: 'Search Limit Reached',
        message: 'You\'ve made many searches recently. Please wait a moment.',
        suggestions: [
          'Wait a few minutes before searching again',
          'Try searching for multiple apps at once',
          'Contact support for higher limits'
        ],
        severity: 'warning',
        canRetry: true,
        autoRetryIn: 60000 // 1 minute
      };
    }

    // Network/connectivity issues
    if (errorMessage.includes('network') || errorMessage.includes('connection') || 
        errorMessage.includes('timeout') || errorMessage.includes('unavailable')) {
      return {
        title: 'Connection Issue',
        message: 'Having trouble connecting to app store data.',
        suggestions: [
          'Check your internet connection',
          'Try again in a few moments',
          'The issue usually resolves automatically'
        ],
        severity: 'warning',
        canRetry: true,
        autoRetryIn: 5000 // 5 seconds
      };
    }

    // Validation errors
    if (errorMessage.includes('invalid') || errorMessage.includes('validation')) {
      return {
        title: 'Invalid Search',
        message: 'The search terms need to be adjusted.',
        suggestions: [
          'Enter valid app names or keywords',
          'For URLs, use complete App Store links',
          'Avoid special characters or very short terms'
        ],
        severity: 'info',
        canRetry: true
      };
    }

    // Authentication issues
    if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
      return {
        title: 'Authentication Required',
        message: 'Please log in to continue searching.',
        suggestions: [
          'Log in to your account',
          'Refresh the page if already logged in',
          'Contact support if issues persist'
        ],
        severity: 'warning',
        canRetry: false
      };
    }

    // Service unavailable
    if (errorMessage.includes('service') || errorMessage.includes('server')) {
      return {
        title: 'Service Temporarily Unavailable',
        message: 'Our search service is experiencing high demand.',
        suggestions: [
          'Try again in a few minutes',
          'The service typically recovers quickly',
          'Contact support if this persists'
        ],
        severity: 'warning',
        canRetry: true,
        autoRetryIn: 30000 // 30 seconds
      };
    }

    // Generic fallback
    return {
      title: 'Search Encountered an Issue',
      message: attempts > 1 ? 
        'We tried multiple approaches but couldn\'t complete your search.' :
        'Something went wrong with your search.',
      suggestions: [
        'Try different search terms',
        'Check your internet connection',
        'Contact support if this continues',
        attempts === 1 ? 'We\'ll try alternative methods automatically' : 'Multiple methods were attempted'
      ],
      severity: 'error',
      canRetry: true
    };
  }

  /**
   * Generate success message based on result source
   */
  private getSuccessMessage(feedback: SearchFeedback): string {
    const { resultSource, responseTime, backgroundRetries } = feedback;
    
    if (responseTime < 2000) {
      return 'Found your app quickly!';
    }

    switch (resultSource) {
      case 'primary':
        return 'Successfully found app data!';
      case 'fallback':
        return backgroundRetries > 0 ? 
          'Found your app using enhanced search!' : 
          'Successfully retrieved app information!';
      case 'cache':
        return 'Retrieved recent search results!';
      case 'similar':
        return 'Found similar app that might match!';
      default:
        return 'Search completed successfully!';
    }
  }

  /**
   * Get current loading state
   */
  getCurrentState(): LoadingState {
    return { ...this.currentLoadingState };
  }

  /**
   * Check if should show loading to user
   */
  shouldShowLoading(elapsedTime: number): boolean {
    // Don't show loading for very quick operations
    if (elapsedTime < 500) return false;
    
    // Always show loading for longer operations
    if (elapsedTime > 2000) return true;
    
    // Show loading based on current stage
    return this.currentLoadingState.stage !== 'initial';
  }

  /**
   * Generate helpful search suggestions
   */
  generateSearchSuggestions(failedTerm: string): string[] {
    const suggestions = [];
    
    // If term is very short
    if (failedTerm.length < 3) {
      suggestions.push('Try using longer, more specific terms');
    }
    
    // If term contains special characters
    if (/[^a-zA-Z0-9\s-]/.test(failedTerm)) {
      suggestions.push('Remove special characters and try again');
    }
    
    // If term is very long
    if (failedTerm.length > 50) {
      suggestions.push('Try shorter, more focused search terms');
    }
    
    // Generic helpful suggestions
    suggestions.push(
      'Search for the exact app name',
      'Try the developer or company name',
      'Use category keywords like "fitness" or "games"',
      'Check spelling and try again'
    );
    
    return suggestions.slice(0, 4); // Return top 4 suggestions
  }

  /**
   * Reset shield state
   */
  reset(): void {
    this.currentLoadingState = {
      isLoading: false,
      stage: 'initial',
      message: '',
      progress: 0,
      showRetry: false
    };
  }
}

export const userExperienceShieldService = new UserExperienceShieldService();
