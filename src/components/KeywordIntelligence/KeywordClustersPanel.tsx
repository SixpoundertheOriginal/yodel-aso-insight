
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Network, Target, TrendingUp, Users, Sparkles, Eye, Zap, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { KeywordCluster } from '@/services/competitor-keyword-analysis.service';
import { keywordVisibilityCalculatorService } from '@/services/keyword-visibility-calculator.service';

interface KeywordClustersPanelProps {
  clusters: KeywordCluster[];
  onClusterSelect?: (cluster: KeywordCluster) => void;
  isLoading?: boolean;
  detailed?: boolean;
}

interface ClusterPerformance {
  visibilityScore: number;
  competitiveGap: number;
  growthPotential: number;
  marketShare: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export const KeywordClustersPanel: React.FC<KeywordClustersPanelProps> = ({
  clusters,
  onClusterSelect,
  isLoading = false,
  detailed = false
}) => {
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<'overview' | 'performance' | 'competitive'>('overview');

  // Calculate performance analytics for each cluster
  const clusterPerformance = useMemo(() => {
    const performanceMap = new Map<string, ClusterPerformance>();
    
    clusters.forEach(cluster => {
      // Simulate performance calculations based on cluster data
      const avgVolume = cluster.totalSearchVolume || 0;
      const difficulty = cluster.avgDifficulty || 5;
      const opportunityScore = cluster.opportunityScore || 0;
      
      const visibilityScore = Math.min(100, (avgVolume / 1000) * (opportunityScore * 100));
      const competitiveGap = Math.max(0, (10 - difficulty) * 10);
      const growthPotential = opportunityScore * 100;
      const marketShare = Math.min(50, visibilityScore / 2);
      
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (difficulty > 7) riskLevel = 'high';
      else if (difficulty > 5) riskLevel = 'medium';

      performanceMap.set(cluster.id, {
        visibilityScore,
        competitiveGap,
        growthPotential,
        marketShare,
        riskLevel
      });
    });
    
    return performanceMap;
  }, [clusters]);

  // Competitive monitoring insights
  const competitiveInsights = useMemo(() => {
    return {
      totalOpportunities: clusters.filter(c => (c.opportunityScore || 0) >= 0.7).length,
      quickWins: clusters.filter(c => (c.avgDifficulty || 0) <= 4 && (c.opportunityScore || 0) >= 0.6).length,
      highCompetition: clusters.filter(c => (c.avgDifficulty || 0) >= 7).length,
      emergingTrends: clusters.filter(c => c.clusterType === 'semantic').length
    };
  }, [clusters]);

  const toggleClusterExpansion = (clusterId: string) => {
    const newExpanded = new Set(expandedClusters);
    if (newExpanded.has(clusterId)) {
      newExpanded.delete(clusterId);
    } else {
      newExpanded.add(clusterId);
    }
    setExpandedClusters(newExpanded);
  };

  const getClusterTypeIcon = (type: string | null) => {
    switch (type) {
      case 'semantic': return <Network className="w-4 h-4" />;
      case 'category': return <Target className="w-4 h-4" />;
      case 'intent': return <TrendingUp className="w-4 h-4" />;
      case 'competitor': return <Users className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const getClusterTypeColor = (type: string | null) => {
    switch (type) {
      case 'semantic': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'category': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'intent': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'competitor': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  const getRiskLevelColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Network className="w-5 h-5 text-blue-400" />
            <span>Enhanced Keyword Clusters</span>
          </CardTitle>
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

  if (clusters.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Network className="w-5 h-5 text-blue-400" />
            <span>Enhanced Keyword Clusters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Network className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Clusters Available</h3>
            <p className="text-zinc-400">
              Import an app to generate intelligent keyword clusters with performance analytics.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Intelligence Overview */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Network className="w-5 h-5 text-blue-400" />
            <span>Enhanced Keyword Clusters</span>
            <Badge variant="outline" className="ml-2 text-zinc-400 border-zinc-600">
              {clusters.length} clusters
            </Badge>
          </CardTitle>
          <p className="text-zinc-400 text-sm">
            AI-powered clustering with performance analytics and competitive monitoring.
          </p>
        </CardHeader>
        <CardContent>
          {/* Competitive Intelligence Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className="h-4 w-4 text-green-400" />
                <span className="text-lg font-bold text-green-400">{competitiveInsights.totalOpportunities}</span>
              </div>
              <p className="text-xs text-zinc-400">High Opportunities</p>
            </div>
            <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="h-4 w-4 text-blue-400" />
                <span className="text-lg font-bold text-blue-400">{competitiveInsights.quickWins}</span>
              </div>
              <p className="text-xs text-zinc-400">Quick Wins</p>
            </div>
            <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                <span className="text-lg font-bold text-orange-400">{competitiveInsights.highCompetition}</span>
              </div>
              <p className="text-xs text-zinc-400">High Competition</p>
            </div>
            <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                <span className="text-lg font-bold text-purple-400">{competitiveInsights.emergingTrends}</span>
              </div>
              <p className="text-xs text-zinc-400">Emerging Trends</p>
            </div>
          </div>

          {/* View Toggle */}
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 bg-zinc-800">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="competitive">Competitive</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clusters.map((cluster) => {
                  const performance = clusterPerformance.get(cluster.id);
                  const isExpanded = expandedClusters.has(cluster.id);
                  
                  return (
                    <Card key={cluster.id} className="bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-white">{cluster.clusterName}</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleClusterExpansion(cluster.id)}
                                className="h-6 w-6 p-0"
                              >
                                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </Button>
                            </div>
                            <p className="text-sm text-zinc-400">
                              Primary: <span className="text-blue-400">{cluster.primaryKeyword}</span>
                            </p>
                          </div>
                          <Badge className={getClusterTypeColor(cluster.clusterType)}>
                            {getClusterTypeIcon(cluster.clusterType)}
                            <span className="ml-1 capitalize">{cluster.clusterType}</span>
                          </Badge>
                        </div>

                        {/* Performance Indicators */}
                        {performance && (
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Eye className="h-3 w-3 text-cyan-400" />
                                <span className="text-sm font-semibold text-white">
                                  {Math.round(performance.visibilityScore)}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400">Visibility</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <TrendingUp className="h-3 w-3 text-green-400" />
                                <span className="text-sm font-semibold text-white">
                                  {Math.round(performance.growthPotential)}%
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400">Growth</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <AlertTriangle className={`h-3 w-3 ${getRiskLevelColor(performance.riskLevel)}`} />
                                <span className={`text-sm font-semibold ${getRiskLevelColor(performance.riskLevel)}`}>
                                  {performance.riskLevel.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400">Risk</p>
                            </div>
                          </div>
                        )}

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="space-y-3 pt-3 border-t border-zinc-700">
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Related Keywords</p>
                              <div className="flex flex-wrap gap-1">
                                {cluster.relatedKeywords.slice(0, 6).map((keyword, index) => (
                                  <Badge key={index} variant="outline" className="text-xs bg-zinc-700/50 border-zinc-600">
                                    {keyword}
                                  </Badge>
                                ))}
                                {cluster.relatedKeywords.length > 6 && (
                                  <Badge variant="outline" className="text-xs bg-zinc-700/50 border-zinc-600">
                                    +{cluster.relatedKeywords.length - 6} more
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {performance && (
                              <div className="space-y-2">
                                <div>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-zinc-400">Competitive Gap</span>
                                    <span className="text-white">{Math.round(performance.competitiveGap)}%</span>
                                  </div>
                                  <Progress value={performance.competitiveGap} className="h-1" />
                                </div>
                                <div>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-zinc-400">Market Share</span>
                                    <span className="text-white">{Math.round(performance.marketShare)}%</span>
                                  </div>
                                  <Progress value={performance.marketShare} className="h-1" />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {onClusterSelect && (
                          <Button
                            onClick={() => onClusterSelect(cluster)}
                            size="sm"
                            className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
                          >
                            Analyze Cluster
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="space-y-4">
                {clusters.map((cluster) => {
                  const performance = clusterPerformance.get(cluster.id);
                  if (!performance) return null;

                  return (
                    <Card key={cluster.id} className="bg-zinc-800/50 border-zinc-700">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-medium text-white">{cluster.clusterName}</h3>
                            <p className="text-sm text-zinc-400">{cluster.relatedKeywords.length + 1} keywords</p>
                          </div>
                          <Badge className={`${getRiskLevelColor(performance.riskLevel)} border-current`}>
                            {performance.riskLevel.toUpperCase()} RISK
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-zinc-400 mb-1">Visibility Score</p>
                            <div className="text-xl font-bold text-cyan-400">
                              {Math.round(performance.visibilityScore)}
                            </div>
                            <Progress value={performance.visibilityScore} className="h-1 mt-1" />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-400 mb-1">Growth Potential</p>
                            <div className="text-xl font-bold text-green-400">
                              {Math.round(performance.growthPotential)}%
                            </div>
                            <Progress value={performance.growthPotential} className="h-1 mt-1" />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-400 mb-1">Competitive Gap</p>
                            <div className="text-xl font-bold text-orange-400">
                              {Math.round(performance.competitiveGap)}%
                            </div>
                            <Progress value={performance.competitiveGap} className="h-1 mt-1" />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-400 mb-1">Market Share</p>
                            <div className="text-xl font-bold text-purple-400">
                              {Math.round(performance.marketShare)}%
                            </div>
                            <Progress value={performance.marketShare} className="h-1 mt-1" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="competitive" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Opportunity Matrix */}
                <Card className="bg-zinc-800/50 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Opportunity Matrix</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {clusters
                        .sort((a, b) => (b.opportunityScore || 0) - (a.opportunityScore || 0))
                        .slice(0, 5)
                        .map((cluster) => {
                          const performance = clusterPerformance.get(cluster.id);
                          return (
                            <div key={cluster.id} className="flex items-center justify-between p-2 bg-zinc-700/50 rounded">
                              <div>
                                <p className="text-sm font-medium text-white">{cluster.clusterName}</p>
                                <p className="text-xs text-zinc-400">
                                  {Math.round((cluster.opportunityScore || 0) * 100)}% opportunity
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-green-400">
                                  {performance ? Math.round(performance.growthPotential) : 0}%
                                </p>
                                <p className="text-xs text-zinc-400">growth</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Assessment */}
                <Card className="bg-zinc-800/50 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Risk Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {clusters
                        .filter(cluster => {
                          const performance = clusterPerformance.get(cluster.id);
                          return performance?.riskLevel === 'high';
                        })
                        .slice(0, 5)
                        .map((cluster) => {
                          const performance = clusterPerformance.get(cluster.id);
                          return (
                            <div key={cluster.id} className="flex items-center justify-between p-2 bg-red-900/20 border border-red-800/30 rounded">
                              <div>
                                <p className="text-sm font-medium text-white">{cluster.clusterName}</p>
                                <p className="text-xs text-red-400">High competition cluster</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-red-400">
                                  {cluster.avgDifficulty?.toFixed(1)}/10
                                </p>
                                <p className="text-xs text-zinc-400">difficulty</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
