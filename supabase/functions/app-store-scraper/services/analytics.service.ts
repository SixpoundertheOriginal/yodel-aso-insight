
export interface AnalyticsEvent {
  eventName: string;
  properties: Record<string, any>;
}

export class AnalyticsService {
  constructor(private supabase: any) {}

  async logEvent(eventName: string, properties: Record<string, any>): Promise<void> {
    try {
      const { organizationId, requestId, ...otherProperties } = properties;

      // Log to audit_logs table
      await this.supabase
        .from('audit_logs')
        .insert({
          organization_id: organizationId || null,
          action: eventName,
          resource_type: 'app_store_scraper',
          resource_id: requestId || null,
          details: {
            ...otherProperties,
            timestamp: new Date().toISOString(),
            service: 'app-store-scraper',
            version: '4.0.0-enterprise-microservices'
          },
          ip_address: properties.ipAddress || null,
          user_agent: properties.userAgent || null
        });

      // Log performance metrics for monitoring
      if (eventName === 'request_completed') {
        await this.logPerformanceMetrics({
          organizationId,
          processingTime: properties.processingTime,
          competitorsAnalyzed: properties.competitorsAnalyzed,
          screenshotsAnalyzed: properties.screenshotsAnalyzed
        });
      }

    } catch (error) {
      console.warn('Analytics logging failed:', error);
      // Don't throw - analytics failures shouldn't break the main flow
    }
  }

  private async logPerformanceMetrics(metrics: {
    organizationId?: string;
    processingTime?: number;
    competitorsAnalyzed?: number;
    screenshotsAnalyzed?: number;
  }): Promise<void> {
    try {
      // Could implement custom metrics table or external analytics service
      console.log('Performance metrics:', metrics);
    } catch (error) {
      console.warn('Performance metrics logging failed:', error);
    }
  }
}
