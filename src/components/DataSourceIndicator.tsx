
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Database, TestTube, AlertTriangle, Loader2 } from 'lucide-react';
import { CurrentDataSource } from '@/hooks/useAsoDataWithFallback';

interface DataSourceIndicatorProps {
  currentDataSource: CurrentDataSource | null;
  dataSourceStatus: 'loading' | 'bigquery-success' | 'bigquery-failed-fallback' | 'mock-only';
}

export const DataSourceIndicator: React.FC<DataSourceIndicatorProps> = ({
  currentDataSource,
  dataSourceStatus
}) => {
  const getIndicatorConfig = () => {
    switch (dataSourceStatus) {
      case 'loading':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: 'Loading...',
          variant: 'secondary' as const,
          tooltip: 'Loading data from BigQuery...'
        };
      
      case 'bigquery-success':
        return {
          icon: <Database className="h-3 w-3" />,
          text: 'Live Data',
          variant: 'default' as const,
          tooltip: 'Data from BigQuery (Live ASO metrics)'
        };
      
      case 'bigquery-failed-fallback':
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          text: 'Demo Data',
          variant: 'destructive' as const,
          tooltip: 'BigQuery unavailable - showing demo data'
        };
      
      case 'mock-only':
        return {
          icon: <TestTube className="h-3 w-3" />,
          text: 'Demo Data',
          variant: 'outline' as const,
          tooltip: 'Demo data mode (for testing)'
        };
      
      default:
        return {
          icon: <TestTube className="h-3 w-3" />,
          text: 'Unknown',
          variant: 'secondary' as const,
          tooltip: 'Data source unknown'
        };
    }
  };

  const config = getIndicatorConfig();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className="flex items-center gap-1">
            {config.icon}
            <span className="text-xs font-medium">{config.text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
