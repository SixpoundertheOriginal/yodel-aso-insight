
import React from 'react';
import { CurrentMetadataPanel } from './CurrentMetadataPanel';
import { SuggestedMetadataPanel } from './SuggestedMetadataPanel';
import { DataIntegrityChecker } from './DataIntegrityChecker';
import { ScrapedMetadata } from '@/types/aso';

// Re-export for convenience (legacy support)
export type { ScrapedMetadata };

interface MetadataWorkspaceProps {
  initialData: ScrapedMetadata;
  organizationId: string;
}

export const MetadataWorkspace: React.FC<MetadataWorkspaceProps> = React.memo(({ initialData, organizationId }) => {
  // Memoize debug data to prevent JSON.stringify on every render
  const debugData = React.useMemo(() => {
    return {
      appId: initialData.appId,
      name: initialData.name,
      hasDescription: !!initialData.description,
      organizationId
    };
  }, [initialData.appId, initialData.name, initialData.description, organizationId]);
  
  React.useEffect(() => {
    console.log('🏗️ [WORKSPACE] Initializing workspace with data:', debugData);
  }, [debugData]);
  
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
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.organizationId === nextProps.organizationId &&
    prevProps.initialData.appId === nextProps.initialData.appId &&
    prevProps.initialData.name === nextProps.initialData.name &&
    prevProps.initialData.description === nextProps.initialData.description
  );
});

