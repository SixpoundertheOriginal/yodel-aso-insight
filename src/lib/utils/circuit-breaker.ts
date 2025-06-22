
/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by monitoring failure rates
 */
export interface CircuitBreakerConfig {
  maxFailures: number;
  resetTimeMs: number;
  name?: string;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      maxFailures: 3,
      resetTimeMs: 30000,
      name: 'CircuitBreaker',
      ...config
    };
  }

  isOpen(): boolean {
    if (this.failures >= this.config.maxFailures) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure < this.config.resetTimeMs) {
        return true; // Circuit is open
      } else {
        // Reset circuit breaker
        this.reset();
        return false;
      }
    }
    return false;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    console.warn(`🚫 [${this.config.name}] Circuit breaker recorded failure ${this.failures}/${this.config.maxFailures}`);
  }

  recordSuccess(): void {
    this.failures = 0;
    console.log(`✅ [${this.config.name}] Circuit breaker recorded success, reset counter`);
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    console.log(`🔄 [${this.config.name}] Circuit breaker reset`);
  }

  getState(): CircuitBreakerState {
    return {
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      isOpen: this.isOpen()
    };
  }
}
