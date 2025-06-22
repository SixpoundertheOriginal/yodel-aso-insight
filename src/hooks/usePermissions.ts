
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePermissions = () => {
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['user-permissions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get user roles and their permissions
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select(`
          role,
          role_permissions!inner(permission_name)
        `)
        .eq('user_id', user.id);

      if (!userRoles) return [];

      // Flatten permissions from all roles
      const allPermissions = userRoles.flatMap(role => 
        role.role_permissions.map(rp => rp.permission_name)
      );

      return [...new Set(allPermissions)]; // Remove duplicates
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
