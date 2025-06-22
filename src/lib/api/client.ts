
import { supabase } from '@/integrations/supabase/client';

export class ApiClient {
  private async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No authentication token available');
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  }

  async generateMetadata(input: {
    appInput: string;
    targetKeywords?: string;
    includeIntelligence?: boolean;
    debugMode?: boolean;
  }) {
    try {
      const headers = await this.getAuthHeaders();
      
      // Simulate API call - in a real implementation this would hit your middleware-wrapped endpoint
      console.log('API Call: Generate Metadata', { input, headers });
      
      // For now, return mock data
      return {
        success: true,
        data: {
          title: `${input.appInput} - Optimized Title`,
          subtitle: 'AI-Generated Subtitle',
          keywords: input.targetKeywords || 'default,keywords,here',
          description: `This is an AI-generated description for ${input.appInput}.`
        },
        rateLimitInfo: {
          remaining: 9,
          resetTime: new Date(Date.now() + 3600000),
          tier: 'free'
        }
      };
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async checkRateLimit() {
    try {
      const headers = await this.getAuthHeaders();
      console.log('API Call: Check Rate Limit', { headers });
      
      // Mock response
      return {
        success: true,
        data: {
          tier: 'free',
          usage: { hourly: 1, daily: 5, monthly: 15 },
          limits: { hourly: 10, daily: 50, monthly: 100 },
          remaining: { hourly: 9, daily: 45, monthly: 85 }
        }
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      throw error;
    }
  }
}

export const apiClient = new ApiClient();
