
import React from 'react';
import { CurrentMetadataPanel } from './CurrentMetadataPanel';
import { SuggestedMetadataPanel } from './SuggestedMetadataPanel';
import { DataIntegrityChecker } from './DataIntegrityChecker';

// This type is the contract for data coming from the scraper.
// It's the "ideal" state after processing on both backend and frontend.
export interface ScrapedMetadata {
  name: string; // The full, original name from the App Store
  url: string; // The canonical App Store URL for the app
  appId: string; // The app store ID (e.g., from search results)
  title: string; // The parsed main title of the app
  subtitle: string; // The parsed subtitle of the app
  description?: string;
  applicationCategory?: string;
  locale: string; // Derived on the client-side from the URL

  // -- New fields for enhanced preview --
  icon?: string; // URL for the app icon
  developer?: string;
  rating?: number;
  reviews?: number;
  price?: string; // e.g., "Free", "$0.99"
  // -- End new fields --

  [key: string]: any; // Allow for other potential properties from the scraper
}

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
