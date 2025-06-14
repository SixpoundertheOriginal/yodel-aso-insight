
import React from 'react';
import { CurrentMetadataPanel } from './CurrentMetadataPanel';
import { SuggestedMetadataPanel } from './SuggestedMetadataPanel';

// This type can be expanded with more fields from the scraper
export interface ScrapedMetadata {
  name: string;
  title: string;
  subtitle: string;
  description: string;
  applicationCategory: string;
  locale: string;
}

interface MetadataWorkspaceProps {
  initialData: ScrapedMetadata;
}

export const MetadataWorkspace: React.FC<MetadataWorkspaceProps> = ({ initialData }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <CurrentMetadataPanel metadata={initialData} />
      </div>
      <div>
        <SuggestedMetadataPanel initialData={initialData} />
      </div>
    </div>
  );
};
