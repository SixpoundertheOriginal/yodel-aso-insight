// src/hooks/useComparisonData.ts
import { useMemo } from 'react';
import { useAsoData } from '../context/AsoDataContext';
import { standardizeChartData } from '../utils/format';
import { AsoData } from './useMockAsoData'; // Import the AsoData type

export type ComparisonType = 'period' | 'year';

export interface ComparisonData {
  current: AsoData | null;
  previous: AsoData | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook that provides comparison data for current and previous periods
 * @param type - 'period' for previous time period, 'year' for same period last year
 */
export const useComparisonData = (type: ComparisonType): ComparisonData => {
  const { data, loading, error } = useAsoData();
  
  const comparisonData = useMemo(() => {
    if (!data) {
      return {
        current: null,
        previous: null,
      };
    }
    
    // Standardize current data
    const currentData = {
      ...data,
      timeseriesData: standardizeChartData(data.timeseriesData),
    };
    
    // Create simulated previous data with different values based on comparison type
    // In a real app, this would fetch actual historical data
    const previousData = {
      ...data,
      timeseriesData: standardizeChartData(data.timeseriesData).map(item => {
        // Different variation factor based on comparison type
        const factor = type === 'period' ? 
          (0.7 + Math.random() * 0.6) : // 70-130% for period comparison
          (0.5 + Math.random() * 0.5);  // 50-100% for year comparison
        
        return {
          ...item,
          downloads: Math.floor(item.downloads * factor),
          impressions: Math.floor(item.impressions * factor),
          product_page_views: Math.floor(item.product_page_views * factor),
        };
      }),
    };
    
    return {
      current: currentData,
      previous: previousData,
    };
  }, [data, type]);
  
  return {
    ...comparisonData,
    loading,
    error,
  };
};

export default useComparisonData;
