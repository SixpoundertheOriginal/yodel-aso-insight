
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, Lightbulb, ArrowRight } from 'lucide-react';

export type InsightType = 'anomaly' | 'trend' | 'recommendation';
export type InsightPriority = 'high' | 'medium' | 'low';

export interface Insight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  metric?: string;
  value?: number;
  confidence: number;
  actionable?: boolean;
}

interface InsightCardProps {
  insight: Insight;
  onAction?: (insight: Insight) => void;
  className?: string;
}

export const InsightCard: React.FC<InsightCardProps> = ({
  insight,
  onAction,
  className = ''
}) => {
  const getInsightIcon = (type: InsightType) => {
    switch (type) {
      case 'anomaly':
        return <AlertTriangle className="h-4 w-4" />;
      case 'trend':
        return <TrendingUp className="h-4 w-4" />;
      case 'recommendation':
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: InsightType, priority: InsightPriority) => {
    if (priority === 'high') return 'destructive';
    if (type === 'recommendation') return 'default';
    if (type === 'trend') return 'secondary';
    return 'outline';
  };

  const getPriorityColor = (priority: InsightPriority) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/10';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10';
      case 'low': return 'text-green-400 bg-green-500/10';
    }
  };

  return (
    <Card className={`bg-zinc-900/50 border-zinc-800 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={getInsightColor(insight.type, insight.priority)} className="flex items-center gap-1">
              {getInsightIcon(insight.type)}
              <span className="capitalize">{insight.type}</span>
            </Badge>
            <Badge variant="outline" className={getPriorityColor(insight.priority)}>
              {insight.priority.toUpperCase()}
            </Badge>
          </div>
          <div className="text-xs text-zinc-400">
            {Math.round(insight.confidence)}% confidence
          </div>
        </div>
        <CardTitle className="text-white text-base font-medium">
          {insight.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-zinc-300 text-sm mb-4">
          {insight.description}
        </p>
        
        {insight.metric && insight.value && (
          <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-400 uppercase tracking-wide mb-1">
              {insight.metric}
            </div>
            <div className="text-lg font-bold text-white">
              {typeof insight.value === 'number' ? insight.value.toLocaleString() : insight.value}
            </div>
          </div>
        )}

        {insight.actionable && onAction && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onAction(insight)}
            className="w-full flex items-center gap-2"
          >
            Take Action
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
