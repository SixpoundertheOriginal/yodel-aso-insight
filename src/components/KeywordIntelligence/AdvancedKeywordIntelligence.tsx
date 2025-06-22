
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, Minus, Search, Filter, Target, BarChart3, Loader2 } from 'lucide-react';
import { useAdvancedKeywordIntelligence } from '@/hooks/useAdvancedKeywordIntelligence';
import { KeywordVolumeChart } from './KeywordVolumeChart';
import { KeywordClustersPanel } from './KeywordClustersPanel';

interface AdvancedKeywordIntelligenceProps {
  organizationId: string;
  targetAppId?: string;
}

export const AdvancedKeywordIntelligence: React.FC<AdvancedKeywordIntelligenceProps> = ({
  organizationId,
  targetAppId = 'demo-app-123'
}) => {
  const [appChanging, setAppChanging] = useState(false);
  const [previousAppId, setPreviousAppId] = useState(targetAppId);

  const {
    keywordData,
    clusters,
    volumeTrends,
    stats,
    selectedKeyword,
    setSelectedKeyword,
    filters,
    setFilters,
    isLoading,
    isLoadingTrends,
    selectedApp
  } = useAdvancedKeywordIntelligence({
    organizationId,
    targetAppId
  });

  // Track app changes for loading state
  useEffect(() => {
    if (targetAppId !== previousAppId) {
      console.log('🔄 [KEYWORD-INTELLIGENCE] App changed from', previousAppId, 'to', targetAppId);
      setAppChanging(true);
      setPreviousAppId(targetAppId);
      
      // Clear the loading state after a brief moment
      const timer = setTimeout(() => {
        setAppChanging(false);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [targetAppId, previousAppId]);

  // Log keyword data changes for debugging
  useEffect(() => {
    console.log('🎯 [KEYWORD-INTELLIGENCE] Keywords updated for app:', selectedApp?.app_name, 'count:', keywordData.length);
  }, [keywordData.length, selectedApp?.app_name]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable' | null) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getOpportunityColor = (opportunity: string | null) => {
    switch (opportunity) {
      case 'high': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  if (isLoading || appChanging) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-32">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-yodel-orange" />
            <div className="text-zinc-400">
              {appChanging ? `Loading keywords for ${selectedApp?.app_name || 'app'}...` : 'Loading keyword intelligence...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm text-zinc-400">Total Keywords</p>
                <p className="text-2xl font-bold text-white">{stats.totalKeywords}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm text-zinc-400">High Opportunity</p>
                <p className="text-2xl font-bold text-white">{stats.highOpportunityKeywords}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-orange-400" />
              <div>
                <p className="text-sm text-zinc-400">Avg Difficulty</p>
                <p className="text-2xl font-bold text-white">{stats.avgDifficulty.toFixed(1)}/10</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-zinc-400">Total Volume</p>
                <p className="text-2xl font-bold text-white">{(stats.totalSearchVolume / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="keywords" className="space-y-4">
        <TabsList className="bg-zinc-900/50 border-zinc-800">
          <TabsTrigger value="keywords">Keywords Analysis</TabsTrigger>
          <TabsTrigger value="trends">Volume Trends</TabsTrigger>
          <TabsTrigger value="clusters">Keyword Clusters</TabsTrigger>
        </TabsList>

        <TabsContent value="keywords" className="space-y-4">
          {/* Filters */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Filter className="w-5 h-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Min Search Volume</Label>
                  <Slider
                    value={[filters.minVolume]}
                    onValueChange={([value]) => setFilters(prev => ({ ...prev, minVolume: value }))}
                    max={10000}
                    step={100}
                    className="w-full"
                  />
                  <p className="text-xs text-zinc-500">{filters.minVolume.toLocaleString()}</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-zinc-300">Max Difficulty</Label>
                  <Slider
                    value={[filters.maxDifficulty]}
                    onValueChange={([value]) => setFilters(prev => ({ ...prev, maxDifficulty: value }))}
                    max={10}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-zinc-500">{filters.maxDifficulty}/10</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-zinc-300">Trend</Label>
                  <Select value={filters.trend} onValueChange={(value: any) => 
                    setFilters(prev => ({ ...prev, trend: value }))
                  }>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Trends</SelectItem>
                      <SelectItem value="up">Trending Up</SelectItem>
                      <SelectItem value="down">Trending Down</SelectItem>
                      <SelectItem value="stable">Stable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-zinc-300">Opportunity</Label>
                  <Select value={filters.opportunity} onValueChange={(value: any) => 
                    setFilters(prev => ({ ...prev, opportunity: value }))
                  }>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Opportunities</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Keywords Table */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">
                Keywords Analysis
                {selectedApp && (
                  <span className="text-sm font-normal text-zinc-400 ml-2">
                    for {selectedApp.app_name}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left py-3 px-4 text-zinc-300">Keyword</th>
                      <th className="text-right py-3 px-4 text-zinc-300">Rank</th>
                      <th className="text-right py-3 px-4 text-zinc-300">Volume</th>
                      <th className="text-right py-3 px-4 text-zinc-300">Difficulty</th>
                      <th className="text-center py-3 px-4 text-zinc-300">Trend</th>
                      <th className="text-center py-3 px-4 text-zinc-300">Opportunity</th>
                      <th className="text-right py-3 px-4 text-zinc-300">Competitor</th>
                      <th className="text-center py-3 px-4 text-zinc-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywordData.map((keyword, index) => (
                      <tr key={`${keyword.keyword}-${selectedApp?.app_name}-${index}`} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                        <td className="py-3 px-4">
                          <span className="text-white font-medium">{keyword.keyword}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`${keyword.rank && keyword.rank <= 10 ? 'text-green-400' : 
                            keyword.rank && keyword.rank <= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {keyword.rank || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-300">
                          {keyword.searchVolume?.toLocaleString() || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`${keyword.difficulty && keyword.difficulty <= 3 ? 'text-green-400' : 
                            keyword.difficulty && keyword.difficulty <= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {keyword.difficulty?.toFixed(1) || 'N/A'}/10
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getTrendIcon(keyword.trend)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={getOpportunityColor(keyword.opportunity)}>
                            {keyword.opportunity || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-300">
                          #{keyword.competitorRank || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedKeyword(keyword.keyword)}
                            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                          >
                            View Trends
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <KeywordVolumeChart
            keyword={selectedKeyword}
            volumeData={volumeTrends}
            isLoading={isLoadingTrends}
            onKeywordSelect={setSelectedKeyword}
            availableKeywords={keywordData.map(k => k.keyword)}
          />
        </TabsContent>

        <TabsContent value="clusters">
          <KeywordClustersPanel
            clusters={clusters}
            onClusterSelect={(cluster) => {
              console.log('Selected cluster:', cluster);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
