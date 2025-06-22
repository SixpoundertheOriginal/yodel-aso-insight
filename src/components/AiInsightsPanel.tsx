
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Brain, Sparkles } from 'lucide-react';
import { InsightCard, Insight } from './InsightCard';
import { useAsoInsights } from '../hooks/useAsoInsights';

interface AiInsightsPanelProps {
  className?: string;
  maxDisplayed?: number;
}

export const AiInsightsPanel: React.FC<AiInsightsPanelProps> = ({
  className = '',
  maxDisplayed = 3
}) => {
  const { insights, loading, hasInsights } = useAsoInsights();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const displayedInsights = isExpanded ? insights : insights.slice(0, maxDisplayed);
  const hasMoreInsights = insights.length > maxDisplayed;

  const handleInsightAction = (insight: Insight) => {
    console.log('Insight action triggered:', insight);
    // TODO: Implement specific actions based on insight type
    // This could open modals, navigate to specific pages, etc.
  };

  if (loading) {
    return (
      <Card className={`bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700 ${className}`}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-400 animate-pulse" />
            <CardTitle className="text-white">AI Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-zinc-800 animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasInsights) {
    return (
      <Card className={`bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700 ${className}`}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-white">AI Insights</CardTitle>
            <Badge variant="outline" className="text-zinc-400">
              No actionable insights
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Sparkles className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
            <p className="text-zinc-400 text-sm">
              All metrics are within normal ranges. Check back as more data becomes available.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gradient-to-r from-zinc-900 via-zinc-900 to-blue-900/20 border-zinc-700 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-white">AI Insights</CardTitle>
            <Badge variant="default" className="bg-blue-600 text-white">
              {insights.length} insights
            </Badge>
          </div>
          
          {hasMoreInsights && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      View All ({insights.length})
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedInsights.slice(0, maxDisplayed).map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onAction={handleInsightAction}
            />
          ))}
        </div>
        
        {hasMoreInsights && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {insights.slice(maxDisplayed).map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onAction={handleInsightAction}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
};
