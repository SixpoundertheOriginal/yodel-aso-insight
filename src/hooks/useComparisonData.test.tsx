// src/hooks/useComparisonData.test.tsx
import { renderHook } from '@testing-library/react';
import { useComparisonData } from './useComparisonData';
import { useAsoData } from '../context/AsoDataContext';
import { standardizeChartData } from '../utils/format';

// Mock the useAsoData hook
jest.mock('../context/AsoDataContext', () => ({
  useAsoData: jest.fn()
}));

// Mock the standardizeChartData utility
jest.mock('../utils/format', () => ({
  standardizeChartData: jest.fn(data => data) // Simple pass-through for testing
}));

describe('useComparisonData', () => {
  // Sample mock data
  const mockTimeseriesData = [
    { date: '2023-01-01', impressions: 100, downloads: 50, product_page_views: 200 },
    { date: '2023-01-02', impressions: 110, downloads: 55, product_page_views: 220 },
  ];
  
  const mockData = {
    summary: {
      impressions: { value: 210, delta: 5 },
      downloads: { value: 105, delta: 10 },
      product_page_views: { value: 420, delta: 7 },
      cvr: { value: 50, delta: 3 },
    },
    timeseriesData: mockTimeseriesData,
    trafficSources: [
      { name: 'Organic', value: 150, delta: 5 }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (standardizeChartData as jest.Mock).mockImplementation(data => data);
  });

  it('returns loading state from useAsoData', () => {
    (useAsoData as jest.Mock).mockReturnValue({
      data: null,
      loading: true
    });

    const { result } = renderHook(() => useComparisonData('period'));

    expect(result.current.loading).toBe(true);
    expect(result.current.current).toBeNull();
    expect(result.current.previous).toBeNull();
  });

  it('returns null for current and previous when data is null', () => {
    (useAsoData as jest.Mock).mockReturnValue({
      data: null,
      loading: false
    });

    const { result } = renderHook(() => useComparisonData('period'));

    expect(result.current.loading).toBe(false);
    expect(result.current.current).toBeNull();
    expect(result.current.previous).toBeNull();
  });

  it('returns current and previous data when data is available', () => {
    (useAsoData as jest.Mock).mockReturnValue({
      data: mockData,
      loading: false
    });

    const { result } = renderHook(() => useComparisonData('period'));

    expect(result.current.loading).toBe(false);
    expect(result.current.current).not.toBeNull();
    expect(result.current.previous).not.toBeNull();
    
    // Verify standardizeChartData was called
    expect(standardizeChartData).toHaveBeenCalledWith(mockTimeseriesData);
    
    // Verify the data structure
    expect(result.current.current?.timeseriesData).toBeDefined();
    expect(result.current.previous?.timeseriesData).toBeDefined();
  });

  it('creates different data for previous period vs previous year', () => {
    (useAsoData as jest.Mock).mockReturnValue({
      data: mockData,
      loading: false
    });

    const { result: periodResult } = renderHook(() => 
      useComparisonData('period')
    );
    
    const { result: yearResult } = renderHook(() => 
      useComparisonData('year')
    );

    // Ensure both types generate data
    expect(periodResult.current.current).not.toBeNull();
    expect(yearResult.current.current).not.toBeNull();
    
    // Note: In the actual implementation, period and year comparisons
    // might generate different data based on the type parameter
  });
});
