
import React from 'react';
import { useAsoAiHub } from '@/context/AsoAiHubContext';
import { CopilotCard } from './CopilotCard';

export const CopilotGrid: React.FC = () => {
  const { copilots } = useAsoAiHub();

  const categorizedCopilots = {
    optimization: copilots.filter(c => c.category === 'optimization'),
    strategy: copilots.filter(c => c.category === 'strategy'),
    analysis: copilots.filter(c => c.category === 'analysis'),
    system: copilots.filter(c => c.category === 'system')
  };

  return (
    <div className="space-y-8">
      <CopilotSection 
        title="Optimization Copilots" 
        description="Fine-tune your app's metadata and content"
        copilots={categorizedCopilots.optimization}
      />
      
      <CopilotSection 
        title="Strategy Copilots" 
        description="Plan and execute comprehensive ASO strategies"
        copilots={categorizedCopilots.strategy}
      />
      
      <CopilotSection 
        title="Analysis Copilots" 
        description="Deep insights into performance and opportunities"
        copilots={categorizedCopilots.analysis}
      />
      
      <CopilotSection 
        title="System Copilots" 
        description="Enhance and optimize your ASO workflows"
        copilots={categorizedCopilots.system}
      />
    </div>
  );
};

interface CopilotSectionProps {
  title: string;
  description: string;
  copilots: any[];
}

const CopilotSection: React.FC<CopilotSectionProps> = ({ title, description, copilots }) => {
  if (copilots.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-zinc-400">{description}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {copilots.map((copilot) => (
          <CopilotCard key={copilot.id} copilot={copilot} />
        ))}
      </div>
    </div>
  );
};
