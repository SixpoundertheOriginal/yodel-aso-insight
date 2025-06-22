
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CreditCard, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { UsageStats } from '@/services/enhanced-keyword-analytics.service';

interface UsageTrackingPanelProps {
  usageStats: UsageStats[];
  isLoading?: boolean;
  onUpgrade?: () => void;
}

export const UsageTrackingPanel: React.FC<UsageTrackingPanelProps> = ({
  usageStats,
  isLoading,
  onUpgrade
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage & Billing</CardTitle>
          <CardDescription>Loading usage statistics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-zinc-700 rounded w-3/4"></div>
            <div className="h-20 bg-zinc-700 rounded"></div>
            <div className="h-32 bg-zinc-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentMonth = usageStats[0];
  if (!currentMonth) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Usage & Billing
          </CardTitle>
          <CardDescription>No usage data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-zinc-400">
            <CreditCard className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Start using keyword intelligence features to see usage statistics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const utilizationRate = Math.round((currentMonth.keywords_processed / currentMonth.tier_limit) * 100);
  const isNearLimit = utilizationRate >= 80;
  const isOverLimit = currentMonth.overage_keywords > 0;

  const chartData = usageStats.slice(0, 6).reverse().map(stat => ({
    month: new Date(stat.month_year).toLocaleDateString('en-US', { month: 'short' }),
    keywords: stat.keywords_processed,
    api_calls: stat.api_calls_made,
    storage: stat.storage_used_mb
  }));

  const getUsageColor = () => {
    if (isOverLimit) return 'text-red-400';
    if (isNearLimit) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getUsageBadgeColor = () => {
    if (isOverLimit) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (isNearLimit) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-green-500/20 text-green-400 border-green-500/30';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Usage & Billing
        </CardTitle>
        <CardDescription>
          Track your keyword intelligence usage and limits
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Current Usage Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className={`text-2xl font-bold ${getUsageColor()}`}>
              {currentMonth.keywords_processed.toLocaleString()}
            </div>
            <div className="text-xs text-zinc-400">Keywords Processed</div>
            <Badge variant="outline" className={getUsageBadgeColor()}>
              {utilizationRate}% of limit
            </Badge>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {currentMonth.api_calls_made.toLocaleString()}
            </div>
            <div className="text-xs text-zinc-400">API Calls</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {currentMonth.storage_used_mb.toFixed(1)} MB
            </div>
            <div className="text-xs text-zinc-400">Storage Used</div>
          </div>
        </div>

        {/* Usage Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Monthly Keyword Limit</span>
            <span className="text-sm text-zinc-400">
              {currentMonth.keywords_processed} / {currentMonth.tier_limit}
            </span>
          </div>
          <Progress 
            value={Math.min(utilizationRate, 100)} 
            className="h-2"
          />
          {isOverLimit && (
            <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>Over limit by {currentMonth.overage_keywords} keywords</span>
            </div>
          )}
          {isNearLimit && !isOverLimit && (
            <div className="flex items-center gap-2 mt-2 text-yellow-400 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>Approaching monthly limit</span>
            </div>
          )}
          {!isNearLimit && (
            <div className="flex items-center gap-2 mt-2 text-green-400 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>Well within limits</span>
            </div>
          )}
        </div>

        {/* Usage History Chart */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-4">6-Month Usage History</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="month" 
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
                  formatter={(value: number, name: string) => [
                    value.toLocaleString(), 
                    name === 'keywords' ? 'Keywords' : 
                    name === 'api_calls' ? 'API Calls' : 'Storage (MB)'
                  ]}
                />
                <Bar dataKey="keywords" fill="#10b981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upgrade CTA */}
        {(isOverLimit || isNearLimit) && onUpgrade && (
          <div className="border border-zinc-700 rounded-lg p-4 bg-zinc-800/50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-white">Need more keywords?</h4>
                <p className="text-sm text-zinc-400">
                  Upgrade your plan to process more keywords per month
                </p>
              </div>
              <Button onClick={onUpgrade} variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Button>
            </div>
          </div>
        )}

        {/* Tier Information */}
        <div className="mt-4 text-xs text-zinc-500">
          Current tier limit: {currentMonth.tier_limit.toLocaleString()} keywords/month
        </div>
      </CardContent>
    </Card>
  );
};
