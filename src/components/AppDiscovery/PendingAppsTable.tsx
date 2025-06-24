
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Check, X, Database, Calendar, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';

interface PendingApp {
  id: string;
  app_identifier: string;
  app_name: string;
  record_count: number;
  first_seen: string;
  last_seen: string;
  days_with_data: number;
  discovered_date: string;
}

interface PendingAppsTableProps {
  apps: PendingApp[];
  onApprove: (appId: string) => void;
  onReject: (appId: string) => void;
  isUpdating: boolean;
}

export const PendingAppsTable: React.FC<PendingAppsTableProps> = ({
  apps,
  onApprove,
  onReject,
  isUpdating
}) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-4">
      {apps.map((app) => (
        <Card key={app.id} className="bg-zinc-800/50 border-zinc-700">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                {/* App Header */}
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-zinc-700 rounded-lg flex items-center justify-center">
                    <Database className="h-6 w-6 text-zinc-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{app.app_identifier}</h3>
                    <p className="text-sm text-zinc-400">BigQuery Client ID</p>
                  </div>
                  <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                    Pending Approval
                  </Badge>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4 text-zinc-400" />
                    <span className="text-zinc-400">Records:</span>
                    <span className="text-white font-medium">{formatNumber(app.record_count)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-zinc-400" />
                    <span className="text-zinc-400">Days:</span>
                    <span className="text-white font-medium">{app.days_with_data}</span>
                  </div>

                  <div className="text-sm">
                    <span className="text-zinc-400">First seen:</span>
                    <span className="text-white font-medium ml-2">
                      {format(new Date(app.first_seen), 'MMM dd, yyyy')}
                    </span>
                  </div>

                  <div className="text-sm">
                    <span className="text-zinc-400">Last seen:</span>
                    <span className="text-white font-medium ml-2">
                      {format(new Date(app.last_seen), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>

                {/* Discovery Info */}
                <div className="text-xs text-zinc-500">
                  Discovered on {format(new Date(app.discovered_date), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 ml-4">
                <Button
                  onClick={() => onApprove(app.id)}
                  disabled={isUpdating}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  onClick={() => onReject(app.id)}
                  disabled={isUpdating}
                  size="sm"
                  variant="outline"
                  className="border-red-600 text-red-400 hover:bg-red-600/10"
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
