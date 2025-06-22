
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Eye, Target } from 'lucide-react';
import { RankDistribution } from '@/services/enhanced-keyword-analytics.service';

interface RankDistributionChartProps {
  data: RankDistribution | null;
  isLoading?: boolean;
}

export const RankDistributionChart: React.FC<RankDistributionChartProps> = ({
  data,
  isLoading
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rank Distribution</CardTitle>
          <CardDescription>Loading rank analysis...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-zinc-700 rounded w-3/4"></div>
            <div className="h-32 bg-zinc-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rank Distribution</CardTitle>
          <CardDescription>No ranking data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-zinc-400">
            <Target className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Start tracking keywords to see rank distribution</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { rank: 'Top 1', count: data.top_1, color: '#10b981' },
    { rank: 'Top 3', count: data.top_3 - data.top_1, color: '#06b6d4' },
    { rank: 'Top 5', count: data.top_5 - data.top_3, color: '#8b5cf6' },
    { rank: 'Top 10', count: data.top_10 - data.top_5, color: '#f59e0b' },
    { rank: 'Top 20', count: data.top_20 - data.top_10, color: '#ef4444' },
    { rank: 'Top 50', count: data.top_50 - data.top_20, color: '#6b7280' },
    { rank: 'Top 100', count: data.top_100 - data.top_50, color: '#374151' }
  ].filter(item => item.count > 0);

  const getVisibilityColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getVisibilityText = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Improvement';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Rank Distribution Analysis
        </CardTitle>
        <CardDescription>
          Keywords performance across different ranking positions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{data.top_10}</div>
            <div className="text-xs text-zinc-400">Top 10 Keywords</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{data.total_tracked}</div>
            <div className="text-xs text-zinc-400">Total Tracked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{data.avg_rank?.toFixed(1)}</div>
            <div className="text-xs text-zinc-400">Avg Rank</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Eye className="h-4 w-4" />
              <Badge variant="outline" className={`${getVisibilityColor(data.visibility_score)} text-white`}>
                {data.visibility_score?.toFixed(1)}
              </Badge>
            </div>
            <div className="text-xs text-zinc-400">{getVisibilityText(data.visibility_score)}</div>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="rank" 
                stroke="#9ca3af"
                fontSize={12}
              />
              <YAxis 
                stroke="#9ca3af"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#f9fafb'
                }}
                formatter={(value: number) => [value, 'Keywords']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <span className="text-zinc-400">
              {Math.round((data.top_10 / data.total_tracked) * 100)}% in top 10
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingDown className="h-4 w-4 text-red-400" />
            <span className="text-zinc-400">
              {Math.round(((data.total_tracked - data.top_50) / data.total_tracked) * 100)}% beyond top 50
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
