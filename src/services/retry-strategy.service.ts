
/**
 * Enhanced Retry Strategy Service
 * Implements exponential backoff with jitter and method-specific strategies
 */

import { AmbiguousSearchError } from '@/types/search-errors';

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
  retryableErrors: string[];
}

export interface RetryContext {
  attempt: number;
  totalElapsed: number;
  lastError?: Error;
  method: string;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
  recoveredVia?: string;
}

class RetryStrategyService {
  private defaultConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterEnabled: true,
    retryableErrors: ['network', 'timeout', 'rate_limit', 'service_unavailable', 'transmission']
  };

  private methodConfigs: Record<string, Partial<RetryConfig>> = {
    'edge-function': {
      maxAttempts: 2,
      baseDelayMs: 500,
      maxDelayMs: 5000,
      retryableErrors: ['transmission', 'timeout', 'service_error']
    },
    'direct-api': {
      maxAttempts: 3,
      baseDelayMs: 2000,
      maxDelayMs: 15000,
      retryableErrors: ['rate_limit', 'network', 'timeout']
    },
    'cache-fallback': {
      maxAttempts: 1,
      baseDelayMs: 100,
      maxDelayMs: 1000,
      retryableErrors: []
    }
  };

  /**
   * Execute operation with intelligent retry strategy
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    method: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const config = this.getConfigForMethod(method, customConfig);
    const startTime = Date.now();
    let lastError: Error | undefined;

    console.log(`🔄 [RETRY-STRATEGY] Starting ${method} with config:`, config);

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      const context: RetryContext = {
        attempt,
        totalElapsed: Date.now() - startTime,
        lastError,
        method
      };

      try {
        console.log(`🎯 [RETRY-STRATEGY] Attempt ${attempt}/${config.maxAttempts} for ${method}`);
        
        const result = await operation();
        const totalTime = Date.now() - startTime;
        
        console.log(`✅ [RETRY-STRATEGY] ${method} succeeded on attempt ${attempt} (${totalTime}ms)`);
        
        return {
          success: true,
          data: result,
          attempts: attempt,
          totalTime
        };

      } catch (error: any) {
        lastError = error;
        
        // FIXED: Don't retry AmbiguousSearchError - it's a success condition
        if (error instanceof AmbiguousSearchError) {
          console.log(`🎯 [RETRY-STRATEGY] ${method} found multiple candidates - not retrying`);
          throw error;
        }
        
        const shouldRetry = this.shouldRetry(error, attempt, config, context);
        
        console.log(`❌ [RETRY-STRATEGY] ${method} failed attempt ${attempt}:`, {
          error: error.message,
          shouldRetry,
          retriesLeft: config.maxAttempts - attempt
        });

        if (!shouldRetry || attempt === config.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, config);
        console.log(`⏳ [RETRY-STRATEGY] Waiting ${delay}ms before retry ${attempt + 1}`);
        
        await this.sleep(delay);
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`💥 [RETRY-STRATEGY] ${method} failed after ${config.maxAttempts} attempts (${totalTime}ms)`);

    return {
      success: false,
      error: lastError || new Error(`${method} failed after ${config.maxAttempts} attempts`),
      attempts: config.maxAttempts,
      totalTime
    };
  }

  /**
   * Determine if error is retryable
   * FIXED: Never retry AmbiguousSearchError
   */
  private shouldRetry(error: Error, attempt: number, config: RetryConfig, context: RetryContext): boolean {
    if (attempt >= config.maxAttempts) {
      return false;
    }

    // FIXED: AmbiguousSearchError should never be retried
    if (error instanceof AmbiguousSearchError) {
      return false;
    }

    const errorMessage = error.message.toLowerCase();
    const isRetryableError = config.retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError.toLowerCase())
    );

    // Special cases for different error types
    if (errorMessage.includes('rate limit')) {
      return attempt <= 2; // Limited retries for rate limiting
    }

    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return true; // Always retry network issues
    }

    if (errorMessage.includes('transmission') || errorMessage.includes('empty body')) {
      return attempt === 1; // Only one retry for transmission issues
    }

    return isRetryableError;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
    
    if (!config.jitterEnabled) {
      return cappedDelay;
    }

    // Add jitter (±25% of the delay)
    const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.max(100, cappedDelay + jitter);
  }

  private getConfigForMethod(method: string, customConfig?: Partial<RetryConfig>): RetryConfig {
    const methodConfig = this.methodConfigs[method] || {};
    return {
      ...this.defaultConfig,
      ...methodConfig,
      ...customConfig
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getRetryStats() {
    return {
      supportedMethods: Object.keys(this.methodConfigs),
      defaultConfig: this.defaultConfig,
      timestamp: new Date().toISOString()
    };
  }
}

export const retryStrategyService = new RetryStrategyService();
