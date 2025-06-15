export function formatPercentage(value: number, decimals = 1): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
// src/utils/format.ts
// Add this function alongside your existing formatting utilities

/**
 * Standardizes timeseries data for chart components, ensuring
 * consistent structure and handling missing values.
 */
export const standardizeChartData = (data: any[] | undefined): any[] => {
  if (!data || !Array.isArray(data)) return [];
  
  return data.map(point => ({
    date: point.date || "",
    impressions: typeof point.impressions === 'number' ? point.impressions : 0,
    downloads: typeof point.downloads === 'number' ? point.downloads : 0, 
    // Support both naming conventions to handle the transition to BigQuery later
    product_page_views: typeof point.product_page_views === 'number' ? 
      point.product_page_views : 
      (typeof point.pageViews === 'number' ? point.pageViews : 0),
  }));
};
