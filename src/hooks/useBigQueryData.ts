
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DateRange, AsoData, TimeSeriesPoint, MetricSummary, TrafficSource } from './useMockAsoData';

interface BigQueryDataPoint {
  date: string;
  organization_id: string;
  traffic_source: string;
  impressions: number;
  downloads: number;
  product_page_views: number;
  conversion_rate: number;
  revenue: number;
  sessions: number;
  country: string;
  data_source: string;
}

interface BigQueryResponse {
  success: boolean;
  data: BigQueryDataPoint[];
  totalRows: number;
  error?: string;
}

export const useBigQueryData = (
  clientList: string[],
  dateRange: DateRange,
  trafficSources: string[]
): { data: AsoData | null; loading: boolean; error: Error | null } => {
  const [data, setData] = useState<AsoData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchBigQueryData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 [BigQuery] Fetching data with params:', {
          clientList,
          dateRange,
          trafficSources
        });

        // Use the first client as organizationId for now
        const organizationId = clientList[0] || 'yodel_pimsleur';
        
        const requestBody = {
          organizationId,
          dateRange: {
            from: dateRange.from.toISOString().split('T')[0],
            to: dateRange.to.toISOString().split('T')[0]
          },
          limit: 100
        };

        const { data: response, error: functionError } = await supabase.functions.invoke(
          'bigquery-aso-data',
          {
            body: requestBody
          }
        );

        if (functionError) {
          throw new Error(`BigQuery function error: ${functionError.message}`);
        }

        const bigQueryResponse = response as BigQueryResponse;

        if (!bigQueryResponse.success) {
          throw new Error(bigQueryResponse.error || 'BigQuery request failed');
        }

        console.log('✅ [BigQuery] Raw data received:', bigQueryResponse.data?.length, 'records');

        // Transform BigQuery data to AsoData format
        const transformedData = transformBigQueryToAsoData(
          bigQueryResponse.data || [],
          trafficSources
        );

        setData(transformedData);
        console.log('✅ [BigQuery] Data transformed successfully');

      } catch (err) {
        console.error('❌ [BigQuery] Error fetching data:', err);
        setError(err instanceof Error ? err : new Error('Unknown BigQuery error'));
      } finally {
        setLoading(false);
      }
    };

    fetchBigQueryData();
  }, [clientList, dateRange.from, dateRange.to, trafficSources]);

  return { data, loading, error };
};

function transformBigQueryToAsoData(
  bigQueryData: BigQueryDataPoint[],
  trafficSources: string[]
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

  // Group by traffic source
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

  const trafficSourceData: TrafficSource[] = trafficSources.map(source => ({
    name: source,
    value: trafficSourceGroups[source]?.value || 0,
    delta: trafficSourceGroups[source]?.delta || 0
  }));

  return {
    summary,
    timeseriesData,
    trafficSources: trafficSourceData
  };
}
