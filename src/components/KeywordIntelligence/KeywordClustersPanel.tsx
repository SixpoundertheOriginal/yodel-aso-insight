
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Network, Target, TrendingUp, Users } from 'lucide-react';
import { KeywordCluster } from '@/services/competitor-keyword-analysis.service';

interface KeywordClustersPanelProps {
  clusters: KeywordCluster[];
  onClusterSelect: (cluster: KeywordCluster) => void;
}

export const KeywordClustersPanel: React.FC<KeywordClustersPanelProps> = ({
  clusters,
  onClusterSelect
}) => {
  const getClusterTypeIcon = (type: string | null) => {
    switch (type) {
      case 'semantic': return <Network className="w-4 h-4" />;
      case 'category': return <Target className="w-4 h-4" />;
      case 'intent': return <TrendingUp className="w-4 h-4" />;
      case 'competitor': return <Users className="w-4 h-4" />;
      default: return <Network className="w-4 h-4" />;
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

  // Generate mock clusters if none exist
  const mockClusters: KeywordCluster[] = clusters.length > 0 ? clusters : [
    {
      id: '1',
      clusterName: 'Fitness Tracking',
      primaryKeyword: 'fitness tracker',
      relatedKeywords: ['workout tracker', 'exercise monitor', 'activity tracker', 'health tracker'],
      clusterType: 'semantic',
      totalSearchVolume: 85000,
      avgDifficulty: 6.2,
      opportunityScore: 0.75,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      clusterName: 'Diet & Nutrition',
      primaryKeyword: 'calorie counter',
      relatedKeywords: ['diet tracker', 'nutrition app', 'food diary', 'meal planner'],
      clusterType: 'category',
      totalSearchVolume: 62000,
      avgDifficulty: 5.8,
      opportunityScore: 0.65,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '3',
      clusterName: 'Mindfulness',
      primaryKeyword: 'meditation app',
      relatedKeywords: ['mindfulness app', 'breathing exercise', 'stress relief', 'yoga app'],
      clusterType: 'intent',
      totalSearchVolume: 45000,
      avgDifficulty: 4.5,
      opportunityScore: 0.82,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '4',
      clusterName: 'Competitor Keywords',
      primaryKeyword: 'gym workout',
      relatedKeywords: ['strength training', 'muscle building', 'bodybuilding app', 'weight lifting'],
      clusterType: 'competitor',
      totalSearchVolume: 38000,
      avgDifficulty: 7.1,
      opportunityScore: 0.45,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Network className="w-5 h-5 text-blue-400" />
            <span>Keyword Clusters</span>
          </CardTitle>
          <p className="text-zinc-400 text-sm">
            Semantic groupings of related keywords to help identify content themes and optimization opportunities.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockClusters.map((cluster) => (
              <Card key={cluster.id} className="bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
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
                        <p className="text-xs text-zinc-400">Total Volume</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-white">
                          {cluster.avgDifficulty?.toFixed(1) || 'N/A'}/10
                        </p>
                        <p className="text-xs text-zinc-400">Avg Difficulty</p>
                      </div>
                      <div>
                        <p className={`text-lg font-semibold ${getOpportunityColor(cluster.opportunityScore)}`}>
                          {getOpportunityScore(cluster.opportunityScore)}
                        </p>
                        <p className="text-xs text-zinc-400">Opportunity</p>
                      </div>
                    </div>

                    <Button
                      onClick={() => onClusterSelect(cluster)}
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Analyze Cluster
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cluster Insights */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Cluster Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
              <p className="text-2xl font-bold text-blue-400">{mockClusters.length}</p>
              <p className="text-sm text-zinc-400">Active Clusters</p>
            </div>
            <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
              <p className="text-2xl font-bold text-green-400">
                {mockClusters.reduce((sum, c) => sum + c.relatedKeywords.length, 0)}
              </p>
              <p className="text-sm text-zinc-400">Total Keywords</p>
            </div>
            <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
              <p className="text-2xl font-bold text-purple-400">
                {Math.round(mockClusters.reduce((sum, c) => sum + (c.opportunityScore || 0), 0) / mockClusters.length * 100)}%
              </p>
              <p className="text-sm text-zinc-400">Avg Opportunity</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
