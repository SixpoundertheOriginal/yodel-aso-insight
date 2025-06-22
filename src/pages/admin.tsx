
import React from 'react';
import { MainLayout } from '@/layouts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';

const AdminPage: React.FC = () => {
  const { isSuperAdmin, isLoading: permissionsLoading } = usePermissions();

  const { data: systemStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-system-stats'],
    queryFn: async () => {
      const [orgsResult, usersResult, appsResult] = await Promise.all([
        supabase.from('organizations').select('id, name, subscription_tier', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('apps').select('id, app_name, platform', { count: 'exact' })
      ]);

      return {
        organizations: orgsResult.data || [],
        organizationCount: orgsResult.count || 0,
        userCount: usersResult.count || 0,
        apps: appsResult.data || [],
        appCount: appsResult.count || 0,
      };
    },
    enabled: isSuperAdmin,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('id, action, resource_type, created_at, profiles(email)')
        .order('created_at', { ascending: false })
        .limit(10);

      return data || [];
    },
    enabled: isSuperAdmin,
  });

  if (permissionsLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-400">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-zinc-400">
            System administration and management
          </p>
        </div>

        {statsLoading ? (
          <div className="text-zinc-400">Loading system statistics...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-300">Organizations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{systemStats?.organizationCount}</div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-300">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{systemStats?.userCount}</div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-300">Total Apps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{systemStats?.appCount}</div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-300">System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">Good</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">Organizations</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Manage platform organizations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {systemStats?.organizations.map((org) => (
                      <div key={org.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{org.name}</p>
                        </div>
                        <Badge variant="secondary" className="bg-zinc-700 text-zinc-300">
                          {org.subscription_tier}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">Recent Activity</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Latest system activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivity?.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                        <div>
                          <p className="text-white text-sm">{activity.action}</p>
                          <p className="text-zinc-400 text-xs">{activity.resource_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-zinc-400 text-xs">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default AdminPage;
