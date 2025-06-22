
import React from 'react';
import { MainLayout } from '@/layouts';
import { AdvancedKeywordIntelligence } from '@/components/KeywordIntelligence';

const KeywordIntelligencePage: React.FC = () => {
  // Mock organization ID - in real app this would come from auth context
  const organizationId = 'demo-org-123';

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Keyword Intelligence</h1>
          <p className="text-zinc-400">
            Advanced keyword analysis with competitor gap analysis, search volume trends, and difficulty scoring
          </p>
        </div>
        
        <AdvancedKeywordIntelligence
          organizationId={organizationId}
          targetAppId="demo-app-123"
        />
      </div>
    </MainLayout>
  );
};

export default KeywordIntelligencePage;
