
import React from 'react';
import { MainLayout } from '@/layouts';
import { AdvancedKeywordIntelligence } from '@/components/KeywordIntelligence';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Smartphone } from 'lucide-react';

const KeywordIntelligencePage: React.FC = () => {
  const { selectedApp, isLoading: isLoadingApps } = useApp();

  // Get current user's organization
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

      return {
        organizationId: profile?.organization_id || null
      };
    },
  });

  if (isLoading || isLoadingApps) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-400">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  if (!userContext?.organizationId) {
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

  if (!selectedApp) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Keyword Intelligence</h1>
            <p className="text-zinc-400">
              Advanced keyword analysis with competitor gap analysis, search volume trends, and difficulty scoring
            </p>
          </div>
          
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-12 text-center">
              <Smartphone className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No App Selected</h3>
              <p className="text-zinc-400 mb-4">
                Please select an app from the app selector in the top bar to view keyword intelligence.
              </p>
            </CardContent>
          </Card>
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
            Advanced keyword analysis with competitor gap analysis, search volume trends, and difficulty scoring for{' '}
            <span className="text-yodel-orange font-medium">{selectedApp.app_name}</span>
          </p>
        </div>
        
        <AdvancedKeywordIntelligence
          organizationId={userContext.organizationId}
          targetAppId={selectedApp.id}
        />
      </div>
    </MainLayout>
  );
};

export default KeywordIntelligencePage;
