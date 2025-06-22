
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Plus, Edit3, Trash2, ToggleLeft, User } from 'lucide-react';
import { useAppManagement } from '@/hooks/useAppManagement';
import { formatDistanceToNow } from 'date-fns';

export const AuditLogViewer: React.FC = () => {
  const { auditLogs, isLoadingAudit } = useAppManagement();

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'UPDATE':
        return <Edit3 className="h-4 w-4 text-blue-500" />;
      case 'DELETE':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'UPDATE':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'DELETE':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'Created';
      case 'UPDATE':
        return 'Updated';
      case 'DELETE':
        return 'Deleted';
      default:
        return action;
    }
  };

  if (isLoadingAudit) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-yodel-orange" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                <div className="h-8 w-8 bg-zinc-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-zinc-700 rounded w-3/4"></div>
                  <div className="h-3 bg-zinc-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-yodel-orange" />
          Activity Log
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Recent app management activities in your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {auditLogs && auditLogs.length > 0 ? (
            <div className="space-y-3">
              {auditLogs.map((log) => {
                const details = log.details as any;
                const appName = details?.app_name || details?.new?.app_name || details?.old?.app_name || 'Unknown App';
                const platform = details?.platform || details?.new?.platform || details?.old?.platform;
                
                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      {getActionIcon(log.action)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={getActionColor(log.action)}>
                          {getActionLabel(log.action)}
                        </Badge>
                        {platform && (
                          <Badge variant="secondary" className="bg-zinc-700 text-zinc-300">
                            {platform}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-white font-medium truncate">
                        {appName}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                        <User className="h-3 w-3" />
                        <span>User ID: {log.user_id?.slice(0, 8)}...</span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      
                      {log.action === 'UPDATE' && details?.old && details?.new && (
                        <div className="mt-2 text-xs text-zinc-500">
                          {Object.keys(details.new).filter(key => 
                            details.old[key] !== details.new[key] && key !== 'updated_at'
                          ).map(key => (
                            <div key={key} className="truncate">
                              {key}: {details.old[key]} → {details.new[key]}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <div className="text-zinc-400">No activity logs found</div>
              <div className="text-sm text-zinc-500 mt-1">
                App management activities will appear here
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
