import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TrafficSourceDiscoveryResult {
  availableTrafficSources: string[];
  loading: boolean;
  error: Error | null;
  lastUpdated: number;
}

interface DiscoveryResponse {
  success: boolean;
  data: any[];
  meta: {
    availableTrafficSources: string[];
    executionTimeMs: number;
    timestamp: string;
  };
  error?: string;
}

/**
 * Single source of truth for traffic source discovery
 * This hook is called once and cached globally to prevent coordination issues
 */
export const useTrafficSourceDiscovery = (
  clientList: string[] = ['yodel_pimsleur'],
  enabled: boolean = true
): TrafficSourceDiscoveryResult => {
  const [availableTrafficSources, setAvailableTrafficSources] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  console.log('🔍 [DISCOVERY] Traffic source discovery hook initialized', {
    clientList,
    enabled,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    if (!enabled || !clientList.length) {
      console.log('🔍 [DISCOVERY] Discovery disabled or no clients provided');
      setLoading(false);
      return;
    }

    const discoverTrafficSources = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 [DISCOVERY] Starting traffic source discovery for clients:', clientList);

        const client = clientList[0]; // Use first client for discovery
        
        // Discovery-only request with minimal parameters
        const requestBody = {
          client,
          // Use a wide date range to ensure we get all possible traffic sources
          dateRange: {
            from: '2024-01-01',
            to: new Date().toISOString().split('T')[0]
          },
          trafficSources: [], // Empty = discover all
          limit: 1, // We only need metadata, not actual data
          discoveryOnly: true // Flag for discovery mode
        };

        console.log('📤 [DISCOVERY] Making discovery request to BigQuery...');

        const { data: response, error: functionError } = await supabase.functions.invoke(
          'bigquery-aso-data',
          {
            body: requestBody
          }
        );

        if (functionError) {
          console.error('❌ [DISCOVERY] Edge function error:', functionError);
          throw new Error(`Discovery function error: ${functionError.message}`);
        }

        const discoveryResponse = response as DiscoveryResponse;

        if (!discoveryResponse.success) {
          console.error('❌ [DISCOVERY] Service error:', discoveryResponse.error);
          throw new Error(discoveryResponse.error || 'Traffic source discovery failed');
        }

        const discoveredSources = discoveryResponse.meta?.availableTrafficSources || [];

        console.log('✅ [DISCOVERY] Traffic sources discovered:', {
          sources: discoveredSources,
          count: discoveredSources.length,
          executionTime: discoveryResponse.meta?.executionTimeMs,
          timestamp: discoveryResponse.meta?.timestamp
        });

        setAvailableTrafficSources(discoveredSources);
        setLastUpdated(Date.now());

        console.log('🎯 [DISCOVERY] Discovery complete - providing sources to all components:', discoveredSources);

      } catch (err) {
        console.error('❌ [DISCOVERY] Error during traffic source discovery:', err);
        setError(err instanceof Error ? err : new Error('Unknown discovery error'));
        
        // Fallback to common traffic sources if discovery fails
        const fallbackSources = [
          'App Store Search',
          'App Store Browse', 
          'Apple Search Ads',
          'App Referrer',
          'Web Referrer',
          'Other'
        ];
        
        console.log('⚠️ [DISCOVERY] Using fallback traffic sources:', fallbackSources);
        setAvailableTrafficSources(fallbackSources);
        setLastUpdated(Date.now());
        
      } finally {
        setLoading(false);
      }
    };

    discoverTrafficSources();
  }, [clientList.join(','), enabled]);

  console.log('🚨 [DISCOVERY] Discovery hook returning:', {
    sourcesCount: availableTrafficSources.length,
    sources: availableTrafficSources,
    loading,
    error: error?.message,
    lastUpdated: new Date(lastUpdated).toISOString()
  });

  return {
    availableTrafficSources,
    loading,
    error,
    lastUpdated
  };
};