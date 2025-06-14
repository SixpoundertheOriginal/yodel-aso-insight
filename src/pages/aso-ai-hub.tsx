
import React from 'react';
import { MainLayout } from '@/layouts';
import { AsoAiHubProvider } from '@/context/AsoAiHubContext';
import { CopilotGrid } from '@/components/AsoAiHub/CopilotGrid';
import { CopilotInterface } from '@/components/AsoAiHub/CopilotInterface';

const AsoAiHubPage: React.FC = () => {
  return (
    <MainLayout>
      <AsoAiHubProvider>
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">ASO AI Hub</h1>
            <p className="text-zinc-400 text-lg max-w-3xl mx-auto">
              Your comprehensive suite of AI-powered App Store Optimization copilots. 
              Each specialist is designed to tackle specific ASO challenges with precision and intelligence.
            </p>
          </div>
          
          <CopilotGrid />
          <CopilotInterface />
        </div>
      </AsoAiHubProvider>
    </MainLayout>
  );
};

export default AsoAiHubPage;
