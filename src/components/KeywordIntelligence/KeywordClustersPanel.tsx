
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Network, Target, TrendingUp, Users, Sparkles } from 'lucide-react';
import { KeywordCluster } from '@/services/competitor-keyword-analysis.service';

interface KeywordClustersPanelProps {
  clusters: KeywordCluster[];
  onClusterSelect?: (cluster: KeywordCluster) => void;
  isLoading?: boolean;
  detailed?: boolean;
}

export const KeywordClustersPanel: React.FC<KeywordClustersPanelProps> = ({
  clusters,
  onClusterSelect,
  isLoading = false,
  detailed = false
}) => {
  if (isLoading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Network className="w-5 h-5 text-blue-400" />
            <span>Keyword Clusters</span>
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

  const getOpportunityScore = (score: number | null) => {
    if (!score) return 'N/A';
    return `${Math.round(score * 100)}%`;
  };

  const getOpportunityColor = (score: number | null) => {
    if (!score) return 'text-zinc-400';
    if (score >= 0.7) return 'text-green-400';
    if (score >= 0.4) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Show message when no clusters are available
  if (clusters.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Network className="w-5 h-5 text-blue-400" />
            <span>Keyword Clusters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Network className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Clusters Available</h3>
            <p className="text-zinc-400">
              Import an app to generate semantic keyword clusters and identify optimization opportunities.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Network className="w-5 h-5 text-blue-400" />
            <span>Keyword Clusters</span>
            <Badge variant="outline" className="ml-2 text-zinc-400 border-zinc-600">
              {clusters.length} clusters
            </Badge>
          </CardTitle>
          <p className="text-zinc-400 text-sm">
            AI-generated semantic groupings of related keywords for strategic optimization.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clusters.map((cluster) => (
              <Card key={cluster.id} className="bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-white mb-1">{cluster.clusterName}</h3>
                      <p className="text-sm text-zinc-400">
                        Primary: <span className="text-blue-400">{cluster.primaryKeyword}</span>
                      </p>
                    </div>
                    <Badge className={getClusterTypeColor(cluster.clusterType)}>
                      {getClusterTypeIcon(cluster.clusterType)}
                      <span className="ml-1 capitalize">{cluster.clusterType}</span>
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {/* Related Keywords */}
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Related Keywords</p>
                      <div className="flex flex-wrap gap-1">
                        {cluster.relatedKeywords.slice(0, 3).map((keyword, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-zinc-700/50 border-zinc-600">
                            {keyword}
                          </Badge>
                        ))}
                        {cluster.relatedKeywords.length > 3 && (
                          <Badge variant="outline" className="text-xs bg-zinc-700/50 border-zinc-600">
                            +{cluster.relatedKeywords.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Cluster Stats */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-lg font-semibold text-white">
                          {cluster.totalSearchVolume ? `${(cluster.totalSearchVolume / 1000).toFixed(0)}K` : 'N/A'}
                        </p>
                        <p className="text-xs text-zinc-400">Volume</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-white">
                          {cluster.avgDifficulty?.toFixed(1) || 'N/A'}/10
                        </p>
                        <p className="text-xs text-zinc-400">Difficulty</p>
                      </div>
                      <div>
                        <p className={`text-lg font-semibold ${getOpportunityColor(cluster.opportunityScore)}`}>
                          {getOpportunityScore(cluster.opportunityScore)}
                        </p>
                        <p className="text-xs text-zinc-400">Opportunity</p>
                      </div>
                    </div>

                    {/* Additional details for detailed view */}
                    {detailed && (
                      <div className="pt-2 border-t border-zinc-700">
                        <div className="flex justify-between text-xs text-zinc-500">
                          <span>Keywords: {cluster.relatedKeywords.length + 1}</span>
                          <span>Created: {new Date(cluster.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}

                    {onClusterSelect && (
                      <Button
                        onClick={() => onClusterSelect(cluster)}
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        Analyze Cluster
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Cluster Insights */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Cluster Intelligence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
              <p className="text-2xl font-bold text-blue-400">{clusters.length}</p>
              <p className="text-sm text-zinc-400">Active Clusters</p>
            </div>
            <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
              <p className="text-2xl font-bold text-green-400">
                {clusters.reduce((sum, c) => sum + c.relatedKeywords.length + 1, 0)}
              </p>
              <p className="text-sm text-zinc-400">Total Keywords</p>
            </div>
            <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
              <p className="text-2xl font-bold text-purple-400">
                {Math.round(clusters.reduce((sum, c) => sum + (c.opportunityScore || 0), 0) / clusters.length * 100) || 0}%
              </p>
              <p className="text-sm text-zinc-400">Avg Opportunity</p>
            </div>
            <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
              <p className="text-2xl font-bold text-orange-400">
                {clusters.filter(c => (c.opportunityScore || 0) >= 0.7).length}
              </p>
              <p className="text-sm text-zinc-400">High-Value</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
