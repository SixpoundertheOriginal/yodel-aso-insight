
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Brain, Target, TrendingUp, Database, RefreshCw, Zap } from 'lucide-react';
import { useEnhancedKeywordAnalytics } from '@/hooks/useEnhancedKeywordAnalytics';
import { useAdvancedKeywordIntelligence } from '@/hooks/useAdvancedKeywordIntelligence';
import { RankDistributionChart } from './RankDistributionChart';
import { KeywordTrendsTable } from './KeywordTrendsTable';
import { UsageTrackingPanel } from './UsageTrackingPanel';
import { KeywordClustersPanel } from './KeywordClustersPanel';
import { toast } from 'sonner';

interface EnhancedKeywordIntelligenceProps {
  organizationId: string;
  selectedAppId?: string;
}

export const EnhancedKeywordIntelligence: React.FC<EnhancedKeywordIntelligenceProps> = ({
  organizationId,
  selectedAppId
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Enhanced analytics hook
  const {
    rankDistribution,
    keywordTrends,
    usageStats,
    analytics,
    isLoading: isLoadingAnalytics,
    saveKeywordSnapshots,
    createCollectionJob,
    refetchRankDist,
    refetchTrends,
    selectedTimeframe,
    setSelectedTimeframe
  } = useEnhancedKeywordAnalytics({
    organizationId,
    appId: selectedAppId,
    enabled: !!selectedAppId
  });

  // Original keyword intelligence hook for existing data
  const {
    keywordData,
    clusters,
    stats,
    isLoading: isLoadingKeywords,
    refreshKeywordData
  } = useAdvancedKeywordIntelligence({
    organizationId,
    targetAppId: selectedAppId,
    enabled: !!selectedAppId
  });

  const handleRefreshData = async () => {
    if (!selectedAppId) return;
    
    setIsRefreshing(true);
    try {
      console.log('🔄 [ENHANCED-KI] Starting data refresh for app:', selectedAppId);
      
      // Save current keywords as snapshots for historical tracking
      if (keywordData.length > 0) {
        const snapshots = keywordData.map(kw => ({
          keyword: kw.keyword,
          rank_position: kw.rank,
          search_volume: kw.searchVolume,
          difficulty_score: kw.difficulty,
          volume_trend: kw.trend
        }));

        const result = await saveKeywordSnapshots(snapshots);
        console.log('💾 [ENHANCED-KI] Saved snapshots:', result.saved);
        
        if (result.success) {
          toast.success(`Saved ${result.saved} keyword snapshots`);
        }
      }
      
      // Refresh existing data
      await refreshKeywordData();
      
      // Refresh analytics
      await Promise.all([refetchRankDist(), refetchTrends()]);
      
      toast.success('Keyword data refreshed successfully');
    } catch (error) {
      console.error('❌ [ENHANCED-KI] Refresh failed:', error);
      toast.error('Failed to refresh keyword data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStartCollection = async () => {
    if (!selectedAppId) return;
    
    try {
      const job = await createCollectionJob('full_refresh');
      if (job) {
        toast.success('Background keyword collection started');
      } else {
        toast.error('Failed to start collection job');
      }
    } catch (error) {
      console.error('❌ [ENHANCED-KI] Collection job failed:', error);
      toast.error('Failed to start keyword collection');
    }
  };

  // Convert timeframe string to days and update the hook
  const handleTimeframeChange = (days: number) => {
    const timeframeMap: Record<number, string> = {
      7: '7d',
      30: '30d',
      90: '90d'
    };
    setSelectedTimeframe(timeframeMap[days] || '30d');
  };

  // Convert string timeframe to days for the component
  const getSelectedDays = (timeframe: string): number => {
    const daysMap: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90
    };
    return daysMap[timeframe] || 30;
  };

  if (!selectedAppId) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-8 text-center">
          <Brain className="mx-auto h-16 w-16 text-zinc-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Enhanced Keyword Intelligence
          </h3>
          <p className="text-zinc-400 mb-6">
            Select an app to access advanced keyword analytics, historical trends, and performance insights.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 text-zinc-300">
              <Target className="h-4 w-4 text-blue-400" />
              Rank Distribution Analysis
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <TrendingUp className="h-4 w-4 text-green-400" />
              Historical Trend Tracking
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <Database className="h-4 w-4 text-purple-400" />
              SaaS Usage Monitoring
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isLoading = isLoadingAnalytics || isLoadingKeywords;

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Enhanced Keyword Intelligence</h2>
          <p className="text-zinc-400">
            Advanced analytics and historical insights for your keyword performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefreshData}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
          <Button
            onClick={handleStartCollection}
            variant="outline"
            size="sm"
          >
            <Zap className="h-4 w-4 mr-2" />
            Start Collection
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      {analytics.rankingInsights && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-green-400" />
                <span className="text-sm text-zinc-400">Top 10 Keywords</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {analytics.rankingInsights.topPerformers}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-zinc-400">Visibility Score</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {analytics.rankingInsights.visibilityScore?.toFixed(1)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-sm text-zinc-400">Improving</span>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {analytics.trendInsights?.improvingKeywords || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-zinc-400">Usage Rate</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {analytics.usageInsights?.utilizationRate || 0}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-zinc-900 border-zinc-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="clusters">Clusters</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankDistributionChart 
              data={rankDistribution} 
              isLoading={isLoading}
            />
            <KeywordClustersPanel
              clusters={clusters}
              isLoading={isLoading}
            />
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <KeywordTrendsTable
            trends={keywordTrends}
            isLoading={isLoading}
            onTimeframeChange={handleTimeframeChange}
            selectedTimeframe={getSelectedDays(selectedTimeframe)}
          />
        </TabsContent>

        <TabsContent value="clusters" className="space-y-6">
          <KeywordClustersPanel
            clusters={clusters}
            isLoading={isLoading}
            detailed={true}
          />
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <UsageTrackingPanel
            usageStats={usageStats}
            isLoading={isLoading}
            onUpgrade={() => toast.info('Upgrade functionality coming soon')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
