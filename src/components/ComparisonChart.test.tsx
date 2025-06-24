
import React from 'react';
import { render, screen } from '@testing-library/react';
import ComparisonChart from './ComparisonChart';

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
});
