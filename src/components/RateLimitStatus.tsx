
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Zap, TrendingUp } from 'lucide-react';
import { useRateLimit } from '@/hooks/useRateLimit';

export const RateLimitStatus: React.FC = () => {
  const { rateLimitInfo, loading, error } = useRateLimit();

  if (loading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-zinc-700 rounded w-1/2 mb-2"></div>
            <div className="h-2 bg-zinc-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !rateLimitInfo) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <p className="text-zinc-400 text-sm">Unable to load usage info</p>
        </CardContent>
      </Card>
    );
  }

  const tierColors = {
    free: 'bg-zinc-600',
    pro: 'bg-blue-600',
    enterprise: 'bg-purple-600'
  };

  const getTierLabel = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const formatResetTime = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center justify-between text-sm">
          <span className="flex items-center space-x-2">
            <Zap className="w-4 h-4" />
            <span>API Usage</span>
          </span>
          <Badge className={`${tierColors[rateLimitInfo.tier]} text-white`}>
            {getTierLabel(rateLimitInfo.tier)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hourly Usage */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400 flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Hourly</span>
            </span>
            <span className="text-zinc-300">
              {rateLimitInfo.usage.hourly} / {rateLimitInfo.limits.hourly}
            </span>
          </div>
          <Progress 
            value={(rateLimitInfo.usage.hourly / rateLimitInfo.limits.hourly) * 100}
            className="h-2"
          />
          <p className="text-xs text-zinc-500">
            Resets in {formatResetTime(rateLimitInfo.resetTimes.hourly)}
          </p>
        </div>

        {/* Daily Usage */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400 flex items-center space-x-1">
              <TrendingUp className="w-3 h-3" />
              <span>Daily</span>
            </span>
            <span className="text-zinc-300">
              {rateLimitInfo.usage.daily} / {rateLimitInfo.limits.daily}
            </span>
          </div>
          <Progress 
            value={(rateLimitInfo.usage.daily / rateLimitInfo.limits.daily) * 100}
            className="h-2"
          />
        </div>

        {/* Warning if near limits */}
        {rateLimitInfo.remaining.hourly <= 2 && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded p-2">
            <p className="text-yellow-400 text-xs">
              Only {rateLimitInfo.remaining.hourly} AI calls remaining this hour
            </p>
          </div>
        )}

        {/* Upgrade prompt */}
        {rateLimitInfo.tier === 'free' && rateLimitInfo.usage.hourly > rateLimitInfo.limits.hourly * 0.8 && (
          <div className="bg-blue-900/20 border border-blue-700 rounded p-2">
            <p className="text-blue-400 text-xs">
              Upgrade to Pro for 10x more AI calls
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
