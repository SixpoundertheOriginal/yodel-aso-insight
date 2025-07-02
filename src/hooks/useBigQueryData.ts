import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DateRange, AsoData, TimeSeriesPoint, MetricSummary, TrafficSource } from './useMockAsoData';
import { useBigQueryAppSelection } from '@/context/BigQueryAppContext';
import { useAsoData } from '@/context/AsoDataContext'; // ✅ NEW: Import context

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
  ready: boolean = true
): BigQueryDataResult => {
  const [data, setData] = useState<AsoData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [meta, setMeta] = useState<BigQueryMeta | undefined>(undefined);
  
  // Get selected apps from BigQuery app selector
  const { selectedApps } = useBigQueryAppSelection();

  // ✅ NEW: Get registration function from context (with fallback for non-context usage)
  let registerHookInstance: ((instanceId: string, data: any) => void) | undefined;
  try {
    const context = useAsoData();
    registerHookInstance = context.registerHookInstance;
  } catch (e) {
    // Hook used outside context - that's fine, just won't register
    console.log('🔍 [HOOK] Used outside AsoDataContext - no registration needed');
  }

  // Hook instance tracking
  const instanceId = Math.random().toString(36).substr(2, 9);
  console.log('🚨 [HOOK INSTANCE] useBigQueryData called with:', {
    instanceId,
    clientList,
    trafficSources,
    dateRange: {
      from: dateRange.from.toISOString().split('T')[0],
      to: dateRange.to.toISOString().split('T')[0]
    },
    ready,
    hasRegistration: !!registerHookInstance, // ✅ NEW: Log if registration available
    timestamp: new Date().toISOString()
  });

  // ✅ NEW: Register this hook instance with context whenever data changes
  useEffect(() => {
    if (!registerHookInstance) return; // No context available

    const hookData = {
      instanceId,
      availableTrafficSources: meta?.availableTrafficSources || [],
      sourcesCount: meta?.availableTrafficSources?.length || 0,
      data,
      metadata: meta,
      loading,
      error,
      lastUpdated: Date.now()
    };

    console.log(`🔄 [HOOK REGISTRATION] Instance ${instanceId} registering:`, {
      sourcesCount: hookData.sourcesCount,
      hasData: !!data,
      loading,
      error: !!error,
      sources: hookData.availableTrafficSources
    });

    registerHookInstance(instanceId, hookData);

  }, [registerHookInstance, instanceId, data, meta, loading, error, meta?.availableTrafficSources]);

  useEffect(() => {
    if (!clientList.length || !ready) return;

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
        
        if (bigQueryResponse.meta.dataArchitecture) {
          console.log('🏗️ [Phase 1 Architecture] Data fetching summary:', {
            phase: bigQueryResponse.meta.dataArchitecture.phase,
            discoveryExecuted: bigQueryResponse.meta.dataArchitecture.discoveryQuery.executed,
            allAvailableSources: bigQueryResponse.meta.dataArchitecture.discoveryQuery.sources,
            totalSourcesFound: bigQueryResponse.meta.dataArchitecture.discoveryQuery.sourcesFound,
            mainQueryFiltered: bigQueryResponse.meta.dataArchitecture.mainQuery.filtered,
            dataRowsReturned: bigQueryResponse.meta.dataArchitecture.mainQuery.rowsReturned,
            requestedSources: trafficSources,
            metadataAvailableSources: bigQueryResponse.meta.availableTrafficSources
          });
        }

        console.log('📊 [BigQuery Hook] Available traffic sources:', bigQueryResponse.meta.availableTrafficSources);
        
        console.log('🚨 [HOOK→CONTEXT] Hook instance', instanceId, 'is setting meta with:', {
          availableTrafficSources: bigQueryResponse.meta.availableTrafficSources,
          sourcesCount: bigQueryResponse.meta.availableTrafficSources?.length || 0,
          dateRange: {
            from: dateRange.from.toISOString().split('T')[0],
            to: dateRange.to.toISOString().split('T')[0]
          },
          trafficSources
        });

        setMeta(bigQueryResponse.meta);

        const transformedData = transformBigQueryToAsoData(
          bigQueryResponse.data || [],
          trafficSources,
          bigQueryResponse.meta
        );

        setData(transformedData);
        console.log('✅ [BigQuery Hook] Data transformed successfully');

      } catch (err) {
        console.error('❌ [BigQuery Hook] Error fetching data:', err);
        
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
    dateRange.from.toISOString().split('T')[0],
    dateRange.to.toISOString().split('T')[0], 
    trafficSources,
    selectedApps,
    ready
  ]);

  console.log('🚨 [HOOK RETURN] useBigQueryData instance', instanceId, 'returning:', {
    hasData: !!data,
    hasMeta: !!meta,
    availableTrafficSources: meta?.availableTrafficSources,
    sourcesCount: meta?.availableTrafficSources?.length || 0,
    loading,
    error: error?.message,
    willRegister: !!registerHookInstance, // ✅ NEW: Show if this will register
    dateRange: {
      from: dateRange.from.toISOString().split('T')[0],
      to: dateRange.to.toISOString().split('T')[0]
    }
  });

  return { data, loading, error, meta };
};

function transformBigQueryToAsoData(
  bigQueryData: BigQueryDataPoint[],
  trafficSources: string[],
  meta: BigQueryMeta
): AsoData {
  const dateGroups = bigQueryData.reduce((acc, item) => {
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

  const totals = bigQueryData.reduce(
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

  const trafficSourceGroups = bigQueryData.reduce((acc, item) => {
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

  const availableTrafficSources = meta.availableTrafficSources || [];
  console.log('🔍 [Transform Phase 1] Using traffic sources from metadata:', {
    fromMetadata: availableTrafficSources,
    fromRequestParams: trafficSources,
    usingMetadata: availableTrafficSources.length > 0,
    dataArchitecture: meta.dataArchitecture?.phase || 'unknown'
  });
  
  const sourcesToShow = availableTrafficSources.length > 0 ? availableTrafficSources : trafficSources;
  
  const trafficSourceData: TrafficSource[] = sourcesToShow.map(source => ({
    name: source,
    value: trafficSourceGroups[source]?.value || 0,
    delta: trafficSourceGroups[source]?.delta || 0
  }));

  console.log('📊 [Transform] Aggregation debug with NULL handling fix:', {
    totalItems: bigQueryData.length,
    nonNullPageViewItems: bigQueryData.filter(d => d.product_page_views !== null).length,
    nullPageViewItems: bigQueryData.filter(d => d.product_page_views === null).length,
    totalProductPageViews: totals.product_page_views,
    maxPageViews: bigQueryData.filter(d => d.product_page_views !== null).length > 0 ? 
      Math.max(...bigQueryData.filter(d => d.product_page_views !== null).map(d => d.product_page_views)) : 0,
    aggregationWorking: totals.product_page_views > 0 ? 'YES - NULL handling fixed!' : 'Still showing 0',
    trafficSourceArchitecture: {
      phase: meta.dataArchitecture?.phase || 'unknown',
      sourcesFromMetadata: availableTrafficSources,
      sourcesFromParams: trafficSources,
      finalTrafficSourceData: trafficSourceData.map(ts => ({ name: ts.name, value: ts.value }))
    }
  });

  return {
    summary,
    timeseriesData,
    trafficSources: trafficSourceData
  };
}
