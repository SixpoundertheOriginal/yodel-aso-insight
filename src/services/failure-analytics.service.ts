
/**
 * Failure Analytics Service
 * Monitors failure patterns and provides intelligent insights
 */

export interface FailureEvent {
  timestamp: number;
  component: string;
  method: string;
  error: string;
  searchTerm: string;
  organizationId: string;
  context: Record<string, any>;
  recoveryMethod?: string;
  recoveryTime?: number;
}

export interface FailurePattern {
  pattern: string;
  frequency: number;
  components: string[];
  commonErrors: string[];
  suggestedFixes: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SystemHealth {
  overallScore: number;
  componentScores: Record<string, number>;
  trends: {
    improving: boolean;
    degrading: boolean;
    stable: boolean;
  };
  recommendations: string[];
}

class FailureAnalyticsService {
  private failures: FailureEvent[] = [];
  private maxFailureHistory = 10000;
  private analysisWindow = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Record a failure event
   */
  recordFailure(event: Omit<FailureEvent, 'timestamp'>): void {
    const failureEvent: FailureEvent = {
      ...event,
      timestamp: Date.now()
    };

    this.failures.push(failureEvent);

    // Trim old failures if needed
    if (this.failures.length > this.maxFailureHistory) {
      this.failures = this.failures.slice(-this.maxFailureHistory);
    }

    console.log(`📊 [FAILURE-ANALYTICS] Recorded failure:`, {
      component: event.component,
      method: event.method,
      error: event.error.substring(0, 100),
      totalFailures: this.failures.length
    });

    // Analyze for immediate patterns
    this.detectImediatePatterns(failureEvent);
  }

  /**
   * Record successful recovery
   */
  recordRecovery(originalFailure: Partial<FailureEvent>, recoveryMethod: string, recoveryTime: number): void {
    // Find the original failure and update it
    const recentFailures = this.failures.filter(f => 
      f.component === originalFailure.component &&
      f.searchTerm === originalFailure.searchTerm &&
      Date.now() - f.timestamp < 60000 // Within last minute
    );

    if (recentFailures.length > 0) {
      const failure = recentFailures[recentFailures.length - 1];
      failure.recoveryMethod = recoveryMethod;
      failure.recoveryTime = recoveryTime;
    }

    console.log(`✅ [FAILURE-ANALYTICS] Recorded recovery via ${recoveryMethod} in ${recoveryTime}ms`);
  }

