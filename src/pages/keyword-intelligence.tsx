
import React from 'react';
import { MainLayout } from '@/layouts';
import { AdvancedKeywordIntelligence } from '@/components/KeywordIntelligence';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const KeywordIntelligencePage: React.FC = () => {
  // Get current user's organization and a demo app
  const { data: userContext, isLoading } = useQuery({
    queryKey: ['user-context'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) return null;

      // Get first app for this organization
      const { data: apps } = await supabase
        .from('apps')
        .select('id, app_name')
        .eq('organization_id', profile.organization_id)
        .limit(1);

      return {
        organizationId: profile.organization_id,
        targetAppId: apps?.[0]?.id || 'demo-app',
        appName: apps?.[0]?.app_name || 'Demo App'
      };
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-400">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  if (!userContext) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Keyword Intelligence</h1>
            <p className="text-zinc-400">
              Please sign in to access keyword intelligence features
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Keyword Intelligence</h1>
          <p className="text-zinc-400">
            Advanced keyword analysis with competitor gap analysis, search volume trends, and difficulty scoring for {userContext.appName}
          </p>
        </div>
        
        <AdvancedKeywordIntelligence
          organizationId={userContext.organizationId}
          targetAppId={userContext.targetAppId}
        />
      </div>
    </MainLayout>
  );
};

export default KeywordIntelligencePage;
