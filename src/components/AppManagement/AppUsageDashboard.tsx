
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Smartphone, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Crown,
  Plus
} from 'lucide-react';
import { useAppManagement } from '@/hooks/useAppManagement';

interface AppUsageDashboardProps {
  onAddApp: () => void;
}

export const AppUsageDashboard: React.FC<AppUsageDashboardProps> = ({ onAddApp }) => {
  const { orgUsage, isLoadingUsage, canAddApp } = useAppManagement();

  if (isLoadingUsage) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-zinc-700 rounded w-1/3"></div>
            <div className="h-8 bg-zinc-700 rounded"></div>
            <div className="h-4 bg-zinc-700 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!orgUsage) {
    return null;
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'professional':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default:
        return <Smartphone className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'professional':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  const isNearLimit = orgUsage.usage_percentage >= 75;
  const atLimit = orgUsage.usage_percentage >= 100;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Usage Overview */}
      <Card className="bg-zinc-900/50 border-zinc-800 md:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-yodel-orange" />
                App Usage
              </CardTitle>
              <CardDescription className="text-zinc-400">
                {orgUsage.organization_name} • {orgUsage.current_app_count} of {orgUsage.app_limit} apps used
              </CardDescription>
            </div>
            <Badge variant="outline" className={getTierColor(orgUsage.subscription_tier)}>
              {getTierIcon(orgUsage.subscription_tier)}
              <span className="ml-1 capitalize">{orgUsage.subscription_tier}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">Usage</span>
              <span className={`text-sm font-medium ${getUsageColor(orgUsage.usage_percentage)}`}>
                {orgUsage.usage_percentage}%
              </span>
            </div>
            <Progress 
              value={orgUsage.usage_percentage} 
              className="h-2"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{orgUsage.active_apps}</div>
              <div className="text-xs text-zinc-400">Active Apps</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-zinc-400">{orgUsage.inactive_apps}</div>
              <div className="text-xs text-zinc-400">Inactive Apps</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{orgUsage.remaining_apps}</div>
              <div className="text-xs text-zinc-400">Remaining</div>
            </div>
          </div>

          {isNearLimit && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              atLimit ? 'bg-red-500/10 border border-red-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'
            }`}>
              <AlertTriangle className={`h-4 w-4 ${atLimit ? 'text-red-500' : 'text-yellow-500'}`} />
              <span className={`text-sm ${atLimit ? 'text-red-400' : 'text-yellow-400'}`}>
                {atLimit 
                  ? 'App limit reached. Upgrade to add more apps.' 
                  : 'Approaching app limit. Consider upgrading soon.'
                }
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            onClick={onAddApp}
            disabled={!canAddApp}
            className="w-full bg-yodel-orange hover:bg-orange-600 disabled:bg-zinc-700 disabled:text-zinc-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New App
          </Button>

          {!canAddApp && (
            <div className="text-xs text-zinc-400 text-center">
              App limit reached. Upgrade to add more apps.
            </div>
          )}

          {orgUsage.subscription_tier !== 'enterprise' && (
            <Button 
              variant="outline" 
              className="w-full border-zinc-700 hover:bg-zinc-800"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
          )}

          <div className="pt-2 border-t border-zinc-800">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>All systems operational</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
