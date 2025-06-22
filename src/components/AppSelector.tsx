
import React from 'react';
import { Check, ChevronDown, Smartphone } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/context/AppContext';

export const AppSelector: React.FC = () => {
  const { apps, selectedApp, setSelectedApp, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="h-4 w-4 bg-zinc-700 rounded"></div>
        <div className="h-4 w-20 bg-zinc-700 rounded"></div>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="flex items-center gap-2 text-zinc-400">
        <Smartphone className="h-4 w-4" />
        <span className="text-sm">No apps</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 h-auto">
          <Smartphone className="h-4 w-4 text-yodel-orange" />
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-white truncate max-w-32">
              {selectedApp?.app_name || 'Select App'}
            </span>
            {selectedApp && (
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs">
                  {selectedApp.platform}
                </Badge>
              </div>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {apps.map((app) => (
          <DropdownMenuItem
            key={app.id}
            onClick={() => setSelectedApp(app)}
            className="flex items-center justify-between p-3 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              {app.app_icon_url ? (
                <img 
                  src={app.app_icon_url} 
                  alt={app.app_name}
                  className="h-8 w-8 rounded-lg"
                />
              ) : (
                <div className="h-8 w-8 bg-zinc-700 rounded-lg flex items-center justify-center">
                  <Smartphone className="h-4 w-4 text-zinc-400" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-medium text-white">{app.app_name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {app.platform}
                  </Badge>
                  {app.category && (
                    <span className="text-xs text-zinc-400">{app.category}</span>
                  )}
                </div>
              </div>
            </div>
            {selectedApp?.id === app.id && (
              <Check className="h-4 w-4 text-yodel-orange" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
