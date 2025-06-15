
import React from "react";
import { Button } from "@/components/ui/button";
import { Download, FileDown, Share2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  ResponsiveContainer, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie, 
  Legend 
} from "recharts";

interface Metric {
  label: string;
  value: string;
}

interface ResultData {
  title: string;
  summary: string;
  metrics: Metric[];
  recommendations: string[];
  chartData?: any[];
}

interface GrowthGapResultsProps {
  results: {
    type: string;
    data: ResultData;
  } | null;
  isLoading?: boolean;
}

export const GrowthGapResults: React.FC<GrowthGapResultsProps> = ({ results, isLoading = false }) => {
  // Loading state
  if (isLoading) {
    return (
      <Card className="border-none shadow-none bg-transparent flex items-center justify-center h-full">
        <CardContent className="p-6 text-center">
          <div className="text-yodel-orange mb-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin" />
          </div>
          <h3 className="text-lg font-medium text-zinc-300 mb-1">Analyzing Your Data</h3>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto">
            We're processing your data and generating insights. This may take a moment...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!results) {
    return (
      <Card className="border-none shadow-none bg-transparent flex items-center justify-center h-full">
        <CardContent className="p-6 text-center">
          <div className="text-zinc-500 mb-2">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-zinc-300 mb-1">No Analysis Results Yet</h3>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto">
            Upload your keyword data and select an insight module to see analysis results here.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Determine chart type based on result type
  const renderChart = () => {
    if (!results.data.chartData || results.data.chartData.length === 0) {
      return null;
    }

    // For pie chart insight types (brand vs generic, competitor comparison)
    if (results.type === 'BrandVsGeneric' || 
        (results.data.chartData.length <= 4 && results.data.chartData.every(item => item.hasOwnProperty('name') && item.hasOwnProperty('value')))) {
      return (
        <PieChart width={500} height={250}>
          <Pie
            data={results.data.chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            innerRadius={30}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {results.data.chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill || `#${Math.floor(Math.random()*16777215).toString(16)}`} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => value.toLocaleString()} />
          <Legend layout="vertical" align="right" verticalAlign="middle" />
        </PieChart>
      );
    }

    // Default to bar chart
    return (
      <BarChart
        width={500}
        height={250}
        data={results.data.chartData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <XAxis 
          dataKey="name" 
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          axisLine={{ stroke: '#4B5563' }}
          tickLine={{ stroke: '#4B5563' }}
        />
        <YAxis 
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          axisLine={{ stroke: '#4B5563' }}
          tickLine={{ stroke: '#4B5563' }}
          tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1F2937', 
            border: '1px solid #374151',
            borderRadius: '0.375rem',
            color: '#E5E7EB'
          }}
          formatter={(value: any) => [value.toLocaleString(), 'Value']}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {results.data.chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill || '#F97316'} />
          ))}
        </Bar>
      </BarChart>
    );
  };

  return (
    <Card className="border-none shadow-none bg-transparent h-full overflow-auto">
      <CardHeader className="p-4 flex flex-row items-center justify-between">
        <CardTitle className="text-lg text-white">
          {results.data.title}
        </CardTitle>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-zinc-700 bg-zinc-800/70 hover:bg-zinc-700 text-zinc-300"
          >
            <FileDown className="mr-1 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-zinc-700 bg-zinc-800/70 hover:bg-zinc-700 text-zinc-300"
          >
            <Share2 className="mr-1 h-4 w-4" />
            Share
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0 space-y-6">
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
          <p className="text-zinc-300 text-sm">{results.data.summary}</p>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {results.data.metrics.map((metric: Metric, index: number) => (
            <div 
              key={index} 
              className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 text-center"
            >
              <p className="text-zinc-400 text-xs mb-1">{metric.label}</p>
              <p className="text-yodel-orange text-xl font-bold">{metric.value}</p>
            </div>
          ))}
        </div>
        
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
          <h3 className="text-md font-medium text-white mb-4">Analysis Visualization</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
          <h3 className="text-md font-medium text-white mb-3">Recommendations</h3>
          <ul className="space-y-2 text-sm">
            {results.data.recommendations.map((recommendation: string, index: number) => (
              <li key={index} className="flex items-start">
                <div className="text-yodel-orange mr-2">•</div>
                <span className="text-zinc-300">{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
