
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, RefreshCw, AlertTriangle, Zap, TrendingUp, Target } from 'lucide-react';
import { useKeywordIntelligenceManager } from '@/hooks/useKeywordIntelligenceManager';
import { KeywordClustersPanel } from './KeywordClustersPanel';
import { RankDistributionChart } from './RankDistributionChart';
import { KeywordTrendsTable } from './KeywordTrendsTable';
import { UsageTrackingPanel } from './UsageTrackingPanel';

interface UnifiedKeywordIntelligenceProps {
  organizationId: string;
  selectedAppId?: string;
}

export const UnifiedKeywordIntelligence: React.FC<UnifiedKeywordIntelligenceProps> = ({
  organizationId,
  selectedAppId
}) => {
  const {
    isLoading,
    isInitialized,
    fallbackMode,
    lastSuccessfulLoad,
    keywordData,
    clusters,
    stats,
    selectedApp,
    rankDistribution,
    keywordTrends,
    analytics,
    refreshAllData,
    clearStuckTransition
  } = useKeywordIntelligenceManager({
    organizationId,
    targetAppId: selectedAppId
  });

  if (!selectedAppId) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-8 text-center">
          <Brain className="mx-auto h-16 w-16 text-zinc-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Unified Keyword Intelligence
          </h3>
          <p className="text-zinc-400 mb-6">
            Select an app to access comprehensive keyword analytics, trends, and optimization opportunities.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleRefresh = async () => {
    await refreshAllData();
  };

  const handleClearStuck = () => {
    clearStuckTransition();
  };

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            Unified Keyword Intelligence
            {fallbackMode && (
              <Badge variant="outline" className="text-orange-400 border-orange-500">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Fallback Mode
              </Badge>
            )}
          </h2>
          <p className="text-zinc-400">
            Comprehensive keyword analysis for{' '}
            <span className="text-yodel-orange font-medium">{selectedApp?.app_name || 'Selected App'}</span>
            {lastSuccessfulLoad && (
              <span className="text-zinc-500 text-sm ml-2">
                • Last updated: {lastSuccessfulLoad.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isInitialized && (
            <Button onClick={handleClearStuck} variant="outline" size="sm">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Clear Stuck
            </Button>
          )}
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {isInitialized && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-zinc-400">Total Keywords</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {stats.totalKeywords}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-400" />
                <span className="text-sm text-zinc-400">High Opportunity</span>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {stats.highOpportunityKeywords}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-zinc-400">Avg Difficulty</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {stats.avgDifficulty.toFixed(1)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-orange-400" />
                <span className="text-sm text-zinc-400">Search Volume</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {(stats.totalSearchVolume / 1000).toFixed(0)}K
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-zinc-900 border-zinc-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
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

        <TabsContent value="keywords" className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Keyword Opportunities</CardTitle>
              <CardDescription>
                Discover high-value keywords with optimization potential
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <div className="h-4 bg-zinc-700 rounded w-3/4 animate-pulse"></div>
                  <div className="h-32 bg-zinc-700 rounded animate-pulse"></div>
                </div>
              ) : keywordData.length > 0 ? (
                <div className="space-y-4">
                  {keywordData.slice(0, 10).map((keyword, index) => (
                    <div key={keyword.keyword} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-white">{keyword.keyword}</h4>
                        <p className="text-sm text-zinc-400">
                          Rank: {keyword.rank || 'N/A'} • Volume: {keyword.searchVolume?.toLocaleString() || 'N/A'}
                        </p>
                      </div>
                      <Badge className={
                        keyword.opportunity === 'high' ? 'bg-green-500/20 text-green-400' :
                        keyword.opportunity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }>
                        {keyword.opportunity}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-400">
                  No keyword data available. Try refreshing or check your data sources.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <KeywordTrendsTable
            trends={keywordTrends}
            isLoading={isLoading}
            onTimeframeChange={() => {}}
            selectedTimeframe={30}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <UsageTrackingPanel
            usageStats={[]}
            isLoading={isLoading}
            onUpgrade={() => {}}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
