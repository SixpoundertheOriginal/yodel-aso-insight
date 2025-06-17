
/**
 * Request Correlation Tracking Service
 * Provides correlation IDs for request tracing
 */

export interface CorrelationContext {
  id: string;
  timestamp: number;
  route: string;
  organizationId?: string;
}

class CorrelationTrackerService {
  private currentContext: CorrelationContext | null = null;

  /**
   * Generate new correlation context
   */
  createContext(route: string, organizationId?: string): CorrelationContext {
    const context: CorrelationContext = {
      id: this.generateCorrelationId(),
      timestamp: Date.now(),
      route,
      organizationId
    };

    this.currentContext = context;
    return context;
  }

  /**
   * Get current correlation context
   */
  getContext(): CorrelationContext | null {
    return this.currentContext;
  }

  /**
   * Log with correlation context
   */
  log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const context = this.currentContext;
    const logEntry = {
      level,
      message,
      correlationId: context?.id || 'unknown',
      timestamp: new Date().toISOString(),
      route: context?.route,
      organizationId: context?.organizationId,
      data
    };

    console.log(`[${level.toUpperCase()}][${logEntry.correlationId}] ${message}`, logEntry);
  }

  private generateCorrelationId(): string {
    return `aso-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const correlationTracker = new CorrelationTrackerService();
