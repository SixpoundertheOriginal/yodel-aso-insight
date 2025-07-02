import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DateRange, AsoData, TimeSeriesPoint, TrafficSource } from './useMockAsoData';
import { useBigQueryAppSelection } from '@/context/BigQueryAppContext';

interface BigQueryDataPoint {
  date: string;
  organization_id: string;
  traffic_source: string;
  traffic_source_raw?: string;
  impressions: number;
  downloads: number;
  product_page_views: number;
  conversion_rate: number;
  revenue: number;
  sessions: number;
  country: string;
  data_source: string;
}

interface BigQueryMeta {
  rowCount: number;
  totalRows: number;
  executionTimeMs: number;
  queryParams: {
    client: string;
    dateRange: { from: string; to: string } | null;
    selectedApps?: string[];
    trafficSources?: string[];
    limit: number;
  };
  availableTrafficSources?: string[];
  filteredByTrafficSource?: boolean;
  projectId: string;
  timestamp: string;
  dataArchitecture?: {
    phase: string;
    discoveryQuery: {
      executed: boolean;
      sourcesFound: number;
      sources: string[];
    };
    mainQuery: {
      executed: boolean;
      filtered: boolean;
      rowsReturned: number;
    };
  };
  debug?: {
    queryPreview: string;
    discoveryQueryPreview?: string;
    parameterCount: number;
    jobComplete: boolean;
    trafficSourceMapping?: Record<string, string>;
  };
}

interface BigQueryResponse {
  success: boolean;
  data: BigQueryDataPoint[];
  meta: BigQueryMeta;
  error?: string;
}

interface BigQueryDataResult {
  data: AsoData | null;
  loading: boolean;
  error: Error | null;
  meta?: BigQueryMeta;
}

export const useBigQueryData = (
  clientList: string[],
  dateRange: DateRange,
  trafficSources: string[],
  ready: boolean = true,
  discoveredTrafficSources: string[] = [] // ✅ Passed from singleton provider
): BigQueryDataResult => {
  const [data, setData] = useState<AsoData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [meta, setMeta] = useState<BigQueryMeta | undefined>(undefined);
  
  // Get selected apps from BigQuery app selector
  const { selectedApps } = useBigQueryAppSelection();

  // Hook instance tracking for debugging
  const instanceId = Math.random().toString(36).substr(2, 9);
  
  // ✅ GATE: Only fetch data when discovery is complete
  const shouldFetchData = ready && 
                         discoveredTrafficSources.length > 0 && 
                         clientList.length > 0;

  console.log('🚨 [HOOK INSTANCE] useBigQueryData called with:', {
    instanceId,
    clientList,
    trafficSources,
    dateRange: {
      from: dateRange.from.toISOString().split('T')[0],
      to: dateRange.to.toISOString().split('T')[0]
    },
    ready,
    discoveredSources: discoveredTrafficSources.length,
    shouldFetchData,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    // ✅ GATE: Don't fetch until discovery is complete
    if (!shouldFetchData) {
      console.log('🔒 [BigQuery Hook] Waiting for discovery to complete:', {
        ready,
        discoveredSources: discoveredTrafficSources.length,
        clientList: clientList.length
      });
      return;
    }

    const fetchBigQueryData = async () => {
      try {
        setLoading(true);
        setError(null);
        setMeta(undefined);

        console.log('🔍 [BigQuery Hook] Fetching ALL traffic source data:', {
          clientList,
          selectedApps,
          dateRange: {
            from: dateRange.from.toISOString().split('T')[0],
            to: dateRange.to.toISOString().split('T')[0]
          },
          userSelectedSources: trafficSources,
          discoveredSources: discoveredTrafficSources,
          strategy: 'fetch_all_filter_client_side'
        });

        const client = clientList[0] || 'yodel_pimsleur';

        const requestBody = {
          client,
          dateRange: {
            from: dateRange.from.toISOString().split('T')[0],
            to: dateRange.to.toISOString().split('T')[0]
          },
          selectedApps: selectedApps.length > 0 ? selectedApps : undefined,
          // ✅ FETCH ALL: Don't filter by traffic sources - get complete dataset
          trafficSources: undefined, // Fetch all traffic sources
          limit: 1000 // Increase limit for comprehensive data
        };

        console.log('📤 [BigQuery Hook] Making request for ALL traffic sources...');

        const { data: response, error: functionError } = await supabase.functions.invoke(
          'bigquery-aso-data',
          {
            body: requestBody
          }
        );

        if (functionError) {
          console.error('❌ [BigQuery Hook] Edge function error:', functionError);
          throw new Error(`BigQuery function error: ${functionError.message}`);
        }

        const bigQueryResponse = response as BigQueryResponse;

        if (!bigQueryResponse.success) {
          console.error('❌ [BigQuery Hook] Service error:', bigQueryResponse.error);
          throw new Error(bigQueryResponse.error || 'BigQuery request failed');
        }

        console.log('✅ [BigQuery Hook] Raw data received:', bigQueryResponse.data?.length, 'records');
        console.log('📊 [BigQuery Hook] Query metadata:', bigQueryResponse.meta);
        
        // ✅ IMPORTANT: Use discovered sources from singleton provider
        const enhancedMeta = {
          ...bigQueryResponse.meta,
          availableTrafficSources: discoveredTrafficSources
        };

        setMeta(enhancedMeta);

        const transformedData = transformBigQueryToAsoData(
          bigQueryResponse.data || [],
          trafficSources, // User's selected filters for client-side filtering
          enhancedMeta,
          discoveredTrafficSources // All available sources from singleton
        );

        setData(transformedData);
        console.log('✅ [BigQuery Hook] Data transformed successfully');

      } catch (err) {
        console.error('❌ [BigQuery Hook] Error fetching data:', err);
        setError(err instanceof Error ? err : new Error('Unknown BigQuery error'));
      } finally {
        setLoading(false);
      }
    };

    fetchBigQueryData();
  }, [
    clientList, 
    dateRange.from.toISOString().split('T')[0],
    dateRange.to.toISOString().split('T')[0], 
    trafficSources,
    selectedApps,
    shouldFetchData,
    discoveredTrafficSources.length // ✅ Re-fetch when discovery completes
  ]);

  console.log('🚨 [HOOK RETURN] useBigQueryData instance', instanceId, 'returning:', {
    hasData: !!data,
    hasMeta: !!meta,
    availableTrafficSources: discoveredTrafficSources,
    sourcesCount: discoveredTrafficSources.length,
    loading,
    error: error?.message,
    shouldFetchData,
    dateRange: {
      from: dateRange.from.toISOString().split('T')[0],
      to: dateRange.to.toISOString().split('T')[0]
    }
  });

  return { 
    data, 
    loading, 
    error, 
    meta 
  };
};

