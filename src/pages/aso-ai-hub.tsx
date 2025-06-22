
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/layouts';
import { AsoAiHubProvider } from '@/context/AsoAiHubContext';
import { WorkflowProvider } from '@/context/WorkflowContext';
import { CopilotGrid } from '@/components/AsoAiHub/CopilotGrid';
import { CopilotInterface } from '@/components/AsoAiHub/CopilotInterface';
import { WorkflowManager } from '@/components/AsoAiHub/WorkflowManager';
import { AppAuditHub } from '@/components/AppAudit/AppAuditHub';
import { HeroSection } from '@/components/ui/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const AsoAiHubPage: React.FC = () => {
  const navigate = useNavigate();

  // Get current user's organization
  const { data: userContext } = useQuery({
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

  return (
    <MainLayout>
      <WorkflowProvider>
        <AsoAiHubProvider>
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-4">ASO AI Hub</h1>
              <p className="text-zinc-400 text-lg max-w-3xl mx-auto">
                Your comprehensive suite of AI-powered App Store Optimization tools with intelligent workflow automation. 
                Get comprehensive app audits, metadata optimization, and competitive intelligence in one place.
              </p>
            </div>
            
            <HeroSection
              title="NEW: Unified App Audit Hub"
              subtitle="Comprehensive ASO analysis in one place"
              description="Combine metadata optimization and keyword intelligence for complete app store optimization. Import your app to get actionable insights and recommendations."
              primaryAction={{
                text: 'Start App Audit',
                onClick: () => document.getElementById('audit-tab')?.click()
              }}
            />

            {/* Main Hub Tabs */}
            <Tabs defaultValue="audit" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 bg-zinc-900 border-zinc-800">
                <TabsTrigger value="audit" id="audit-tab">App Audit Hub</TabsTrigger>
                <TabsTrigger value="copilots">AI Copilots</TabsTrigger>
              </TabsList>

              <TabsContent value="audit">
                {userContext?.organizationId ? (
                  <AppAuditHub organizationId={userContext.organizationId} />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-zinc-400">Please sign in to access the App Audit Hub</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="copilots">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <CopilotGrid />
                  </div>
                  <div>
                    <WorkflowManager />
                  </div>
                </div>
                <CopilotInterface />
              </TabsContent>
            </Tabs>
          </div>
        </AsoAiHubProvider>
      </WorkflowProvider>
    </MainLayout>
  );
};

export default AsoAiHubPage;
