
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Users, Star, Target } from 'lucide-react';
import { CompetitorData } from '@/types/aso';

interface MarketPositionWidgetProps {
  competitors: CompetitorData[];
  currentApp?: {
    name: string;
    category?: string;
    rating?: number;
  };
}

export const MarketPositionWidget: React.FC<MarketPositionWidgetProps> = ({
  competitors,
  currentApp
}) => {
  // Calculate market insights
  const avgRating = competitors.reduce((sum, comp) => sum + (comp.rating || 0), 0) / competitors.length;
  const categoryLeader = competitors.reduce((leader, comp) => 
    (comp.rating || 0) > (leader.rating || 0) ? comp : leader, competitors[0]);
  
  const marketSaturation = Math.min((competitors.length / 20) * 100, 100);
  const opportunityScore = Math.max(0, 100 - marketSaturation);

  const getPositioningInsights = () => {
    const insights = [];
    
    if (avgRating < 4.0) {
      insights.push({
        type: 'opportunity',
        text: 'Market has room for quality improvement',
        icon: TrendingUp,
        color: 'text-green-500'
      });
    }
    
    if (marketSaturation < 50) {
      insights.push({
        type: 'opportunity',
        text: 'Low competition - good entry opportunity',
        icon: Target,
        color: 'text-blue-500'
      });
    } else if (marketSaturation > 80) {
      insights.push({
        type: 'warning',
        text: 'Highly competitive market',
        icon: Users,
        color: 'text-red-500'
      });
    }
    
    if (categoryLeader && categoryLeader.rating && categoryLeader.rating > 4.5) {
      insights.push({
        type: 'info',
        text: `Strong category leader: ${categoryLeader.title || categoryLeader.name}`,
        icon: Star,
        color: 'text-yellow-500'
      });
    }
    
    return insights;
  };

  const insights = getPositioningInsights();

  return (
    <div className="space-y-4">
      {/* Market Overview */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Target className="w-5 h-5 mr-2 text-purple-500" />
            Market Position
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Market Saturation</span>
                <span className="text-white">{Math.round(marketSaturation)}%</span>
              </div>
              <Progress value={marketSaturation} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Opportunity Score</span>
                <span className="text-white">{Math.round(opportunityScore)}%</span>
              </div>
              <Progress value={opportunityScore} className="h-2" />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-zinc-800">
            <div className="text-center">
              <div className="text-xl font-bold text-white">{competitors.length}</div>
              <div className="text-xs text-zinc-400">Competitors</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white">{avgRating.toFixed(1)}</div>
              <div className="text-xs text-zinc-400">Avg Rating</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white">
                {currentApp?.category || 'Mixed'}
              </div>
              <div className="text-xs text-zinc-400">Category</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Positioning Insights */}
      {insights.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">Strategic Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map((insight, index) => {
                const IconComponent = insight.icon;
                return (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-zinc-800/50 rounded-lg">
                    <IconComponent className={`w-4 h-4 ${insight.color}`} />
                    <span className="text-sm text-zinc-300 flex-1">{insight.text}</span>
                    <Badge variant="outline" className="text-xs">
                      {insight.type}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Performers */}
      {categoryLeader && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">Category Leader</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">
                  {categoryLeader.title || categoryLeader.name}
                </div>
                <div className="text-sm text-zinc-400">
                  {categoryLeader.developer || 'Unknown Developer'}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-white font-medium">
                    {categoryLeader.rating?.toFixed(1) || 'N/A'}
                  </span>
                </div>
                <div className="text-xs text-zinc-400">
                  {categoryLeader.reviewCount ? `${categoryLeader.reviewCount} reviews` : ''}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
