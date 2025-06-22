
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import { KeywordVolumeHistory } from '@/services/competitor-keyword-analysis.service';

interface KeywordVolumeChartProps {
  keyword: string | null;
  volumeData: KeywordVolumeHistory[];
  isLoading: boolean;
  onKeywordSelect: (keyword: string) => void;
  availableKeywords: string[];
}

export const KeywordVolumeChart: React.FC<KeywordVolumeChartProps> = ({
  keyword,
  volumeData,
  isLoading,
  onKeywordSelect,
  availableKeywords
}) => {
  // Generate mock data for demo since we don't have real historical data yet
  const generateMockVolumeData = (keyword: string) => {
    const data = [];
    const baseVolume = Math.floor(Math.random() * 20000) + 5000;
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
      const volume = Math.floor(baseVolume * (1 + variation));
      
      data.push({
        date: date.toISOString().split('T')[0],
        searchVolume: volume,
        formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
    return data;
  };

  const chartData = keyword ? generateMockVolumeData(keyword) : [];

  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  if (!keyword) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-8 text-center">
          <TrendingUp className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Select a Keyword</h3>
          <p className="text-zinc-400 mb-4">
            Choose a keyword from the dropdown to view its search volume trends over time.
          </p>
          <div className="max-w-xs mx-auto">
            <Select onValueChange={onKeywordSelect}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select a keyword..." />
              </SelectTrigger>
              <SelectContent>
                {availableKeywords.map((kw) => (
                  <SelectItem key={kw} value={kw}>
                    {kw}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span>Search Volume Trends</span>
          </CardTitle>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-zinc-400">
              <Calendar className="w-4 h-4" />
              <span>Last 30 days</span>
            </div>
            <Select value={keyword} onValueChange={onKeywordSelect}>
              <SelectTrigger className="w-64 bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableKeywords.map((kw) => (
                  <SelectItem key={kw} value={kw}>
                    {kw}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-zinc-400">Loading trends...</div>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="formattedDate" 
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={formatYAxis}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#f3f4f6' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area
                  type="monotone"
                  dataKey="searchVolume"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#volumeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* Volume Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-zinc-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">
              {chartData.length > 0 ? formatYAxis(chartData[chartData.length - 1]?.searchVolume || 0) : '0'}
            </p>
            <p className="text-sm text-zinc-400">Current Volume</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">
              {chartData.length > 0 ? formatYAxis(Math.max(...chartData.map(d => d.searchVolume))) : '0'}
            </p>
            <p className="text-sm text-zinc-400">Peak Volume</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">
              {chartData.length > 0 ? formatYAxis(Math.round(chartData.reduce((sum, d) => sum + d.searchVolume, 0) / chartData.length)) : '0'}
            </p>
            <p className="text-sm text-zinc-400">Average Volume</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
