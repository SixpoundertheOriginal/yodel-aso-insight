
/**
 * Multi-Level Circuit Breaker Service
 * Implements cascading circuit breakers for different components
 */

export interface CircuitBreakerState {
  isOpen: boolean;
  failures: number;
  lastFailureTime: number;
  successCount: number;
  lastSuccessTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeMs: number;
  successThreshold: number;
  monitoringWindowMs: number;
}

export interface ComponentHealth {
  component: string;
  isHealthy: boolean;
  state: CircuitBreakerState;
  lastCheck: number;
  errorRate: number;
}

class MultiLevelCircuitBreakerService {
  private breakers = new Map<string, CircuitBreakerState>();
  private configs = new Map<string, CircuitBreakerConfig>();

  private defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeMs: 60000,
    successThreshold: 3,
    monitoringWindowMs: 300000 // 5 minutes
  };

  constructor() {
    this.initializeBreakers();
  }

  /**
   * Initialize circuit breakers for different components
   */
  private initializeBreakers() {
    const components = [
      { name: 'edge-function', config: { failureThreshold: 3, recoveryTimeMs: 30000 } },
      { name: 'transmission-json', config: { failureThreshold: 5, recoveryTimeMs: 15000 } },
      { name: 'transmission-url-params', config: { failureThreshold: 3, recoveryTimeMs: 10000 } },
      { name: 'transmission-form-data', config: { failureThreshold: 3, recoveryTimeMs: 10000 } },
      { name: 'direct-itunes-api', config: { failureThreshold: 8, recoveryTimeMs: 120000 } },
      { name: 'cache-service', config: { failureThreshold: 2, recoveryTimeMs: 5000 } }
    ];

    components.forEach(({ name, config }) => {
      this.breakers.set(name, {
        isOpen: false,
        failures: 0,
        lastFailureTime: 0,
        successCount: 0,
        lastSuccessTime: Date.now(),
        state: 'CLOSED'
      });

      this.configs.set(name, { ...this.defaultConfig, ...config });
    });

    console.log('🔧 [CIRCUIT-BREAKER] Initialized breakers for components:', Array.from(this.breakers.keys()));
  }

  /**
   * Check if component is available (not circuit broken)
   */
  isAvailable(component: string): boolean {
    const breaker = this.breakers.get(component);
    if (!breaker) {
      console.warn(`⚠️ [CIRCUIT-BREAKER] Unknown component: ${component}`);
      return true; // Default to available for unknown components
    }

    // Check if circuit breaker should transition from OPEN to HALF_OPEN
    if (breaker.state === 'OPEN') {
      const config = this.configs.get(component)!;
      const timeSinceLastFailure = Date.now() - breaker.lastFailureTime;
      
      if (timeSinceLastFailure >= config.recoveryTimeMs) {
        breaker.state = 'HALF_OPEN';
        breaker.successCount = 0;
        console.log(`🔄 [CIRCUIT-BREAKER] ${component} transitioning to HALF_OPEN for testing`);
      }
    }

    const isAvailable = breaker.state !== 'OPEN';
    
    if (!isAvailable) {
      console.log(`🚫 [CIRCUIT-BREAKER] ${component} is circuit broken (${breaker.state})`);
    }

    return isAvailable;
  }

  /**
   * Record successful operation
   */
  recordSuccess(component: string): void {
    const breaker = this.breakers.get(component);
    if (!breaker) return;

    const config = this.configs.get(component)!;
    
    breaker.successCount++;
    breaker.lastSuccessTime = Date.now();

    if (breaker.state === 'HALF_OPEN' && breaker.successCount >= config.successThreshold) {
      breaker.state = 'CLOSED';
      breaker.failures = 0;
      console.log(`✅ [CIRCUIT-BREAKER] ${component} recovered - circuit CLOSED`);
    }

    // Reset failure count on successful operation in CLOSED state
    if (breaker.state === 'CLOSED') {
      breaker.failures = Math.max(0, breaker.failures - 1);
    }
  }

  /**
   * Record failed operation
   */
  recordFailure(component: string, error?: Error): void {
    const breaker = this.breakers.get(component);
    if (!breaker) return;

    const config = this.configs.get(component)!;
    
    breaker.failures++;
    breaker.lastFailureTime = Date.now();
    breaker.successCount = 0;

    console.log(`❌ [CIRCUIT-BREAKER] ${component} failure recorded (${breaker.failures}/${config.failureThreshold})`, 
      error?.message ? { error: error.message } : {});

    // Transition to OPEN if failure threshold exceeded
    if (breaker.failures >= config.failureThreshold && breaker.state !== 'OPEN') {
      breaker.state = 'OPEN';
      breaker.isOpen = true;
      console.log(`🚫 [CIRCUIT-BREAKER] ${component} circuit OPENED due to ${breaker.failures} failures`);
    }
  }

  /**
   * Get health status of all components
   */
  getHealthStatus(): ComponentHealth[] {
    const now = Date.now();
    return Array.from(this.breakers.entries()).map(([component, breaker]) => {
      const config = this.configs.get(component)!;
      const timeSinceLastFailure = now - breaker.lastFailureTime;
      const errorRate = this.calculateErrorRate(component);

      return {
        component,
        isHealthy: breaker.state === 'CLOSED',
        state: breaker,
        lastCheck: now,
        errorRate
      };
    });
  }

  /**
   * Calculate error rate for component
   */
  private calculateErrorRate(component: string): number {
    const breaker = this.breakers.get(component);
    if (!breaker) return 0;

    const config = this.configs.get(component)!;
    const timeSinceLastSuccess = Date.now() - breaker.lastSuccessTime;
    
    if (timeSinceLastSuccess > config.monitoringWindowMs) {
      return 1.0; // 100% error rate if no success in monitoring window
    }

    // Simple error rate calculation
    const totalOperations = breaker.failures + breaker.successCount;
    return totalOperations > 0 ? breaker.failures / totalOperations : 0;
  }

  /**
   * Get next available component from priority list
   */
  getNextAvailableComponent(components: string[]): string | null {
    for (const component of components) {
      if (this.isAvailable(component)) {
        return component;
      }
    }
    return null;
  }

  /**
   * Reset circuit breaker for component (manual recovery)
   */
  reset(component: string): boolean {
    const breaker = this.breakers.get(component);
    if (!breaker) return false;

    breaker.state = 'CLOSED';
    breaker.isOpen = false;
    breaker.failures = 0;
    breaker.successCount = 0;
    breaker.lastSuccessTime = Date.now();
    
    console.log(`🔄 [CIRCUIT-BREAKER] ${component} manually reset`);
    return true;
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const health = this.getHealthStatus();
    const healthy = health.filter(h => h.isHealthy).length;
    const total = health.length;

    return {
      overallHealth: healthy / total,
      healthyComponents: healthy,
      totalComponents: total,
      componentDetails: health,
      timestamp: new Date().toISOString()
    };
  }
}

export const multiLevelCircuitBreakerService = new MultiLevelCircuitBreakerService();
