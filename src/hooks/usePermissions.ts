
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePermissions = () => {
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['userPermissions'],
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get user profile and roles
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return null;

      // Get user roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role, organization_id')
        .eq('user_id', user.id);

      const roles = userRoles?.map(r => r.role) || [];
      const organizationRoles = userRoles?.filter(r => r.organization_id === profile.organization_id).map(r => r.role) || [];

      // Define permission list based on roles
      const permissionsList = [];
      if (roles.includes('SUPER_ADMIN')) {
        permissionsList.push('admin.manage_all', 'admin.approve_apps', 'admin.manage_apps', 'admin.view_audit_logs');
      }
      if (organizationRoles.includes('ORGANIZATION_ADMIN') || roles.includes('SUPER_ADMIN')) {
        permissionsList.push('admin.manage_apps', 'admin.approve_apps', 'admin.view_org_data');
      }

      return {
        userId: user.id,
        organizationId: profile.organization_id,
        roles,
        organizationRoles,
        permissions: permissionsList,
        isSuperAdmin: roles.includes('SUPER_ADMIN'),
        isOrganizationAdmin: organizationRoles.includes('ORGANIZATION_ADMIN') || roles.includes('SUPER_ADMIN'),
        canManageApps: organizationRoles.includes('ORGANIZATION_ADMIN') || roles.includes('SUPER_ADMIN'),
        canApproveApps: organizationRoles.includes('ORGANIZATION_ADMIN') || roles.includes('SUPER_ADMIN')
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    ...permissions,
    isLoading,
    permissions: permissions?.permissions || [],
    isSuperAdmin: permissions?.isSuperAdmin || false,
    isOrganizationAdmin: permissions?.isOrganizationAdmin || false,
    canManageApps: permissions?.canManageApps || false,
    canApproveApps: permissions?.canApproveApps || false,
  };
};
