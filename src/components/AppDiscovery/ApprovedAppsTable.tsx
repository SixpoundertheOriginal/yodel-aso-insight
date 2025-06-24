
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Database, Calendar, BarChart3, User } from 'lucide-react';
import { format } from 'date-fns';

interface ApprovedApp {
  id: string;
  app_identifier: string;
  app_name: string;
  approval_status: string;
  approved_date: string;
  approved_by: string | null;
  app_metadata: any;
}

interface ApprovedAppsTableProps {
  apps: ApprovedApp[];
}

export const ApprovedAppsTable: React.FC<ApprovedAppsTableProps> = ({ apps }) => {
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
                    <p className="text-sm text-zinc-400">Active in Dashboard</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approved
                  </Badge>
                </div>

                {/* Metrics */}
                {app.app_metadata && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {app.app_metadata.record_count && (
                      <div className="flex items-center gap-2 text-sm">
                        <BarChart3 className="h-4 w-4 text-zinc-400" />
                        <span className="text-zinc-400">Records:</span>
                        <span className="text-white font-medium">
                          {formatNumber(app.app_metadata.record_count)}
                        </span>
                      </div>
                    )}
                    
                    {app.app_metadata.days_with_data && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-zinc-400" />
                        <span className="text-zinc-400">Days:</span>
                        <span className="text-white font-medium">{app.app_metadata.days_with_data}</span>
                      </div>
                    )}

                    {app.app_metadata.first_seen && (
                      <div className="text-sm">
                        <span className="text-zinc-400">First seen:</span>
                        <span className="text-white font-medium ml-2">
                          {format(new Date(app.app_metadata.first_seen), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}

                    {app.app_metadata.last_seen && (
                      <div className="text-sm">
                        <span className="text-zinc-400">Last seen:</span>
                        <span className="text-white font-medium ml-2">
                          {format(new Date(app.app_metadata.last_seen), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Approval Info */}
                <div className="text-xs text-zinc-500 flex items-center gap-4">
                  <span>
                    Approved on {format(new Date(app.approved_date), 'MMM dd, yyyy HH:mm')}
                  </span>
                  {app.approved_by && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      by Admin
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
