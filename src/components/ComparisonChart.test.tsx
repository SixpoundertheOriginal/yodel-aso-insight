
import React from 'react';
import { render, screen } from '@testing-library/react';
import ComparisonChart, { mergeSeries } from './ComparisonChart';

describe('ComparisonChart', () => {
  // Mock data for testing
  const currentData = [
    { date: '2023-01-01', downloads: 100, impressions: 500, product_page_views: 300 },
    { date: '2023-01-02', downloads: 120, impressions: 550, product_page_views: 320 },
    { date: '2023-01-03', downloads: 110, impressions: 530, product_page_views: 310 }
  ];
  
  const previousData = [
    { date: '2023-01-01', downloads: 90, impressions: 480, product_page_views: 280 },
    { date: '2023-01-03', downloads: 95, impressions: 490, product_page_views: 290 },
    { date: '2023-01-04', downloads: 85, impressions: 470, product_page_views: 270 }
  ];

  it('renders the chart with correct title', () => {
    render(
      <ComparisonChart
        currentData={currentData}
        previousData={previousData}
        title="Test Chart"
        metric="downloads"
      />
    );
    
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('renders both current and previous series', () => {
    const { container } = render(
      <ComparisonChart
        currentData={currentData}
        previousData={previousData}
        title="Downloads Comparison"
        metric="downloads"
      />
    );
    
    // Check that we have two path elements for the two lines
    const paths = container.querySelectorAll('path.recharts-curve');
    expect(paths.length).toBe(2);
    
    // One path should have a stroke-dasharray attribute (for the "Previous" dashed line)
    const dashedPaths = Array.from(paths).filter(
      path => path.getAttribute('stroke-dasharray')
    );
    expect(dashedPaths.length).toBe(1);
  });

  it('displays correct legend items', () => {
    render(
      <ComparisonChart
        currentData={currentData}
        previousData={previousData}
        title="Downloads Comparison"
        metric="downloads"
      />
    );
    
    // Check for legend items
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
  });

  describe('mergeSeries function', () => {
    it('correctly merges current and previous data series', () => {
      const merged = mergeSeries(currentData, previousData, 'downloads');
      
      // Should have entries for all unique dates
      expect(merged.length).toBe(4); // 01, 02, 03, 04
      
      // Check specific entries
      const jan1 = merged.find(item => item.date === '2023-01-01');
      expect(jan1).toEqual({
        date: '2023-01-01',
        current: 100,
        previous: 90
      });
      
      // Check date that exists only in current data
      const jan2 = merged.find(item => item.date === '2023-01-02');
      expect(jan2.current).toBe(120);
      expect(jan2.previous).toBe(0); // Default value when missing
      
      // Check date that exists only in previous data
      const jan4 = merged.find(item => item.date === '2023-01-04');
      expect(jan4.current).toBe(0); // Default value when missing
      expect(jan4.previous).toBe(85);
    });

    it('handles empty input arrays', () => {
      expect(mergeSeries([], [], 'downloads')).toEqual([]);
      expect(mergeSeries(currentData, [], 'downloads').length).toBe(3);
      expect(mergeSeries([], previousData, 'downloads').length).toBe(3);
    });
  });
});
