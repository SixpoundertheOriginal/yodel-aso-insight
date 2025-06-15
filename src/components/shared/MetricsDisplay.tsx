
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface Metric {
  label: string;
  value: number | string;
  type: 'score' | 'count' | 'percentage' | 'text';
  color?: 'green' | 'yellow' | 'red' | 'blue';
  description?: string;
}

interface MetricsDisplayProps {
  title: string;
  metrics: Metric[];
  layout?: 'grid' | 'list';
  className?: string;
}

export const MetricsDisplay: React.FC<MetricsDisplayProps> = ({
  title,
  metrics,
  layout = 'grid',
  className = ''
}) => {
  const getColorClass = (color?: string, type: 'bg' | 'text' = 'bg') => {
    const prefix = type === 'bg' ? 'bg-' : 'text-';
    switch (color) {
      case 'green': return `${prefix}green-500`;
      case 'yellow': return `${prefix}yellow-500`;
      case 'red': return `${prefix}red-500`;
      case 'blue': return `${prefix}blue-500`;
      default: return `${prefix}zinc-400`;
    }
  };

  const renderMetric = (metric: Metric, index: number) => {
    const isScore = metric.type === 'score' || metric.type === 'percentage';
    const numericValue = typeof metric.value === 'number' ? metric.value : 0;

    return (
      <div key={index} className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-300">{metric.label}</span>
          <span className={`font-semibold ${getColorClass(metric.color, 'text')}`}>
            {metric.value}{metric.type === 'percentage' ? '%' : ''}
          </span>
        </div>
        
        {isScore && (
          <Progress 
            value={numericValue} 
            className="h-2"
          />
        )}
        
        {metric.description && (
          <p className="text-xs text-zinc-500">{metric.description}</p>
        )}
      </div>
    );
  };

  return (
    <Card className={`bg-zinc-900/50 border-zinc-800 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={
          layout === 'grid' 
            ? `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
            : `space-y-4`
        }>
          {metrics.map(renderMetric)}
        </div>
      </CardContent>
    </Card>
  );
};
