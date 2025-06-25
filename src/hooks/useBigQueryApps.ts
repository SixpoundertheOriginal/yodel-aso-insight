
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BigQueryApp {
  id: string;
  app_identifier: string;
  app_name?: string;
  data_source: 'bigquery';
  approval_status: 'approved';
  app_metadata?: any;
}

export const useBigQueryApps = (organizationId?: string) => {
  return useQuery({
    queryKey: ['bigquery-apps', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      const { data, error } = await supabase
        .from('organization_apps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('data_source', 'bigquery')
        .eq('approval_status', 'approved')
        .order('app_identifier');

      if (error) {
        console.error('Error fetching BigQuery apps:', error);
        throw error;
      }

      return (data || []).map((app): BigQueryApp => ({
        id: app.id,
        app_identifier: app.app_identifier,
        app_name: app.app_name || app.app_identifier,
        data_source: 'bigquery' as const,
        approval_status: 'approved' as const,
        app_metadata: app.app_metadata
      }));
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
