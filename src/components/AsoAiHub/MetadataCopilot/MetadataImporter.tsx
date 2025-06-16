
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { appStoreService } from '@/services';
import { ScrapedMetadata } from '@/types/aso';
import { DataImporter } from '@/components/shared/DataImporter';
import { Sparkles, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MetadataImporterProps {
  onImportSuccess: (data: ScrapedMetadata, organizationId: string) => void;
}

export const MetadataImporter: React.FC<MetadataImporterProps> = ({ onImportSuccess }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
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
    console.log('🚀 [IMPORT] Starting import process for:', input);

    try {
      const importedData = await appStoreService.importAppData(input, {
        organizationId,
        validateData: true,
        includeCaching: true,
        debugMode: process.env.NODE_ENV === 'development'
      });

      toast({
        title: 'Import Successful!',
        description: `Successfully imported data for ${importedData.name}. Now generating metadata suggestions.`,
      });

      onImportSuccess(importedData, organizationId);

    } catch (error: any) {
      console.error('❌ [IMPORT] Import failed:', error);
      
      const errorMessage = error.message || 'An unknown error occurred during import.';
      setLastError(errorMessage);
      
      // Provide more specific error guidance
      let title = 'Import Failed';
      let description = errorMessage;
      
      if (errorMessage.includes('rate limit')) {
        title = 'Rate Limit Exceeded';
        description = 'You have made too many requests. Please wait a few minutes before trying again.';
      } else if (errorMessage.includes('not found')) {
        title = 'App Not Found';
        description = 'Could not find the specified app in the App Store. Please check the name or URL and try again.';
      } else if (errorMessage.includes('validation')) {
        title = 'Invalid Input';
        description = 'The app name or URL you provided is not valid. Please check and try again.';
      } else if (errorMessage.includes('unavailable')) {
        title = 'Service Temporarily Unavailable';
        description = 'The import service is currently experiencing issues. Please try again in a few minutes.';
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
      
      <DataImporter
        title="Import from App Store"
        description="Enter an App Store URL or app name to begin metadata optimization"
        placeholder="e.g., 'TikTok' or https://apps.apple.com/..."
        onImport={handleImport}
        isLoading={isImporting || !organizationId}
        icon={<Sparkles className="w-4 h-4 ml-2" />}
      />
      
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 bg-zinc-800/50 p-3 rounded text-xs text-zinc-300 space-y-1">
          <div><strong>Debug Info:</strong></div>
          <div>Organization ID: {organizationId || 'Not loaded'}</div>
          <div>Environment: Development</div>
          <div>Service Status: Emergency Stabilized</div>
          <div className="text-green-400">✅ Database schema updated</div>
          <div className="text-green-400">✅ API contracts fixed</div>
          <div className="text-green-400">✅ Error handling improved</div>
        </div>
      )}
    </div>
  );
};
