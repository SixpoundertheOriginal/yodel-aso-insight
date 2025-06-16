
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { appStoreService } from '@/services';
import { ScrapedMetadata } from '@/types/aso';
import { DataImporter } from '@/components/shared/DataImporter';
import { Sparkles, AlertCircle, Search, Zap } from 'lucide-react';
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
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrgId = async () => {
      try {
        console.log('🔍 [DEBUG] Fetching user organization...');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

          if (error) throw error;
          
          if (profile?.organization_id) {
            setOrganizationId(profile.organization_id);
            console.log('✅ [DEBUG] Organization ID found:', profile.organization_id);
          } else {
            console.warn('⚠️ [DEBUG] User has no organization_id.');
            toast({
              title: 'Organization Setup Required',
              description: 'Your account needs to be associated with an organization. Please contact support.',
              variant: 'destructive',
            });
          }
        } else {
          console.warn('⚠️ [DEBUG] User not authenticated.');
          toast({
            title: 'Authentication Required',
            description: 'Please log in to import app data.',
            variant: 'destructive',
          });
        }
      } catch (err: any) {
        console.error("❌ [DEBUG] Error fetching user profile/organization:", err);
        toast({ title: 'Could not load your profile. Please refresh and try again.', variant: 'destructive' });
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

    setIsImporting(true);
    setLastError(null);
    console.log('🚀 [IMPORT] Starting intelligent import for:', input);

    try {
      const importedData = await appStoreService.importAppData(input, {
        organizationId,
        validateData: true,
        includeCaching: true,
        debugMode: process.env.NODE_ENV === 'development'
      });

      // Show enhanced success message with search context
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
      console.error('❌ [IMPORT] Import failed:', error);
      
      const errorMessage = error.message || 'An unknown error occurred during import.';
      setLastError(errorMessage);
      
      // Enhanced error messages
      let title = 'Import Failed';
      let description = errorMessage;
      
      if (errorMessage.includes('No apps found for')) {
        title = 'No Results Found';
        description = 'Try different keywords, check spelling, or use more specific terms.';
      } else if (errorMessage.includes('Rate limit exceeded')) {
        title = 'Rate Limit Exceeded';
        description = 'You have made too many requests. Please wait a few minutes before trying again.';
      } else if (errorMessage.includes('Invalid search input')) {
        title = 'Invalid Input';
        description = 'Please enter valid keywords, app name, or App Store URL.';
      } else if (errorMessage.includes('Search service unavailable')) {
        title = 'Service Temporarily Unavailable';
        description = 'Our search service is experiencing issues. Please try again in a few minutes.';
      }
      
      toast({
        title,
        description,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
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

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {lastError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Last Error:</strong> {lastError}
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced Search Type Selector */}
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
      
      <DataImporter
        title="ASO Intelligence Search"
        description="Discover apps, analyze competition, and get optimization insights"
        placeholder={getPlaceholderText()}
        onImport={handleImport}
        isLoading={isImporting || !organizationId}
        icon={<Sparkles className="w-4 h-4 ml-2" />}
      />

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
      
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 bg-zinc-800/50 p-3 rounded text-xs text-zinc-300 space-y-1">
          <div><strong>ASO Intelligence Platform v5.0</strong></div>
          <div>Organization ID: {organizationId || 'Not loaded'}</div>
          <div>Search Type: {searchType}</div>
          <div className="text-green-400">✅ Intelligent input detection</div>
          <div className="text-green-400">✅ Multi-modal search engine</div>
          <div className="text-green-400">✅ ASO intelligence generation</div>
          <div className="text-green-400">✅ Enhanced competitor analysis</div>
        </div>
      )}
    </div>
  );
};
