
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { MetadataImporter } from './MetadataImporter';
import { MetadataWorkspace, ScrapedMetadata } from './MetadataWorkspace';

export const MetadataCopilot: React.FC = () => {
  const [importedData, setImportedData] = useState<ScrapedMetadata | null>(null);

  const handleImportSuccess = (data: ScrapedMetadata) => {
    setImportedData(data);
  };

  const handleReset = () => {
    setImportedData(null);
  }

  return (
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
      
      {!importedData ? (
        <MetadataImporter onImportSuccess={handleImportSuccess} />
      ) : (
        <MetadataWorkspace initialData={importedData} />
      )}
    </div>
  );
};
