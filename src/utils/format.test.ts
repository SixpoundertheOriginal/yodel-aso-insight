// src/utils/format.test.ts
// Add these tests alongside your existing formatPercentage tests

import { formatPercentage, standardizeChartData } from './format';

describe('formatPercentage', () => {
  // Your existing tests for formatPercentage
});

describe('standardizeChartData', () => {
  it('handles undefined or null data', () => {
    expect(standardizeChartData(undefined)).toEqual([]);
    expect(standardizeChartData(null as any)).toEqual([]);
  });

  it('handles empty arrays', () => {
    expect(standardizeChartData([])).toEqual([]);
  });

  it('standardizes data with correct properties', () => {
    const input = [
      { date: '2023-01-01', impressions: 100, downloads: 50, product_page_views: 200 }
    ];
    
    const output = standardizeChartData(input);
    
    expect(output).toEqual([
      { date: '2023-01-01', impressions: 100, downloads: 50, product_page_views: 200 }
    ]);
  });

  it('adds missing properties with default values', () => {
    const input = [
      { date: '2023-01-01' }
    ];
    
    const output = standardizeChartData(input);
    
    expect(output).toEqual([
      { date: '2023-01-01', impressions: 0, downloads: 0, product_page_views: 0 }
    ]);
  });

  it('handles alternative property name for pageViews', () => {
    const input = [
      { date: '2023-01-01', impressions: 100, downloads: 50, pageViews: 200 }
    ];
    
    const output = standardizeChartData(input);
    
    expect(output).toEqual([
      { date: '2023-01-01', impressions: 100, downloads: 50, product_page_views: 200 }
    ]);
  });
  
  it('handles non-numeric values', () => {
    const input = [
      { 
        date: '2023-01-01', 
        impressions: '100' as any, 
        downloads: null, 
        product_page_views: undefined 
      }
    ];
    
    const output = standardizeChartData(input);
    
    expect(output).toEqual([
      { date: '2023-01-01', impressions: 0, downloads: 0, product_page_views: 0 }
    ]);
  });

  it('strips additional properties', () => {
    const input = [
      { 
        date: '2023-01-01', 
        impressions: 100, 
        downloads: 50, 
        product_page_views: 200,
        customProperty: 'value' 
      }
    ];
    
    const output = standardizeChartData(input);
    
    // The standardized output should only include the specified properties
    expect(output).toEqual([
      { date: '2023-01-01', impressions: 100, downloads: 50, product_page_views: 200 }
    ]);
    expect((output[0] as any).customProperty).toBeUndefined();
  });
});
