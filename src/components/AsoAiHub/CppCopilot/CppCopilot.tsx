
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { CppImporter } from './CppImporter';
import { CppStrategyWorkspace } from './CppStrategyWorkspace';
import { CppErrorBoundary } from './CppErrorBoundary';
import { CppStrategyData } from '@/types/cpp';

export const CppCopilot: React.FC = () => {
  const [strategyData, setStrategyData] = useState<CppStrategyData | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const handleStrategySuccess = (data: CppStrategyData, orgId: string) => {
    console.log('🎯 [CPP-COPILOT] Received strategy data:', data, 'for org:', orgId);
    setStrategyData(data);
    setOrganizationId(orgId);
  };

  const handleReset = () => {
    console.log('🔄 [CPP-COPILOT] Resetting copilot state');
    setStrategyData(null);
    setOrganizationId(null);
  };

  return (
    <CppErrorBoundary onReset={handleReset}>
      <div className="space-y-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center space-x-2">
              <span className="text-2xl">🎯</span>
              <span>CPP Strategy Co-Pilot</span>
            </CardTitle>
            {strategyData && (
               <button onClick={handleReset} className="text-sm text-zinc-400 hover:text-white">Start Over</button>
            )}
          </CardHeader>
        </Card>
        
        {!strategyData || !organizationId ? (
          <CppImporter onStrategySuccess={handleStrategySuccess} />
        ) : (
          <CppStrategyWorkspace strategyData={strategyData} organizationId={organizationId} />
        )}
      </div>
    </CppErrorBoundary>
  );
};
