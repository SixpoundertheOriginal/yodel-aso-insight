
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
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Zap, Target } from 'lucide-react';

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
            {/* Enhanced Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Brain className="h-12 w-12 text-yodel-orange" />
                <h1 className="text-4xl font-bold text-white">ASO AI Hub</h1>
                <Badge variant="outline" className="text-yodel-orange border-yodel-orange">
                  Professional
                </Badge>
              </div>
              <p className="text-zinc-400 text-lg max-w-4xl mx-auto leading-relaxed">
                Your comprehensive suite of AI-powered App Store Optimization tools with intelligent workflow automation. 
                Analyze, optimize, and scale your ASO strategy with professional-grade insights.
              </p>
            </div>
            
            {/* Quick Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Target className="h-5 w-5 text-blue-400" />
                  <span className="text-white font-medium">Quick Analysis</span>
                </div>
                <p className="text-sm text-zinc-400">Fast app audits and insights</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  <span className="text-white font-medium">AI Copilots</span>
                </div>
                <p className="text-sm text-zinc-400">Specialized optimization tools</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Zap className="h-5 w-5 text-yodel-orange" />
                  <span className="text-white font-medium">Workflows</span>
                </div>
                <p className="text-sm text-zinc-400">Automated optimization flows</p>
              </div>
            </div>

            {/* Enhanced Main Hub Tabs */}
            <Tabs defaultValue="quick-audit" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 bg-zinc-900 border-zinc-800 h-12">
                <TabsTrigger value="quick-audit" className="text-sm font-medium">
                  <Target className="h-4 w-4 mr-2" />
                  Quick Audit
                </TabsTrigger>
                <TabsTrigger value="ai-copilots" className="text-sm font-medium">
                  <Brain className="h-4 w-4 mr-2" />
                  AI Copilots
                </TabsTrigger>
                <TabsTrigger value="workflows" className="text-sm font-medium">
                  <Zap className="h-4 w-4 mr-2" />
                  Workflows
                </TabsTrigger>
              </TabsList>

              <TabsContent value="quick-audit">
                <div className="space-y-6">
                  <HeroSection
                    title="Comprehensive App Audit"
                    subtitle="Complete ASO analysis in minutes"
                    description="Import your app to get actionable insights, competitor analysis, and optimization recommendations. Perfect for getting started or quick health checks."
                    primaryAction={{
                      text: 'Start Quick Audit',
                      onClick: () => {}
                    }}
                  />
                  
                  {userContext?.organizationId ? (
                    <AppAuditHub organizationId={userContext.organizationId} />
                  ) : (
                    <div className="text-center py-12 bg-zinc-900/30 rounded-lg border border-zinc-800">
                      <Brain className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">Authentication Required</h3>
                      <p className="text-zinc-400">Please sign in to access the Quick Audit features</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="ai-copilots">
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">AI-Powered Copilots</h2>
                    <p className="text-zinc-400 max-w-2xl mx-auto">
                      Specialized AI assistants for every aspect of App Store Optimization. 
                      Each copilot is designed for specific tasks and outcomes.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <CopilotGrid />
                    </div>
                    <div>
                      <WorkflowManager />
                    </div>
                  </div>
                </div>
                <CopilotInterface />
              </TabsContent>

              <TabsContent value="workflows">
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Automated Workflows</h2>
                    <p className="text-zinc-400 max-w-2xl mx-auto">
                      Pre-built optimization sequences that guide you through complete ASO processes. 
                      From analysis to implementation in structured steps.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3">
                      <CopilotGrid />
                    </div>
                    <div>
                      <WorkflowManager />
                    </div>
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
