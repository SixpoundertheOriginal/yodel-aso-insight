
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, TrendingDown } from 'lucide-react';

interface TimeSeriesPoint {
  date: string;
  impressions: number;
  downloads: number;
  product_page_views: number;
}

interface ComparisonChartProps {
  currentData: TimeSeriesPoint[];
  previousData: TimeSeriesPoint[];
  title: string;
  metric: keyof Omit<TimeSeriesPoint, 'date'>;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({
  currentData,
  previousData,
  title,
  metric
}) => {
  // Check for empty data states
  const hasCurrentData = currentData && currentData.length > 0;
  const hasPreviousData = previousData && previousData.length > 0;
  const hasAnyData = hasCurrentData || hasPreviousData;

  // If no data at all, show empty state
  if (!hasAnyData) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="p-3 bg-zinc-800/50 rounded-full">
              <TrendingDown className="h-8 w-8 text-zinc-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="text-zinc-400">
                No comparison data available for the selected period.
              </p>
              <p className="text-sm text-zinc-500">
                Try adjusting your date range or check if historical data exists.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If partial data, show warning
  if (!hasCurrentData || !hasPreviousData) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-orange-400">Incomplete Comparison Data</h4>
              <p className="text-sm text-zinc-400">
                {!hasCurrentData && "Current period data is missing. "}
                {!hasPreviousData && "Previous period data is missing. "}
                The comparison chart cannot be displayed.
              </p>
              <p className="text-xs text-zinc-500">
                Ensure data exists for both time periods to enable comparison analysis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for chart
  const chartData = currentData.map((current, index) => {
    const previous = previousData[index] || { [metric]: 0 };
    return {
      date: current.date,
      current: current[metric],
      previous: previous[metric],
      formattedDate: format(new Date(current.date), 'MMM dd'),
    };
  }).filter(item => item.current > 0 || item.previous > 0); // Only show periods with data

  // If all filtered data is empty, show specific message
  if (chartData.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="p-3 bg-zinc-800/50 rounded-full">
              <TrendingDown className="h-8 w-8 text-zinc-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="text-zinc-400">
                No meaningful data to compare for the selected metric: <span className="capitalize">{metric.replace('_', ' ')}</span>
              </p>
              <p className="text-sm text-zinc-500">
                Both current and previous periods show zero values for this metric.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="formattedDate" 
            stroke="#9CA3AF"
            fontSize={12}
          />
          <YAxis 
            stroke="#9CA3AF"
            fontSize={12}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
              return value.toString();
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '6px',
            }}
            labelStyle={{ color: '#D1D5DB' }}
            itemStyle={{ color: '#D1D5DB' }}
            formatter={(value: number, name: string) => [
              typeof value === 'number' ? value.toLocaleString() : value,
              name === 'current' ? 'Current Period' : 'Previous Period'
            ]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="current"
            stroke="#3B82F6"
            strokeWidth={2}
            name="Current Period"
            dot={{ fill: '#3B82F6', strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="previous"
            stroke="#6B7280"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Previous Period"
            dot={{ fill: '#6B7280', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ComparisonChart;
