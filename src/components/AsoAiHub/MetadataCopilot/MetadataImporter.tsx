
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { appStoreService } from '@/services';
import { ScrapedMetadata } from '@/types/aso';
import { DataImporter } from '@/components/shared/DataImporter';
import { Sparkles } from 'lucide-react';

interface MetadataImporterProps {
  onImportSuccess: (data: ScrapedMetadata, organizationId: string) => void;
}

export const MetadataImporter: React.FC<MetadataImporterProps> = ({ onImportSuccess }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
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
              title: 'Organization Not Found',
              description: 'Your user account is not associated with an organization. Please contact support.',
              variant: 'destructive',
            });
          }
        } else {
          console.warn('⚠️ [DEBUG] User not authenticated.');
          toast({
            title: 'Authentication Error',
            description: 'You must be logged in to import app data.',
            variant: 'destructive',
          });
        }
      } catch (err: any) {
        console.error("❌ [DEBUG] Error fetching user profile/organization:", err);
        toast({ title: 'Could not load your user profile. Please try again.', variant: 'destructive' });
      }
    };
    fetchOrgId();
  }, [toast]);

  const handleImport = async (appStoreUrl: string) => {
    if (!organizationId) {
      toast({
        title: 'Organization context is missing.',
        description: 'Could not perform the import without an active organization. Please refresh the page.',
        variant: 'destructive'
      });
      return;
    }

    setIsImporting(true);
    console.log('🚀 [IMPORT] Starting import process for:', appStoreUrl);

    try {
      const importedData = await appStoreService.importAppData(appStoreUrl, {
        organizationId,
        validateData: true,
        includeCaching: true,
        debugMode: process.env.NODE_ENV === 'development'
      });

      toast({
        title: 'App data imported successfully!',
        description: `Now generating metadata for ${importedData.name}.`,
      });

      onImportSuccess(importedData, organizationId);

    } catch (error: any) {
      console.error('❌ [IMPORT] Import failed:', error);
      toast({
        title: 'Import Failed',
        description: error.message || 'An unknown error occurred while importing from the App Store.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <DataImporter
        title="Import from App Store"
        description="Enter an App Store URL or app name to begin metadata optimization"
        placeholder="e.g., 'TikTok' or https://apps.apple.com/..."
        onImport={handleImport}
        isLoading={isImporting || !organizationId}
        icon={<Sparkles className="w-4 h-4 ml-2" />}
      />
      
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 bg-zinc-800/50 p-3 rounded text-xs text-zinc-300">
          <div>Organization ID: {organizationId || 'Not loaded'}</div>
          <div>Debug Mode: Active</div>
          <div>Check browser console for detailed logs</div>
        </div>
      )}
    </div>
  );
};
