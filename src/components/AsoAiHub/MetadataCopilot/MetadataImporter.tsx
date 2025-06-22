import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { appStoreService } from '@/services';
import { ScrapedMetadata } from '@/types/aso';
import { AmbiguousSearchError } from '@/types/search-errors';
import { DataImporter } from '@/components/shared/DataImporter';
import { AppSearchResultsModal } from './AppSearchResultsModal';
import { Sparkles, AlertCircle, Search, Zap, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface MetadataImporterProps {
  onImportSuccess: (data: ScrapedMetadata, organizationId: string) => void;
}

export const MetadataImporter: React.FC<MetadataImporterProps> = ({ onImportSuccess }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'auto' | 'keyword' | 'brand' | 'url'>('auto');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  // New state for app selection modal
  const [showAppSelection, setShowAppSelection] = useState(false);
  const [appCandidates, setAppCandidates] = useState<ScrapedMetadata[]>([]);
  const [pendingSearchTerm, setPendingSearchTerm] = useState<string>('');
  
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrgId = async () => {
      try {
        console.log('🔍 [METADATA-IMPORTER] Fetching user organization...');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('❌ [METADATA-IMPORTER] Profile fetch error:', error);
            throw error;
          }
          
          if (profile?.organization_id) {
            setOrganizationId(profile.organization_id);
            console.log('✅ [METADATA-IMPORTER] Organization ID found:', profile.organization_id);
          } else {
            console.warn('⚠️ [METADATA-IMPORTER] User has no organization_id.');
            toast({
              title: 'Organization Setup Required',
              description: 'Your account needs to be associated with an organization. Please contact support.',
              variant: 'destructive',
            });
          }
        } else {
          console.warn('⚠️ [METADATA-IMPORTER] User not authenticated.');
          toast({
            title: 'Authentication Required',
            description: 'Please log in to import app data.',
            variant: 'destructive',
          });
        }
      } catch (err: any) {
        console.error("❌ [METADATA-IMPORTER] Error fetching user profile/organization:", err);
        toast({ 
          title: 'Could not load your profile. Please refresh and try again.', 
          variant: 'destructive' 
        });
      }
    };
    fetchOrgId();
  }, [toast]);

  const handleImport = async (input: string) => {
    if (!organizationId) {
      toast({
        title: 'Organization Missing',
        description: 'Cannot perform import without organization context. Please refresh the page.',
        variant: 'destructive'
      });
      return;
    }

    if (!input || input.trim().length === 0) {
      toast({
        title: 'Empty Search',
        description: 'Please enter keywords, app name, or App Store URL to search.',
        variant: 'destructive'
      });
      return;
    }

    const trimmedInput = input.trim();
    console.log('🚀 [METADATA-IMPORTER] Starting import for:', trimmedInput);

    setIsImporting(true);
    setLastError(null);
    setPendingSearchTerm(trimmedInput);

    // Add to search history
    setSearchHistory(prev => {
      const newHistory = [trimmedInput, ...prev.filter(item => item !== trimmedInput)].slice(0, 5);
      return newHistory;
    });

    try {
      console.log('📤 [METADATA-IMPORTER] Calling appStoreService.importAppData...');
      
      const importedData = await appStoreService.importAppData(trimmedInput, {
        organizationId,
        validateData: true,
        includeCaching: true,
        debugMode: process.env.NODE_ENV === 'development'
      });

      console.log('✅ [METADATA-IMPORTER] Import successful:', importedData);

      // Enhanced success message
      const searchContext = (importedData as any).searchContext;
      const asoIntelligence = (importedData as any).asoIntelligence;
      
      let successMessage = `Successfully imported ${importedData.name}`;
      if (searchContext) {
        successMessage += ` via ${searchContext.type} search`;
        if (searchContext.totalResults > 1) {
          successMessage += ` (${searchContext.totalResults} results analyzed)`;
        }
      }

      toast({
        title: 'Import Successful! 🎉',
        description: successMessage,
      });

      // Show ASO intelligence if available
      if (asoIntelligence?.opportunities?.length > 0) {
        setTimeout(() => {
          toast({
            title: 'ASO Intelligence Generated',
            description: `Found ${asoIntelligence.opportunities.length} optimization opportunities`,
          });
        }, 1500);
      }

      onImportSuccess(importedData, organizationId);

    } catch (error: any) {
      console.error('❌ [METADATA-IMPORTER] Import failed:', error);
      
      // Handle AmbiguousSearchError as expected user selection flow
      if (error instanceof AmbiguousSearchError) {
        console.log('🎯 [METADATA-IMPORTER] Multiple apps found - showing selection modal');
        console.log(`📋 [METADATA-IMPORTER] User can choose from ${error.candidates.length} options`);
        setAppCandidates(error.candidates);
        setShowAppSelection(true);
        setIsImporting(false); // Stop loading state
        return; // Don't show error toast - let user select instead
      }
      
      const errorMessage = error.message || 'An unknown error occurred during import.';
      setLastError(errorMessage);
      
      // Enhanced error handling for other errors
      let title = 'Import Failed';
      let description = errorMessage;
      let suggestions: string[] = [];
      
      if (errorMessage.includes('No apps found') || errorMessage.includes('No results found')) {
        title = 'No Results Found';
        description = 'No apps found for your search terms.';
        suggestions = [
          'Try different keywords',
          'Check spelling and try again',
          'Use more specific terms',
          'Try searching for a brand name instead'
        ];
      } else if (errorMessage.includes('Rate limit')) {
        title = 'Rate Limit Exceeded';
        description = 'You have made too many requests.';
        suggestions = ['Wait a few minutes before trying again'];
      } else if (errorMessage.includes('Invalid') || errorMessage.includes('validation')) {
        title = 'Invalid Input';
        description = 'The search input is not valid.';
        suggestions = [
          'Enter valid keywords or app names',
          'For URLs, use complete App Store links',
          'Avoid special characters'
        ];
      } else if (errorMessage.includes('unavailable') || errorMessage.includes('network')) {
        title = 'Service Temporarily Unavailable';
        description = 'Search service is experiencing issues.';
        suggestions = ['Try again in a few minutes'];
      } else if (errorMessage.includes('Authentication') || errorMessage.includes('unauthorized')) {
        title = 'Authentication Required';
        description = 'Please log in to use the search feature.';
        suggestions = ['Log in and try again'];
      }
      
      toast({
        title,
        description: `${description}${suggestions.length > 0 ? ` Try: ${suggestions[0]}` : ''}`,
        variant: 'destructive',
      });

    } finally {
      if (!showAppSelection) {
        setIsImporting(false);
      }
    }
  };

  // NEW: Handle app selection from modal
  const handleAppSelection = async (selectedApp: ScrapedMetadata) => {
    setShowAppSelection(false);
    setIsImporting(true);
    
    try {
      console.log('✅ [METADATA-IMPORTER] User selected app:', selectedApp.name);
      
      toast({
        title: 'App Selected! 🎉',
        description: `Successfully imported ${selectedApp.name}`,
      });

      onImportSuccess(selectedApp, organizationId!);
      
    } catch (error: any) {
      console.error('❌ [METADATA-IMPORTER] App selection processing failed:', error);
      toast({
        title: 'Processing Failed',
        description: 'Failed to process selected app. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      setAppCandidates([]);
      setPendingSearchTerm('');
    }
  };

  // NEW: Handle modal cancel
  const handleAppSelectionCancel = () => {
    setShowAppSelection(false);
    setIsImporting(false);
    setAppCandidates([]);
    setPendingSearchTerm('');
    
    toast({
      title: 'Search Cancelled',
      description: 'App selection was cancelled. Try a more specific search term.',
    });
  };

  const getSearchTypeDescription = () => {
    switch (searchType) {
      case 'keyword':
        return 'Search by category or functionality (e.g., "fitness tracker", "language learning")';
      case 'brand':
        return 'Search by specific app name (e.g., "Instagram", "TikTok")';
      case 'url':
        return 'Import directly from App Store URL';
      default:
        return 'Auto-detect search type from your input';
    }
  };

  const getPlaceholderText = () => {
    switch (searchType) {
      case 'keyword':
        return 'Try: "meditation apps", "photo editors", "language learning"...';
      case 'brand':
        return 'Try: "Instagram", "TikTok", "Duolingo"...';
      case 'url':
        return 'https://apps.apple.com/app/...';
      default:
        return 'Enter keywords, app name, or App Store URL...';
    }
  };

  const handleQuickSearch = (searchTerm: string) => {
    handleImport(searchTerm);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {lastError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Search Error:</strong> {lastError}
          </AlertDescription>
        </Alert>
      )}

      {/* Search Type Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Search Type
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'auto', label: 'Auto-Detect', icon: Zap },
            { value: 'keyword', label: 'Keywords', icon: Search },
            { value: 'brand', label: 'App Name', icon: Sparkles },
            { value: 'url', label: 'URL', icon: AlertCircle }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setSearchType(value as any)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                searchType === value
                  ? 'bg-yodel-orange text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          {getSearchTypeDescription()}
        </p>
      </div>
      
      {/* Main Search Interface */}
      <DataImporter
        title="ASO Intelligence Search"
        description="Discover apps, analyze competition, and get optimization insights"
        placeholder={getPlaceholderText()}
        onImport={handleImport}
        isLoading={isImporting || !organizationId}
        icon={isImporting ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Sparkles className="w-4 h-4 ml-2" />}
      />

      {/* NEW: App Selection Modal */}
      <AppSearchResultsModal
        isOpen={showAppSelection}
        results={appCandidates}
        searchTerm={pendingSearchTerm}
        onSelect={handleAppSelection}
        onCancel={handleAppSelectionCancel}
      />

      {/* Quick Search Suggestions */}
      {!isImporting && searchHistory.length === 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-zinc-300">Quick Search Examples:</h4>
          <div className="flex flex-wrap gap-2">
            {[
              'fitness apps',
              'meditation',
              'language learning',
              'photo editor',
              'Instagram',
              'TikTok'
            ].map((term) => (
              <button
                key={term}
                onClick={() => handleQuickSearch(term)}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-md transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search History */}
      {searchHistory.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-300">Recent Searches:</h4>
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((term, index) => (
              <button
                key={`${term}-${index}`}
                onClick={() => handleQuickSearch(term)}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-md transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feature Highlights */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-zinc-800/30 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">🔍 Smart Search</h4>
          <p className="text-xs text-zinc-400">
            Auto-detects URLs, brand names, and keywords for optimal results
          </p>
        </div>
        <div className="bg-zinc-800/30 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">🧠 ASO Intelligence</h4>
          <p className="text-xs text-zinc-400">
            Get market insights, competition analysis, and optimization opportunities
          </p>
        </div>
      </div>
      
      {/* Development Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 bg-zinc-800/50 p-3 rounded text-xs text-zinc-300 space-y-1">
          <div><strong>ASO Intelligence Platform v5.1.0-ambiguity-fix</strong></div>
          <div>Organization ID: {organizationId || 'Not loaded'}</div>
          <div>Search Type: {searchType}</div>
          <div>Is Importing: {isImporting ? 'Yes' : 'No'}</div>
          <div>Show App Selection: {showAppSelection ? 'Yes' : 'No'}</div>
          <div>App Candidates: {appCandidates.length}</div>
          <div className="text-green-400">✅ Emergency stabilization active</div>
          <div className="text-green-400">✅ Enhanced error handling</div>
          <div className="text-green-400">✅ App selection modal implemented</div>
          <div className="text-green-400">✅ AmbiguousSearchError handling fixed</div>
          {lastError && <div className="text-red-400">❌ Last Error: {lastError}</div>}
        </div>
      )}
    </div>
  );
};
