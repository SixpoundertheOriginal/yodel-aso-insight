
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/layouts';
import { AsoAiHubProvider } from '@/context/AsoAiHubContext';
import { WorkflowProvider } from '@/context/WorkflowContext';
import { CopilotGrid } from '@/components/AsoAiHub/CopilotGrid';
import { CopilotInterface } from '@/components/AsoAiHub/CopilotInterface';
import { WorkflowManager } from '@/components/AsoAiHub/WorkflowManager';
import { HeroSection } from '@/components/ui/design-system';

const AsoAiHubPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <WorkflowProvider>
        <AsoAiHubProvider>
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-4">ASO AI Hub</h1>
              <p className="text-zinc-400 text-lg max-w-3xl mx-auto">
                Your comprehensive suite of AI-powered App Store Optimization copilots with intelligent workflow automation. 
                Each specialist seamlessly integrates to create end-to-end ASO solutions.
              </p>
            </div>
            
            <HeroSection
              title="NEW: Featuring Strategy Toolkit"
              subtitle="Craft winning Apple App Store submissions"
              description="Leverage our new AI-powered toolkit to analyze, optimize, and package your app's story for a higher chance of being featured by Apple's editors."
              primaryAction={{
                text: 'Launch Toolkit',
                onClick: () => navigate('/featuring-toolkit')
              }}
            />

            {/* Workflow Management */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <CopilotGrid />
              </div>
              <div>
                <WorkflowManager />
              </div>
            </div>
            
            <CopilotInterface />
          </div>
        </AsoAiHubProvider>
      </WorkflowProvider>
    </MainLayout>
  );
};

export default AsoAiHubPage;
