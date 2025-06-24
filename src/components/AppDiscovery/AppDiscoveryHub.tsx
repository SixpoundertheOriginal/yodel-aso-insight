
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PendingAppsTable } from './PendingAppsTable';
import { ApprovedAppsTable } from './ApprovedAppsTable';
import { useAppDiscovery } from '@/hooks/useAppDiscovery';
import { useApp } from '@/context/AppContext';
import { Search, RefreshCw, Database, CheckCircle, Clock } from 'lucide-react';

export const AppDiscoveryHub: React.FC = () => {
  // Get organization ID from user profile/context
  const organizationId = "yodel_pimsleur"; // This should come from auth context
  
  const {
    pendingApps,
    approvedApps,
    isLoading,
    discoverApps,
    approveApp,
    rejectApp,
    isDiscovering,
    isUpdating
  } = useAppDiscovery(organizationId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">App Discovery</h1>
          <p className="text-zinc-400">Loading app discovery data...</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-zinc-800 animate-pulse rounded-md"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">App Discovery</h1>
        <p className="text-zinc-400">
          Discover apps from your BigQuery data and approve them for dashboard access.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Pending Apps</CardTitle>
            <Clock className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{pendingApps.length}</div>
            <p className="text-xs text-zinc-500">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Approved Apps</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{approvedApps.length}</div>
            <p className="text-xs text-zinc-500">Active in dashboard</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Data Source</CardTitle>
            <Database className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">BigQuery</div>
            <p className="text-xs text-zinc-500">Live integration</p>
          </CardContent>
        </Card>
      </div>

      {/* Discovery Action */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Search className="h-5 w-5" />
            BigQuery App Discovery
          </CardTitle>
          <CardDescription>
            Scan your BigQuery data to discover apps that aren't yet registered in your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={discoverApps}
            disabled={isDiscovering}
            className="bg-yodel-orange hover:bg-orange-600 disabled:bg-zinc-700"
          >
            {isDiscovering ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Scanning BigQuery...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Scan BigQuery for Apps
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Pending Apps */}
      {pendingApps.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Pending App Approvals</CardTitle>
            <CardDescription>
              Apps discovered from BigQuery that need your approval to appear in the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PendingAppsTable 
              apps={pendingApps}
              onApprove={approveApp}
              onReject={rejectApp}
              isUpdating={isUpdating}
            />
          </CardContent>
        </Card>
      )}

      {/* Approved Apps */}
      {approvedApps.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Approved Apps</CardTitle>
            <CardDescription>
              Apps that are approved and active in your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApprovedAppsTable apps={approvedApps} />
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {pendingApps.length === 0 && approvedApps.length === 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-12 text-center">
            <Database className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Apps Discovered Yet</h3>
            <p className="text-zinc-400 mb-4">
              Click "Scan BigQuery for Apps" to discover apps from your BigQuery data.
            </p>
            <Button 
              onClick={discoverApps}
              disabled={isDiscovering}
              className="bg-yodel-orange hover:bg-orange-600"
            >
              <Search className="h-4 w-4 mr-2" />
              Start Discovery
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