  /**
   * Analyze failure patterns
   */
  analyzePatterns(): FailurePattern[] {
    const recentFailures = this.getRecentFailures();
    const patterns: Map<string, FailurePattern> = new Map();

    // Group failures by error type and component
    recentFailures.forEach(failure => {
      const patternKey = `${failure.component}:${this.categorizeError(failure.error)}`;
      
      if (!patterns.has(patternKey)) {
        patterns.set(patternKey, {
          pattern: patternKey,
          frequency: 0,
          components: [],
          commonErrors: [],
          suggestedFixes: [],
          riskLevel: 'low'
        });
      }

      const pattern = patterns.get(patternKey)!;
      pattern.frequency++;
      
      if (!pattern.components.includes(failure.component)) {
        pattern.components.push(failure.component);
      }
      
      if (!pattern.commonErrors.includes(failure.error)) {
        pattern.commonErrors.push(failure.error);
      }
    });

    // Calculate risk levels and suggestions
    patterns.forEach(pattern => {
      pattern.riskLevel = this.calculateRiskLevel(pattern);
      pattern.suggestedFixes = this.generateSuggestions(pattern);
    });

    return Array.from(patterns.values())
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Get system health assessment
   */
  getSystemHealth(): SystemHealth {
    const recentFailures = this.getRecentFailures();
    const components = ['edge-function', 'direct-itunes-api', 'transmission', 'cache-service'];
    
    const componentScores: Record<string, number> = {};
    let totalScore = 0;

    components.forEach(component => {
      const componentFailures = recentFailures.filter(f => f.component === component);
      const score = this.calculateComponentHealth(component, componentFailures);
      componentScores[component] = score;
      totalScore += score;
    });

    const overallScore = totalScore / components.length;
    const trends = this.analyzeTrends();

    return {
      overallScore,
      componentScores,
      trends,
      recommendations: this.generateHealthRecommendations(componentScores, trends)
    };
  }

  /**
   * Predict potential failures
   */
  predictFailures(): Array<{ component: string; probability: number; timeframe: string; reason: string }> {
    const recentFailures = this.getRecentFailures();
    const predictions: Array<{ component: string; probability: number; timeframe: string; reason: string }> = [];

    // Analyze failure rate trends
    const hourlyFailures = this.groupFailuresByHour();
    const currentHour = new Date().getHours();
    
    // Check for patterns in failure rates
    Object.entries(hourlyFailures).forEach(([component, hourlyData]) => {
      const recentTrend = hourlyData.slice(-3); // Last 3 hours
      const avgRecent = recentTrend.reduce((sum, count) => sum + count, 0) / 3;
      const historicalAvg = hourlyData.reduce((sum, count) => sum + count, 0) / hourlyData.length;

      if (avgRecent > historicalAvg * 1.5) {
        predictions.push({
          component,
          probability: Math.min(0.8, avgRecent / historicalAvg - 1),
          timeframe: 'next hour',
          reason: 'Increasing failure rate detected'
        });
      }
    });

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats(): { 
    averageRecoveryTime: number; 
    successfulRecoveries: number; 
    recoveryMethods: Record<string, number>;
    fastestRecovery: number;
    slowestRecovery: number;
  } {
    const recoveredFailures = this.failures.filter(f => f.recoveryMethod && f.recoveryTime);
    
    if (recoveredFailures.length === 0) {
      return {
        averageRecoveryTime: 0,
        successfulRecoveries: 0,
        recoveryMethods: {},
        fastestRecovery: 0,
        slowestRecovery: 0
      };
    }

    const recoveryTimes = recoveredFailures.map(f => f.recoveryTime!);
    const recoveryMethods: Record<string, number> = {};

    recoveredFailures.forEach(f => {
      const method = f.recoveryMethod!;
      recoveryMethods[method] = (recoveryMethods[method] || 0) + 1;
    });

    return {
      averageRecoveryTime: recoveryTimes.reduce((sum, time) => sum + time, 0) / recoveryTimes.length,
      successfulRecoveries: recoveredFailures.length,
      recoveryMethods,
      fastestRecovery: Math.min(...recoveryTimes),
      slowestRecovery: Math.max(...recoveryTimes)
    };
  }

  /**
   * Detect immediate failure patterns that need attention
   */
  private detectImediatePatterns(failure: FailureEvent): void {
    const recentSimilar = this.failures.filter(f =>
      f.component === failure.component &&
      f.error === failure.error &&
      Date.now() - f.timestamp < 300000 // Last 5 minutes
    );

    // Alert if same error occurs 3+ times in 5 minutes
    if (recentSimilar.length >= 3) {
      console.warn(`🚨 [FAILURE-ANALYTICS] ALERT: Repeated failure pattern detected:`, {
        component: failure.component,
        error: failure.error.substring(0, 100),
        occurrences: recentSimilar.length,
        timeframe: '5 minutes'
      });
    }
  }

  /**
   * Get recent failures within analysis window
   */
  private getRecentFailures(): FailureEvent[] {
    const cutoff = Date.now() - this.analysisWindow;
    return this.failures.filter(f => f.timestamp >= cutoff);
  }

  /**
   * Categorize error into groups
   */
  private categorizeError(error: string): string {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('network') || errorLower.includes('connection')) return 'network';
    if (errorLower.includes('timeout')) return 'timeout';
    if (errorLower.includes('rate limit')) return 'rate-limit';
    if (errorLower.includes('transmission') || errorLower.includes('empty body')) return 'transmission';
    if (errorLower.includes('validation') || errorLower.includes('invalid')) return 'validation';
    if (errorLower.includes('auth')) return 'authentication';
    if (errorLower.includes('not found')) return 'not-found';
    
    return 'unknown';
  }

  /**
   * Calculate risk level for pattern
   */
  private calculateRiskLevel(pattern: FailurePattern): 'low' | 'medium' | 'high' | 'critical' {
    if (pattern.frequency >= 50) return 'critical';
    if (pattern.frequency >= 20) return 'high';
    if (pattern.frequency >= 10) return 'medium';
    return 'low';
  }

  /**
   * Generate suggestions for failure pattern
   */
  private generateSuggestions(pattern: FailurePattern): string[] {
    const suggestions: string[] = [];
    
    if (pattern.pattern.includes('transmission')) {
      suggestions.push('Implement additional transmission fallback methods');
      suggestions.push('Add request body validation before transmission');
    }
    
    if (pattern.pattern.includes('network')) {
      suggestions.push('Increase retry attempts with exponential backoff');
      suggestions.push('Implement connection pooling');
    }
    
    if (pattern.pattern.includes('rate-limit')) {
      suggestions.push('Implement intelligent rate limiting');
      suggestions.push('Add request queuing mechanism');
    }
    
    if (pattern.frequency > 10) {
      suggestions.push('Consider circuit breaker implementation');
      suggestions.push('Add monitoring alerts for this pattern');
    }
    
    return suggestions;
  }

  /**
   * Calculate component health score (0-1)
   */
  private calculateComponentHealth(component: string, failures: FailureEvent[]): number {
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    
    const recentFailures = failures.filter(f => f.timestamp >= hourAgo);
    const totalOperations = recentFailures.length + 100; // Assume some successful operations
    
    return Math.max(0, 1 - (recentFailures.length / totalOperations));
  }

  /**
   * Analyze system trends
   */
  private analyzeTrends(): { improving: boolean; degrading: boolean; stable: boolean } {
    const now = Date.now();
    const recentFailures = this.failures.filter(f => now - f.timestamp < 60 * 60 * 1000); // Last hour
    const olderFailures = this.failures.filter(f => {
      const age = now - f.timestamp;
      return age >= 60 * 60 * 1000 && age < 120 * 60 * 1000; // 1-2 hours ago
    });

    const recentRate = recentFailures.length;
    const olderRate = olderFailures.length;

    const improving = recentRate < olderRate * 0.8;
    const degrading = recentRate > olderRate * 1.2;
    const stable = !improving && !degrading;

    return { improving, degrading, stable };
  }

  /**
   * Group failures by hour for trend analysis
   */
  private groupFailuresByHour(): Record<string, number[]> {
    const grouped: Record<string, number[]> = {};
    const hourBuckets = 24; // Last 24 hours
    
    this.getRecentFailures().forEach(failure => {
      const component = failure.component;
      if (!grouped[component]) {
        grouped[component] = new Array(hourBuckets).fill(0);
      }
      
      const hoursAgo = Math.floor((Date.now() - failure.timestamp) / (60 * 60 * 1000));
      if (hoursAgo < hourBuckets) {
        grouped[component][hourBuckets - 1 - hoursAgo]++;
      }
    });
    
    return grouped;
  }

  /**
   * Generate health recommendations
   */
  private generateHealthRecommendations(componentScores: Record<string, number>, trends: any): string[] {
    const recommendations: string[] = [];
    
    Object.entries(componentScores).forEach(([component, score]) => {
      if (score < 0.7) {
        recommendations.push(`Investigate ${component} - health score below 70%`);
      }
    });
    
    if (trends.degrading) {
      recommendations.push('System performance is degrading - consider scaling up resources');
    }
    
    if (trends.improving) {
      recommendations.push('System performance is improving - monitor for stability');
    }
    
    return recommendations;
  }
}

export const failureAnalyticsService = new FailureAnalyticsService();
