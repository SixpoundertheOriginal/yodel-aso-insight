
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface OrganizationUsage {
  organization_id: string;
  organization_name: string;
  subscription_tier: string;
  app_limit: number;
  app_limit_enforced: boolean;
  current_app_count: number;
  remaining_apps: number;
  usage_percentage: number;
  active_apps: number;
  inactive_apps: number;
}

interface AppFormData {
  app_name: string;
  platform: 'iOS' | 'Android';
  app_store_id?: string;
  bundle_id?: string;
  category?: string;
  developer_name?: string;
  app_icon_url?: string;
}

export const useAppManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get organization usage analytics
  const { data: orgUsage, isLoading: isLoadingUsage } = useQuery({
    queryKey: ['organization-usage'],
    queryFn: async () => {
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) return null;

      const { data, error } = await supabase
        .from('organization_app_usage')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .single();

      if (error) throw error;
      return data as OrganizationUsage;
    },
    enabled: !!user,
  });

  // Check if organization can add more apps
  const { data: canAddApp } = useQuery({
    queryKey: ['can-add-app', orgUsage?.organization_id],
    queryFn: async () => {
      if (!orgUsage?.organization_id) return false;

      const { data, error } = await supabase.rpc('can_add_app', {
        org_id: orgUsage.organization_id
      });

      if (error) throw error;
      return data;
    },
    enabled: !!orgUsage?.organization_id,
  });

  // Get audit logs for app changes
  const { data: auditLogs, isLoading: isLoadingAudit } = useQuery({
    queryKey: ['app-audit-logs'],
    queryFn: async () => {
      if (!user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('resource_type', 'app')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Create new app mutation
  const createAppMutation = useMutation({
    mutationFn: async (appData: AppFormData) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user!.id)
        .single();

      if (!profile?.organization_id) {
        throw new Error('No organization found');
      }

      const { data, error } = await supabase
        .from('apps')
        .insert({
          ...appData,
          organization_id: profile.organization_id,
          created_by: user!.id,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-apps'] });
      queryClient.invalidateQueries({ queryKey: ['organization-usage'] });
      queryClient.invalidateQueries({ queryKey: ['can-add-app'] });
      queryClient.invalidateQueries({ queryKey: ['app-audit-logs'] });
      toast.success('App created successfully');
    },
    onError: (error: any) => {
      console.error('Error creating app:', error);
      toast.error(error.message || 'Failed to create app');
    },
  });

  // Update app mutation
  const updateAppMutation = useMutation({
    mutationFn: async ({ id, ...appData }: AppFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('apps')
        .update(appData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-apps'] });
      queryClient.invalidateQueries({ queryKey: ['app-audit-logs'] });
      toast.success('App updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating app:', error);
      toast.error(error.message || 'Failed to update app');
    },
  });

  // Delete app mutation
  const deleteAppMutation = useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await supabase
        .from('apps')
        .delete()
        .eq('id', appId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-apps'] });
      queryClient.invalidateQueries({ queryKey: ['organization-usage'] });
      queryClient.invalidateQueries({ queryKey: ['can-add-app'] });
      queryClient.invalidateQueries({ queryKey: ['app-audit-logs'] });
      toast.success('App deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting app:', error);
      toast.error(error.message || 'Failed to delete app');
    },
  });

  // Toggle app status mutation
  const toggleAppStatusMutation = useMutation({
    mutationFn: async ({ appId, isActive }: { appId: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('apps')
        .update({ is_active: isActive })
        .eq('id', appId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-apps'] });
      queryClient.invalidateQueries({ queryKey: ['organization-usage'] });
      queryClient.invalidateQueries({ queryKey: ['can-add-app'] });
      queryClient.invalidateQueries({ queryKey: ['app-audit-logs'] });
      toast.success('App status updated');
    },
    onError: (error: any) => {
      console.error('Error updating app status:', error);
      toast.error(error.message || 'Failed to update app status');
    },
  });

  return {
    orgUsage,
    isLoadingUsage,
    canAddApp: canAddApp ?? false,
    auditLogs,
    isLoadingAudit,
    createApp: createAppMutation.mutate,
    updateApp: updateAppMutation.mutate,
    deleteApp: deleteAppMutation.mutate,
    toggleAppStatus: toggleAppStatusMutation.mutate,
    isCreating: createAppMutation.isPending,
    isUpdating: updateAppMutation.isPending,
    isDeleting: deleteAppMutation.isPending,
    isToggling: toggleAppStatusMutation.isPending,
  };
};
