
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Search, Loader2 } from 'lucide-react';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { asoSearchService } from '@/services/aso-search.service';
import { ScrapedMetadata } from '@/types/aso';
import { AppSelectionModal } from './AppSelectionModal';
import { AmbiguousSearchError } from '@/services/aso-search.service';

interface AppImporterProps {
  onImportSuccess: (metadata: ScrapedMetadata, orgId: string) => void;
  organizationId: string;
}

export const AppImporter: React.FC<AppImporterProps> = ({ 
  onImportSuccess, 
  organizationId 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [candidateApps, setCandidateApps] = useState<ScrapedMetadata[]>([]);
  const [showSelectionModal, setShowSelectionModal] = useState(false);

  const handleSearch = async (query: string) => {
    try {
      const result = await asoSearchService.search(query, {
        organizationId,
        includeIntelligence: true,
        cacheResults: true
      });
      
      onImportSuccess(result, organizationId);
    } catch (error) {
      if (error instanceof AmbiguousSearchError) {
        setCandidateApps(error.candidates);
        setShowSelectionModal(true);
      } else {
        console.error('Search failed:', error);
      }
    }
  };

  const { debouncedSearch, isSearching } = useDebouncedSearch({
    delay: 800,
    onSearch: handleSearch
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim().length > 2) {
      debouncedSearch(value.trim());
    }
  };

  const handleAppSelection = (selectedApp: ScrapedMetadata) => {
    setShowSelectionModal(false);
    setCandidateApps([]);
    onImportSuccess(selectedApp, organizationId);
  };

  return (
    <>
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Brain className="h-6 w-6 text-yodel-orange" />
            <span>Import App for Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4" />
              <Input
                value={searchTerm}
                onChange={handleInputChange}
                placeholder="Enter app name or App Store URL..."
                className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
                disabled={isSearching}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-yodel-orange" />
                </div>
              )}
            </div>
          </div>
          
          <div className="text-sm text-zinc-400">
            Search by app name (e.g., "Instagram") or paste an App Store URL
          </div>
        </CardContent>
      </Card>

      <AppSelectionModal
        isOpen={showSelectionModal}
        onClose={() => setShowSelectionModal(false)}
        candidates={candidateApps}
        onSelect={handleAppSelection}
        searchTerm={searchTerm}
      />
    </>
  );
};
