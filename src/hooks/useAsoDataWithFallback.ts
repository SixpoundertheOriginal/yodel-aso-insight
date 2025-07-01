
import { useState, useEffect } from 'react';
import { useBigQueryData } from './useBigQueryData';
import { useMockAsoData, DateRange, AsoData } from './useMockAsoData';

export type DataSource = 'bigquery' | 'mock' | 'auto';
export type CurrentDataSource = 'bigquery' | 'mock';

interface UseAsoDataWithFallbackResult {
  data: AsoData | null;
  loading: boolean;
  error: Error | null;
  currentDataSource: CurrentDataSource | null;
  dataSourceStatus: 'loading' | 'bigquery-success' | 'bigquery-failed-fallback' | 'mock-only';
}

export const useAsoDataWithFallback = (
  clientList: string[],
  dateRange: DateRange,
  trafficSources: string[],
  preferredDataSource: DataSource = 'auto'
): UseAsoDataWithFallbackResult => {
  const [currentDataSource, setCurrentDataSource] = useState<CurrentDataSource | null>(null);
  const [dataSourceStatus, setDataSourceStatus] = useState<'loading' | 'bigquery-success' | 'bigquery-failed-fallback' | 'mock-only'>('loading');

  // Always fetch BigQuery data (unless explicitly set to mock-only)
  const bigQueryReady = clientList.length > 0;
  const bigQueryResult = useBigQueryData(
    clientList,
    dateRange,
    trafficSources,
    bigQueryReady
  );

  // Always prepare mock data as fallback
  const mockResult = useMockAsoData(
    clientList,
    dateRange,
    trafficSources
  );

  const [finalResult, setFinalResult] = useState<{
    data: AsoData | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    // Handle explicit mock-only preference
    if (preferredDataSource === 'mock') {
      setCurrentDataSource('mock');
      setDataSourceStatus('mock-only');
      setFinalResult({
        data: mockResult.data,
        loading: mockResult.loading,
        error: mockResult.error
      });
      return;
    }

    // Handle BigQuery data states
    if (bigQueryResult.loading) {
      setDataSourceStatus('loading');
      setFinalResult({
        data: null,
        loading: true,
        error: null
      });
      return;
    }

    // BigQuery succeeded
    if (bigQueryResult.data && !bigQueryResult.error) {
      console.log('✅ [Fallback] Using BigQuery data');
      setCurrentDataSource('bigquery');
      setDataSourceStatus('bigquery-success');
      setFinalResult({
        data: bigQueryResult.data,
        loading: false,
        error: null
      });
      return;
    }

    // BigQuery failed, fall back to mock
    if (bigQueryResult.error) {
      console.warn('⚠️ [Fallback] BigQuery failed, using mock data:', bigQueryResult.error.message);
      setCurrentDataSource('mock');
      setDataSourceStatus('bigquery-failed-fallback');
      setFinalResult({
        data: mockResult.data,
        loading: mockResult.loading,
        error: null // Don't propagate BigQuery error when using fallback
      });
      return;
    }

  }, [
    bigQueryResult.data,
    bigQueryResult.loading,
    bigQueryResult.error,
    mockResult.data,
    mockResult.loading,
    mockResult.error,
    preferredDataSource
  ]);

  return {
    ...finalResult,
    currentDataSource,
    dataSourceStatus
  };
};
