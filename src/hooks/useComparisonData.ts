
import { useMemo } from 'react';
import { useAsoData } from '../context/AsoDataContext';
import { useBigQueryData } from './useBigQueryData';
import { standardizeChartData } from '../utils/format';
import { getPreviousPeriod, calculateDeltas } from '../utils/dateCalculations';
import { AsoData } from './useMockAsoData';

export type ComparisonType = 'period' | 'year';

export interface ComparisonData {
  current: AsoData | null;
  previous: AsoData | null;
  loading: boolean;
  error: Error | null;
  deltas: {
    impressions: number;
    downloads: number;
    product_page_views: number;
    cvr: number;
  } | null;
}

/**
 * Hook that provides comparison data for current and previous periods
 * @param type - 'period' for previous time period, 'year' for same period last year
 */
export const useComparisonData = (type: ComparisonType): ComparisonData => {
  const { filters } = useAsoData();
  
  // Calculate previous period date range
  const previousDateRange = useMemo(() => {
    if (type === 'period') {
      return getPreviousPeriod(filters.dateRange);
    } else {
      // For year comparison, go back 1 year
      const yearAgo = new Date(filters.dateRange.from.getFullYear() - 1, filters.dateRange.from.getMonth(), filters.dateRange.from.getDate());
      const yearAgoEnd = new Date(filters.dateRange.to.getFullYear() - 1, filters.dateRange.to.getMonth(), filters.dateRange.to.getDate());
      return { from: yearAgo, to: yearAgoEnd };
    }
  }, [filters.dateRange, type]);

  // Fetch current period data (using existing context data)
  const { data: currentData, loading: currentLoading, error: currentError } = useAsoData();

  // Fetch previous period data
  const {
    data: previousRawData,
    loading: previousLoading,
    error: previousError
  } = useBigQueryData(
    filters.clients,
    previousDateRange,
    filters.trafficSources,
    filters.clients.length > 0
  );

  const comparisonData = useMemo(() => {
    if (!currentData || !previousRawData) {
      return {
        current: currentData,
        previous: null,
        deltas: null
      };
    }

    // Standardize both datasets
    const current = {
      ...currentData,
      timeseriesData: standardizeChartData(currentData.timeseriesData),
    };

    const previous = {
      ...previousRawData,
      timeseriesData: standardizeChartData(previousRawData.timeseriesData),
    };

    // Calculate real deltas
    const currentTotals = {
      impressions: current.summary.impressions.value,
      downloads: current.summary.downloads.value,
      product_page_views: current.summary.product_page_views.value
    };

    const previousTotals = {
      impressions: previous.summary.impressions.value,
      downloads: previous.summary.downloads.value,
      product_page_views: previous.summary.product_page_views.value
    };

    const deltas = calculateDeltas(currentTotals, previousTotals);

    return {
      current,
      previous,
      deltas
    };
  }, [currentData, previousRawData]);

  return {
    ...comparisonData,
    loading: currentLoading || previousLoading,
    error: currentError || previousError,
  };
};

export default useComparisonData;
