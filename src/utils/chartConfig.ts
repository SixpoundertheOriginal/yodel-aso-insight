
// src/utils/chartConfig.ts
export const chartColors = {
  impressions: "#F97316", // Yodel orange for impressions 
  downloads: "#3B82F6",   // Yodel blue for downloads
  product_page_views: "#8B5CF6",   // Complementary purple
  current: "#F97316",     // Yodel orange for current data
  previous: "#94A3B8",    // Grey for previous data
};

export const chartConfig = {
  grid: {
    strokeDasharray: "3 3",
    stroke: "#333333"     // Darker grid lines for better contrast
  },
  axis: {
    tick: { fill: '#999999' },
    line: { stroke: '#555555' }
  },
  tooltip: {
    background: "bg-zinc-900",
    border: "border-zinc-800", 
    text: "text-zinc-300"
  },
};
