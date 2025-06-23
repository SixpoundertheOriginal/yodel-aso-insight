
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, ArrowLeft } from 'lucide-react';
import { ScrapedMetadata } from '@/types/aso';

interface AppHeaderProps {
  app: ScrapedMetadata;
  onRefresh?: () => void;
  onExport?: () => void;
  onBack?: () => void;
  isRefreshing?: boolean;
  lastUpdated?: Date | null;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  app,
  onRefresh,
  onExport,
  onBack,
  isRefreshing = false,
  lastUpdated
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {onBack && (
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        
        {app.icon && (
          <img 
            src={app.icon} 
            alt={app.name}
            className="w-16 h-16 rounded-xl"
          />
        )}
        
        <div>
          <h1 className="text-2xl font-bold text-white">{app.name}</h1>
          <p className="text-zinc-400">
            {app.applicationCategory} • {app.locale}
            {lastUpdated && (
              <span className="ml-2 text-zinc-500 text-sm">
                • Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {onRefresh && (
          <Button
            onClick={onRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        )}
        
        {onExport && (
          <Button
            onClick={onExport}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </div>
    </div>
  );
};
