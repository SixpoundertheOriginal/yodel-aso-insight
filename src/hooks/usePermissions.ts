
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePermissions = () => {
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['user-permissions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (rolesError || !userRoles) return [];

      // Get permissions for those roles
      const roleNames = userRoles.map(ur => ur.role);
      if (roleNames.length === 0) return [];

      const { data: rolePermissions, error: permissionsError } = await supabase
        .from('role_permissions')
        .select('permission_name')
        .in('role', roleNames);

      if (permissionsError || !rolePermissions) return [];

      // Return unique permissions
      const allPermissions = rolePermissions.map(rp => rp.permission_name);
      return [...new Set(allPermissions)];
    },
  });

  const hasPermission = (permission: string) => {
    return permissions?.includes(permission) || false;
  };

  const hasRole = (role: string) => {
    // This would require a separate query, but for now we can check admin permissions
    return hasPermission('admin.view_all_organizations');
  };

  return {
    permissions: permissions || [],
    hasPermission,
    hasRole,
    isLoading,
    isSuperAdmin: hasPermission('admin.manage_organizations'),
    isOrgAdmin: hasPermission('admin.manage_apps') || hasPermission('admin.view_analytics'),
  };
};
