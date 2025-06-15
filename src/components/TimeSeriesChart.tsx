
import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { TimeSeriesPoint } from "@/hooks/useMockAsoData";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { chartColors } from "@/utils/chartConfig";

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = React.memo(({ 
  data,
}) => {
  // Format the date to be more readable
  const formattedData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }));

  const chartConfigObj = {
    impressions: { label: "Impressions", color: chartColors.impressions },
    downloads: { label: "Downloads", color: chartColors.downloads },
    product_page_views: { label: "Product Page Views", color: chartColors.product_page_views },
  } satisfies ChartConfig;
  
  return (
    <div className="w-full h-[450px]">
      <ChartContainer config={chartConfigObj} className="w-full h-full">
        <LineChart data={formattedData} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis 
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => {
              if (window.innerWidth < 768) {
                return value.split(' ')[1]; // Just show the day on mobile
              }
              return value;
            }}
          />
          <YAxis 
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => value.toLocaleString()}
            width={60}
          />
          <ChartTooltip 
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Line 
            type="monotone" 
            dataKey="impressions" 
            stroke="var(--color-impressions)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="downloads" 
            stroke="var(--color-downloads)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="product_page_views" 
            stroke="var(--color-product_page_views)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
});

TimeSeriesChart.displayName = "TimeSeriesChart";
export default TimeSeriesChart;
