
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ScrapedMetadata } from './MetadataWorkspace';

interface MetadataImporterProps {
  onImportSuccess: (data: ScrapedMetadata) => void;
}

export const MetadataImporter: React.FC<MetadataImporterProps> = ({ onImportSuccess }) => {
  const [importerUrl, setImporterUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrgId = async () => {
      try {
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
          } else {
            console.warn('User is authenticated but has no organization_id.');
            toast({
              title: 'Organization Not Found',
              description: 'Your user account is not associated with an organization. Please contact support.',
              variant: 'destructive',
            });
          }
        } else {
            toast({
              title: 'Authentication Error',
              description: 'You must be logged in to import app data.',
              variant: 'destructive',
            });
        }
      } catch (err: any) {
        console.error("Error fetching user profile/organization:", err);
        toast({ title: 'Could not load your user profile. Please try again.', variant: 'destructive' });
      }
    };
    fetchOrgId();
  }, [toast]);

  const handleImport = async () => {
    if (!importerUrl) {
      toast({ title: 'App Store URL or App Name is required.', variant: 'destructive' });
      return;
    }
    if (!organizationId) {
      toast({
        title: 'Organization context is missing.',
        description: 'Could not perform the import without an active organization. Please refresh the page.',
        variant: 'destructive'
      });
      return;
    }
    setIsImporting(true);
    try {
      const { data: responseData, error: invokeError } = await supabase.functions.invoke('app-store-scraper', {
        body: { appStoreUrl: importerUrl, organizationId },
      });

      // Handle invocation errors (e.g., function crashed, network issue, 5xx)
      if (invokeError) {
        console.error('Supabase function invocation error:', invokeError);
        throw new Error(`The import service is currently unavailable. Please try again later. (Details: ${invokeError.message})`);
      }

      // Handle application-level errors returned by the function (e.g., 404, 422)
      if (responseData.error) {
        console.error('App Store scraper application error:', responseData.error);
        throw new Error(responseData.error);
      }
      
      // Validate that we received the core data we need from the enhanced scraper
      if (!responseData || !responseData.name || !responseData.url || !responseData.title) {
        console.error('Incomplete data received from scraper:', responseData);
        throw new Error('Received incomplete data from the import service. The App Store page might have a non-standard format.');
      }

      toast({
        title: 'App data imported successfully!',
        description: `Now generating metadata for ${responseData.name}.`,
      });

      // The backend scraper now does the heavy lifting of parsing title/subtitle.
      // The frontend just consumes the clean data contract.
      const urlParts = new URL(responseData.url).pathname.split('/');
      const locale = urlParts[1] || 'us';

      // The scraper will be enhanced later to provide this data.
      // For now, we pass on what's available; the panel component will use defaults.
      onImportSuccess({
        ...responseData,
        title: responseData.title,
        subtitle: responseData.subtitle || '',
        locale: locale,
        // -- Pass on new preview fields if they exist --
        icon: responseData.icon,
        developer: responseData.developer,
        rating: responseData.rating,
        reviews: responseData.reviews,
        price: responseData.price || 'Free',
      });

    } catch (e: any) {
      toast({
        title: 'Import Failed',
        description: e.message || 'An unknown error occurred while importing from the App Store.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-white text-lg">Import from App Store</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="app-store-url" className="text-zinc-300">App Store URL or App Name</Label>
          <Input
            id="app-store-url"
            placeholder="e.g., 'TikTok' or https://apps.apple.com/..."
            value={importerUrl}
            onChange={(e) => setImporterUrl(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <Button onClick={handleImport} disabled={isImporting || !importerUrl || !organizationId} className="w-full">
          {isImporting ? 'Importing...' : 'Import App Data'}
          <Sparkles className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};