function transformBigQueryToAsoData(
  bigQueryData: BigQueryDataPoint[],
  userSelectedSources: string[], // User's filter selection
  meta: BigQueryMeta,
  allAvailableSources: string[] = [] // All discovered sources
): AsoData {
  // ✅ CLIENT-SIDE FILTERING: Apply user's traffic source filter
  const filteredData = userSelectedSources.length > 0 
    ? bigQueryData.filter(item => userSelectedSources.includes(item.traffic_source))
    : bigQueryData; // Show all data if no specific sources selected

  console.log('🔍 [Transform] Client-side filtering applied:', {
    totalRawData: bigQueryData.length,
    userSelectedSources,
    filteredDataCount: filteredData.length,
    availableSourcesInData: [...new Set(bigQueryData.map(d => d.traffic_source))],
    strategy: 'fetch_all_filter_client_side'
  });

  const dateGroups = filteredData.reduce((acc, item) => {
    const date = item.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {} as Record<string, BigQueryDataPoint[]>);

  const timeseriesData: TimeSeriesPoint[] = Object.entries(dateGroups)
    .map(([date, items]) => {
      const dayTotals = items.reduce(
        (sum, item) => ({
          impressions: sum.impressions + item.impressions,
          downloads: sum.downloads + item.downloads,
          product_page_views: item.product_page_views !== null ? 
            sum.product_page_views + item.product_page_views : 
            sum.product_page_views
        }),
        { impressions: 0, downloads: 0, product_page_views: 0 }
      );

      return {
        date,
        impressions: dayTotals.impressions,
        downloads: dayTotals.downloads,
        product_page_views: dayTotals.product_page_views
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totals = filteredData.reduce(
    (sum, item) => ({
      impressions: sum.impressions + item.impressions,
      downloads: sum.downloads + item.downloads,
      product_page_views: item.product_page_views !== null ? 
        sum.product_page_views + item.product_page_views : 
        sum.product_page_views
    }),
    { impressions: 0, downloads: 0, product_page_views: 0 }
  );

  const generateMockDelta = (): number => (Math.random() * 40) - 20;

  const summary = {
    impressions: { value: totals.impressions, delta: generateMockDelta() },
    downloads: { value: totals.downloads, delta: generateMockDelta() },
    product_page_views: { value: totals.product_page_views, delta: generateMockDelta() },
    cvr: { 
      value: totals.product_page_views > 0 ? 
        (totals.downloads / totals.product_page_views) * 100 : 
        (totals.impressions > 0 ? (totals.downloads / totals.impressions) * 100 : 0), 
      delta: generateMockDelta() 
    }
  };

  const trafficSourceGroups = filteredData.reduce((acc, item) => {
    const source = item.traffic_source || 'Unknown';
    if (!acc[source]) {
      acc[source] = { value: 0, delta: 0 };
    }
    acc[source].value += item.downloads;
    return acc;
  }, {} as Record<string, { value: number; delta: number }>);

  Object.keys(trafficSourceGroups).forEach(source => {
    trafficSourceGroups[source].delta = generateMockDelta();
  });

  // ✅ IMPORTANT: Show ALL available sources, but with filtered data
  const availableTrafficSources = allAvailableSources.length > 0 ? allAvailableSources : meta.availableTrafficSources || [];
  
  console.log('🔍 [Transform] Building traffic source display:', {
    allAvailableSources,
    userSelectedSources,
    sourcesInFilteredData: Object.keys(trafficSourceGroups),
    strategy: 'show_all_sources_with_filtered_data'
  });
  
  // ✅ SHOW ALL SOURCES: Display all available sources, with 0 values for unselected ones
  const trafficSourceData: TrafficSource[] = availableTrafficSources.map(source => ({
    name: source,
    value: trafficSourceGroups[source]?.value || 0,
    delta: trafficSourceGroups[source]?.delta || 0
  }));

  console.log('📊 [Transform] Final traffic source data:', {
    totalRawItems: bigQueryData.length,
    filteredItems: filteredData.length,
    userFilter: userSelectedSources,
    finalTrafficSourceData: trafficSourceData.map(ts => ({ 
      name: ts.name, 
      value: ts.value,
      hasData: ts.value > 0,
      isSelected: userSelectedSources.length === 0 || userSelectedSources.includes(ts.name)
    }))
  });

  return {
    summary,
    timeseriesData,
    trafficSources: trafficSourceData
  };
}