
/**
 * Utility functions for date calculations in analytics
 */

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Calculate the previous period based on the current date range
 * @param current - Current date range
 * @returns Previous period with same duration
 */
export const getPreviousPeriod = (current: DateRange): DateRange => {
  const currentDuration = current.to.getTime() - current.from.getTime();
  
  return {
    from: new Date(current.from.getTime() - currentDuration),
    to: new Date(current.from.getTime() - 1) // End just before current period starts
  };
};

/**
 * Calculate percentage change between two values
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage change (positive for increase, negative for decrease)
 */
export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
};

/**
 * Calculate deltas for ASO metrics
 * @param current - Current period data
 * @param previous - Previous period data
 * @returns Object with percentage changes for each metric
 */
export const calculateDeltas = (
  current: { impressions: number; downloads: number; product_page_views: number },
  previous: { impressions: number; downloads: number; product_page_views: number }
) => {
  return {
    impressions: calculatePercentageChange(current.impressions, previous.impressions),
    downloads: calculatePercentageChange(current.downloads, previous.downloads),
    product_page_views: calculatePercentageChange(current.product_page_views, previous.product_page_views),
    cvr: calculatePercentageChange(
      current.impressions > 0 ? (current.downloads / current.impressions) * 100 : 0,
      previous.impressions > 0 ? (previous.downloads / previous.impressions) * 100 : 0
    )
  };
};
