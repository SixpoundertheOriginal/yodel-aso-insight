
import React from 'react';
import { CurrentMetadataPanel } from './CurrentMetadataPanel';
import { SuggestedMetadataPanel } from './SuggestedMetadataPanel';

// This type is the contract for data coming from the scraper.
// It's the "ideal" state after processing on both backend and frontend.
export interface ScrapedMetadata {
  name: string; // The full, original name from the App Store
  url: string; // The canonical App Store URL for the app
  title: string; // The parsed main title of the app
  subtitle: string; // The parsed subtitle of the app
  description?: string;
  applicationCategory?: string;
  locale: string; // Derived on the client-side from the URL
  [key: string]: any; // Allow for other potential properties from the scraper
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
