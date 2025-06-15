
import React from 'react';
import { CurrentMetadataPanel } from './CurrentMetadataPanel';
import { SuggestedMetadataPanel } from './SuggestedMetadataPanel';
import { DataIntegrityChecker } from './DataIntegrityChecker';
import { ScrapedMetadata } from '@/types/aso';

interface MetadataWorkspaceProps {
  initialData: ScrapedMetadata;
  organizationId: string;
}

export const MetadataWorkspace: React.FC<MetadataWorkspaceProps> = ({ initialData, organizationId }) => {
  console.log('🏗️ [WORKSPACE] Initializing workspace with data:', JSON.stringify(initialData, null, 2));
  
  return (
    <div className="space-y-6">
      {/* Data Quality Report - Development Only */}
      {process.env.NODE_ENV === 'development' && (
        <DataIntegrityChecker metadata={initialData} />
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <CurrentMetadataPanel metadata={initialData} />
        </div>
        <div>
          <SuggestedMetadataPanel initialData={initialData} organizationId={organizationId} />
        </div>
      </div>
    </div>
  );
};
