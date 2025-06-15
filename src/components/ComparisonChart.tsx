
import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { chartColors } from "@/utils/chartConfig";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";


interface TimeSeriesDataPoint {
  date: string;
  impressions: number;
  downloads: number;
  pageViews: number;
  [key: string]: any;
}

interface ComparisonChartProps {
  currentData: TimeSeriesDataPoint[];
  previousData: TimeSeriesDataPoint[];
  title: string;
  metric: string;
}

export const mergeSeries = (
  currentData: TimeSeriesDataPoint[] = [], 
  previousData: TimeSeriesDataPoint[] = [], 
  metric: string
) => {
  if (!Array.isArray(currentData) || !Array.isArray(previousData)) {
    return [];
  }
  
  const mergedMap = new Map();
  
  currentData.forEach(point => {
    if (!point || typeof point !== 'object' || !point.date) return;
    const dateStr = point.date;
    if (!(metric in point)) return;
    mergedMap.set(dateStr, { 
      date: dateStr,
      current: typeof point[metric] === 'number' ? point[metric] : 0
    });
  });
  
  previousData.forEach(point => {
    if (!point || typeof point !== 'object' || !point.date) return;
    const dateStr = point.date;
    if (!(metric in point)) return;
    const existing = mergedMap.get(dateStr);
    
    if (existing) {
      mergedMap.set(dateStr, { 
        ...existing, 
        previous: typeof point[metric] === 'number' ? point[metric] : 0
      });
    } else {
      mergedMap.set(dateStr, { 
        date: dateStr,
        previous: typeof point[metric] === 'number' ? point[metric] : 0,
        current: 0
      });
    }
  });
  
  mergedMap.forEach((value) => {
    if (value.current === undefined) value.current = 0;
    if (value.previous === undefined) value.previous = 0;
  });
  
  return Array.from(mergedMap.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

const ComparisonChart: React.FC<ComparisonChartProps> = ({ 
  currentData, 
  previousData, 
  metric 
}) => {
  const mergedData = useMemo(() => {
    return mergeSeries(currentData, previousData, metric);
  }, [currentData, previousData, metric]);

  const chartConfig = {
    current: {
      label: "Current",
      color: chartColors.current,
    },
    previous: {
      label: "Previous",
      color: chartColors.previous,
    },
  } satisfies ChartConfig;

  if (!mergedData || !mergedData.length) {
    return <div className="text-zinc-400 p-4 text-center h-[450px] flex items-center justify-center">
      Insufficient data for comparison
    </div>;
  }

  return (
    <div className="w-full h-[450px]">
      <ChartContainer config={chartConfig} className="w-full h-full">
        <LineChart data={mergedData} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Line
            dataKey="current"
            type="monotone"
            stroke={`var(--color-current)`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            dataKey="previous"
            type="monotone"
            stroke={`var(--color-previous)`}
            strokeWidth={2}
            strokeDasharray="3 3"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <ChartLegend content={<ChartLegendContent />} />
        </LineChart>
      </ChartContainer>
    </div>
  );
};

export default React.memo(ComparisonChart);
