
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Eye, TrendingUp, Target, Zap, Award } from 'lucide-react';
import { KeywordVisibilityData } from '@/services/keyword-visibility-calculator.service';

interface VisibilityChartProps {
  keywords: KeywordVisibilityData[];
  appVisibility?: {
    totalVisibility: number;
    averageRank: number;
    topKeywordContribution: number;
    improvementPotential: number;
    visibilityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
  isLoading?: boolean;
}

export const VisibilityChart: React.FC<VisibilityChartProps> = ({
  keywords,
  appVisibility,
  isLoading
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visibility Analysis
          </CardTitle>
          <CardDescription>Loading visibility metrics...</CardDescription>
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

  if (!keywords.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visibility Analysis
          </CardTitle>
          <CardDescription>No visibility data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-zinc-400">
            <Eye className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Start tracking keywords to see visibility analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const topKeywords = keywords
    .sort((a, b) => b.visibility.visibilityScore - a.visibility.visibilityScore)
    .slice(0, 10);

  const visibilityTrendData = topKeywords.map(kw => ({
    keyword: kw.keyword.length > 15 ? kw.keyword.substring(0, 15) + '...' : kw.keyword,
    visibility: kw.visibility.visibilityScore,
    impact: kw.visibility.impactScore,
    opportunity: kw.visibility.competitiveGap
  }));

  const opportunityData = [
    { name: 'Current Visibility', value: appVisibility?.totalVisibility || 0, color: '#10b981' },
    { name: 'Potential Improvement', value: appVisibility?.improvementPotential || 0, color: '#f59e0b' }
  ];

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-blue-500';
      case 'C': return 'bg-yellow-500';
      case 'D': return 'bg-orange-500';
      default: return 'bg-red-500';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Overall Visibility Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Visibility Score
          </CardTitle>
          <CardDescription>
            Overall app visibility performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {appVisibility && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">
                  {appVisibility.totalVisibility.toLocaleString()}
                </span>
                <Badge className={`${getGradeColor(appVisibility.visibilityGrade)} text-white`}>
                  Grade {appVisibility.visibilityGrade}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-400">Avg Rank</p>
                  <p className="font-semibold text-white">{appVisibility.averageRank}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Top 10 Keywords</p>
                  <p className="font-semibold text-white">{appVisibility.topKeywordContribution}</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">Improvement Potential</span>
                  <span className="text-zinc-300">{appVisibility.improvementPotential}</span>
                </div>
                <Progress 
                  value={(appVisibility.totalVisibility / (appVisibility.totalVisibility + appVisibility.improvementPotential)) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visibility Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Opportunity Breakdown
          </CardTitle>
          <CardDescription>
            Current vs potential visibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={opportunityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {opportunityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f9fafb'
                  }}
                  formatter={(value: number) => [value.toLocaleString(), 'Visibility Points']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-zinc-400">Current</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-zinc-400">Potential</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Keywords Visibility */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Keywords Visibility Impact
          </CardTitle>
          <CardDescription>
            Keywords contributing most to app visibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visibilityTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="keyword" 
                  stroke="#9ca3af"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={100}
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
                  formatter={(value: number, name: string) => [
                    value.toFixed(2), 
                    name === 'visibility' ? 'Visibility Score' : 
                    name === 'impact' ? 'Impact Score' : 'Opportunity Gap'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="visibility" 
                  stackId="1"
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="opportunity" 
                  stackId="1"
                  stroke="#f59e0b" 
                  fill="#f59e0b" 
                  fillOpacity={0.4}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
