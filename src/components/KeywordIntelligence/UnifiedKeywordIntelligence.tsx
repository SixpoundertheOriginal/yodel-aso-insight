
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, RefreshCw, AlertTriangle, Zap, TrendingUp, Target, Database, Search } from 'lucide-react';
import { useKeywordIntelligenceManager } from '@/hooks/useKeywordIntelligenceManager';
import { KeywordClustersPanel } from './KeywordClustersPanel';
import { RankDistributionChart } from './RankDistributionChart';
import { KeywordTrendsTable } from './KeywordTrendsTable';
import { UsageTrackingPanel } from './UsageTrackingPanel';
import { ProgressiveKeywordLoader } from './ProgressiveKeywordLoader';
import { KeywordPoolManager } from './KeywordPoolManager';

interface UnifiedKeywordIntelligenceProps {
  organizationId: string;
  selectedAppId?: string;
}

export const UnifiedKeywordIntelligence: React.FC<UnifiedKeywordIntelligenceProps> = ({
  organizationId,
  selectedAppId
}) => {
  const [keywordData, setKeywordData] = useState<any[]>([]);
  const [selectedPool, setSelectedPool] = useState<{ id: string; keywords: string[] } | null>(null);

  const {
    isLoading,
    isInitialized,
    fallbackMode,
    lastSuccessfulLoad,
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

  const handleKeywordsLoaded = (newKeywords: any[]) => {
    if (Array.isArray(newKeywords)) {
      setKeywordData(newKeywords);
    } else {
      setKeywordData(prev => [...prev, ...newKeywords]);
    }
  };

  const handlePoolSelect = (poolId: string, keywords: string[]) => {
    setSelectedPool({ id: poolId, keywords });
    // Convert pool keywords to keyword data format
    const poolKeywordData = keywords.map((keyword, index) => ({
      keyword,
      rank: Math.floor(Math.random() * 50) + 1,
      searchVolume: Math.floor(Math.random() * 10000) + 1000,
      difficulty: Math.round((Math.random() * 6 + 2) * 10) / 10,
      trend: (['up', 'down', 'stable'] as const)[Math.floor(Math.random() * 3)],
      opportunity: (['high', 'medium', 'low'] as const)[Math.floor(Math.random() * 3)],
      competitorRank: Math.floor(Math.random() * 30) + 1,
      volumeHistory: [],
      source: 'pool'
    }));
    setKeywordData(poolKeywordData);
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
            {selectedPool && (
              <Badge variant="outline" className="text-blue-400 border-blue-500">
                <Database className="w-3 h-3 mr-1" />
                Pool Active
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-zinc-400">Total Keywords</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {keywordData.length || stats.totalKeywords}
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
                {keywordData.filter(kw => kw.opportunity === 'high').length || stats.highOpportunityKeywords}
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
                {(keywordData.reduce((sum, kw) => sum + (kw.searchVolume || 0), 0) / 1000).toFixed(0) || (stats.totalSearchVolume / 1000).toFixed(0)}K
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-cyan-400" />
                <span className="text-sm text-zinc-400">Data Source</span>
              </div>
              <div className="text-sm font-bold text-white">
                {selectedPool ? 'Pool' : fallbackMode ? 'Fallback' : 'Live'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 bg-zinc-900 border-zinc-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="discovery">Discovery</TabsTrigger>
          <TabsTrigger value="pools">Pools</TabsTrigger>
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

        <TabsContent value="discovery" className="space-y-6">
          <ProgressiveKeywordLoader
            organizationId={organizationId}
            appId={selectedAppId}
            onKeywordsLoaded={handleKeywordsLoaded}
          />
          
          {/* Current Keywords Display */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Discovered Keywords</CardTitle>
              <CardDescription>
                Keywords from progressive discovery and pool selection
              </CardDescription>
            </CardHeader>
            <CardContent>
              {keywordData.length > 0 ? (
                <div className="space-y-4">
                  {keywordData.slice(0, 15).map((keyword, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-white">{keyword.keyword}</h4>
                        <p className="text-sm text-zinc-400">
                          Rank: {keyword.rank || 'N/A'} • Volume: {keyword.searchVolume?.toLocaleString() || 'N/A'}
                          {keyword.source && <span className="ml-2 text-xs">({keyword.source})</span>}
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
                  {keywordData.length > 15 && (
                    <div className="text-center text-zinc-400 text-sm">
                      ... and {keywordData.length - 15} more keywords
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-400">
                  No keywords discovered yet. Start discovery or select a pool.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pools" className="space-y-6">
          <KeywordPoolManager
            organizationId={organizationId}
            onPoolSelect={handlePoolSelect}
          />
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
