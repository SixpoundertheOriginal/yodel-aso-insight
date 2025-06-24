
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DiscoveredApp {
  id: string;
  app_identifier: string;
  app_name: string;
  record_count: number;
  first_seen: string;
  last_seen: string;
  days_with_data: number;
  discovered_date: string;
  approval_status: 'pending' | 'approved' | 'rejected';
}

interface ApprovedApp {
  id: string;
  app_identifier: string;
  app_name: string;
  approval_status: string;
  approved_date: string;
  approved_by: string | null;
  app_metadata: any;
}

interface AppDiscoveryResult {
  success: boolean;
  discoveredApps: number;
  apps: any[];
}

export const useAppDiscovery = (organizationId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get pending apps
  const { data: pendingApps, isLoading: loadingPending } = useQuery({
    queryKey: ['pendingApps', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pending_app_discoveries', {
        p_organization_id: organizationId
      });

      if (error) throw error;
      return data as DiscoveredApp[];
    },
    enabled: !!organizationId
  });

  // Get approved apps
  const { data: approvedApps, isLoading: loadingApproved } = useQuery({
    queryKey: ['approvedApps', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_apps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('approval_status', 'approved')
        .order('approved_date', { ascending: false });

      if (error) throw error;
      return data as ApprovedApp[];
    },
    enabled: !!organizationId
  });

  // Discovery mutation
  const discoveryMutation = useMutation({
    mutationFn: async (): Promise<AppDiscoveryResult> => {
      const { data, error } = await supabase.functions.invoke('app-discovery', {
        body: {
          organizationId,
          action: 'discover'
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Apps discovered successfully",
        description: `Found ${data.discoveredApps} apps from BigQuery data.`
      });
      queryClient.invalidateQueries({ queryKey: ['pendingApps'] });
    },
    onError: (error: any) => {
      toast({
        title: "Discovery failed",
        description: error.message || "Failed to discover apps from BigQuery",
        variant: "destructive"
      });
    }
  });

  // Approval mutation
  const approvalMutation = useMutation({
    mutationFn: async ({ appId, action }: { appId: string; action: 'approve' | 'reject' }) => {
      const { data, error } = await supabase.functions.invoke('app-discovery', {
        body: {
          organizationId,
          action,
          appId
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: `App ${variables.action}d successfully`,
        description: `The app has been ${variables.action}d and ${variables.action === 'approve' ? 'will now appear in your dashboard' : 'will not appear in your dashboard'}.`
      });
      queryClient.invalidateQueries({ queryKey: ['pendingApps'] });
      queryClient.invalidateQueries({ queryKey: ['approvedApps'] });
      // Invalidate dashboard data to refresh with new approved apps
      queryClient.invalidateQueries({ queryKey: ['asoData'] });
    },
    onError: (error: any) => {
      toast({
        title: "Operation failed",
        description: error.message || "Failed to update app approval status",
        variant: "destructive"
      });
    }
  });

  return {
    pendingApps: pendingApps || [],
    approvedApps: approvedApps || [],
    isLoading: loadingPending || loadingApproved,
    discoverApps: () => discoveryMutation.mutate(),
    approveApp: (appId: string) => approvalMutation.mutate({ appId, action: 'approve' }),
    rejectApp: (appId: string) => approvalMutation.mutate({ appId, action: 'reject' }),
    isDiscovering: discoveryMutation.isPending,
    isUpdating: approvalMutation.isPending
  };
};
