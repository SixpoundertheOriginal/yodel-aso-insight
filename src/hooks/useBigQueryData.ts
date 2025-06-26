
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DateRange, AsoData, TimeSeriesPoint, MetricSummary, TrafficSource } from './useMockAsoData';
import { useBigQueryAppSelection } from '@/context/BigQueryAppContext';

interface BigQueryDataPoint {
  date: string;
  organization_id: string;
  traffic_source: string;
  traffic_source_raw?: string; // Original BigQuery name for debugging
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
    trafficSources?: string[]; // Add traffic source filtering
    limit: number;
  };
  availableTrafficSources?: string[]; // Available traffic sources from BigQuery
  filteredByTrafficSource?: boolean;
  projectId: string;
  timestamp: string;
  debug?: {
    queryPreview: string;
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
  trafficSources: string[]
): BigQueryDataResult => {
  const [data, setData] = useState<AsoData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [meta, setMeta] = useState<BigQueryMeta | undefined>(undefined);
  
  // Get selected apps from BigQuery app selector
  const { selectedApps } = useBigQueryAppSelection();

  useEffect(() => {
    const fetchBigQueryData = async () => {
      try {
        setLoading(true);
        setError(null);
        setMeta(undefined);

        console.log('🔍 [BigQuery Hook] Fetching data with params:', {
          clientList,
          selectedApps,
          dateRange: {
            from: dateRange.from.toISOString().split('T')[0],
            to: dateRange.to.toISOString().split('T')[0]
          },
          trafficSources
        });

        // Use the first client for now
        const client = clientList[0] || 'yodel_pimsleur';

        const requestBody = {
          client,
          dateRange: {
            from: dateRange.from.toISOString().split('T')[0],
            to: dateRange.to.toISOString().split('T')[0]
          },
          selectedApps: selectedApps.length > 0 ? selectedApps : undefined,
          trafficSources: trafficSources.length > 0 ? trafficSources : undefined,
          limit: 100
        };

        console.log('📤 [BigQuery Hook] Making request to edge function...');

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
        console.log('📊 [BigQuery Hook] Available traffic sources:', bigQueryResponse.meta.availableTrafficSources);

        // Store metadata for debugging and empty state handling
        setMeta(bigQueryResponse.meta);

        // Transform BigQuery data to AsoData format
        const transformedData = transformBigQueryToAsoData(
          bigQueryResponse.data || [],
          trafficSources,
          bigQueryResponse.meta
        );

        setData(transformedData);
        console.log('✅ [BigQuery Hook] Data transformed successfully');

      } catch (err) {
        console.error('❌ [BigQuery Hook] Error fetching data:', err);
        
        // Enhanced error logging for BigQuery issues
        if (err instanceof Error) {
          if (err.message.includes('403') || err.message.includes('permission')) {
            console.error('🔐 [BigQuery Hook] Permission denied - check BigQuery credentials and table access');
          } else if (err.message.includes('404')) {
            console.error('🔍 [BigQuery Hook] Table not found - verify table name and project ID');
          } else if (err.message.includes('non-2xx status')) {
            console.error('🚫 [BigQuery Hook] Edge function failed - check edge function logs');
          }
        }
        
        setError(err instanceof Error ? err : new Error('Unknown BigQuery error'));
      } finally {
        setLoading(false);
      }
    };

    fetchBigQueryData();
  }, [
    clientList, 
    dateRange.from.toISOString().split('T')[0], // Only trigger on date changes
    dateRange.to.toISOString().split('T')[0], 
    trafficSources, 
    selectedApps
  ]);

  return { data, loading, error, meta };
};

function transformBigQueryToAsoData(
  bigQueryData: BigQueryDataPoint[],
  trafficSources: string[],
  meta: BigQueryMeta
): AsoData {
  // Group data by date for timeseries
  const dateGroups = bigQueryData.reduce((acc, item) => {
    const date = item.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {} as Record<string, BigQueryDataPoint[]>);

  // Create timeseries data
  const timeseriesData: TimeSeriesPoint[] = Object.entries(dateGroups)
    .map(([date, items]) => {
      const dayTotals = items.reduce(
        (sum, item) => ({
          impressions: sum.impressions + item.impressions,
          downloads: sum.downloads + item.downloads,
          product_page_views: sum.product_page_views + item.product_page_views
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

  // Calculate summary metrics
  const totals = bigQueryData.reduce(
    (sum, item) => ({
      impressions: sum.impressions + item.impressions,
      downloads: sum.downloads + item.downloads,
      product_page_views: sum.product_page_views + item.product_page_views
    }),
    { impressions: 0, downloads: 0, product_page_views: 0 }
  );

  // Generate mock deltas for now (in a real implementation, compare with previous period)
  const generateMockDelta = (): number => (Math.random() * 40) - 20;

  const summary = {
    impressions: { value: totals.impressions, delta: generateMockDelta() },
    downloads: { value: totals.downloads, delta: generateMockDelta() },
    product_page_views: { value: totals.product_page_views, delta: generateMockDelta() },
    cvr: { 
      value: totals.impressions > 0 ? (totals.downloads / totals.impressions) * 100 : 0, 
      delta: generateMockDelta() 
    }
  };

  // Group by traffic source (using the display names from BigQuery)
  const trafficSourceGroups = bigQueryData.reduce((acc, item) => {
    const source = item.traffic_source || 'Unknown';
    if (!acc[source]) {
      acc[source] = { value: 0, delta: 0 };
    }
    acc[source].value += item.downloads;
    return acc;
  }, {} as Record<string, { value: number; delta: number }>);

  // Add deltas for traffic sources
  Object.keys(trafficSourceGroups).forEach(source => {
    trafficSourceGroups[source].delta = generateMockDelta();
  });

  // Use available traffic sources from BigQuery metadata, fallback to trafficSources parameter
  const availableTrafficSources = meta.availableTrafficSources || [];
  const sourcesToShow = availableTrafficSources.length > 0 ? availableTrafficSources : trafficSources;
  
  const trafficSourceData: TrafficSource[] = sourcesToShow.map(source => ({
    name: source,
    value: trafficSourceGroups[source]?.value || 0,
    delta: trafficSourceGroups[source]?.delta || 0
  }));

  console.log('📊 [Transform] Traffic source data:', {
    availableFromBigQuery: availableTrafficSources,
    requestedSources: trafficSources,
    finalTrafficSourceData: trafficSourceData
  });

  return {
    summary,
    timeseriesData,
    trafficSources: trafficSourceData
  };
}
