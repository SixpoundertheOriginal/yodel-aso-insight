
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { MetadataImporter } from './MetadataImporter';
import { MetadataWorkspace, ScrapedMetadata } from './MetadataWorkspace';
import { MetadataErrorBoundary } from './MetadataErrorBoundary';

export const MetadataCopilot: React.FC = () => {
  const [importedData, setImportedData] = useState<ScrapedMetadata | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const handleImportSuccess = (data: ScrapedMetadata, orgId: string) => {
    console.log('🎯 [COPILOT] Received imported data:', data, 'for org:', orgId);
    setImportedData(data);
    setOrganizationId(orgId);
  };

  const handleReset = () => {
    console.log('🔄 [COPILOT] Resetting copilot state');
    setImportedData(null);
    setOrganizationId(null);
  };

  return (
    <MetadataErrorBoundary onReset={handleReset}>
      <div className="space-y-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center space-x-2">
              <span className="text-2xl">📝</span>
              <span>Metadata Co-Pilot</span>
            </CardTitle>
            {importedData && (
               <button onClick={handleReset} className="text-sm text-zinc-400 hover:text-white">Start Over</button>
            )}
          </CardHeader>
        </Card>
        
        {!importedData || !organizationId ? (
          <MetadataImporter onImportSuccess={handleImportSuccess} />
        ) : (
          <MetadataWorkspace initialData={importedData} organizationId={organizationId} />
        )}
      </div>
    </MetadataErrorBoundary>
  );
};
