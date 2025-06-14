
import React, { useState } from 'react';
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
  const { toast } = useToast();

  const handleImport = async () => {
    if (!importerUrl) {
      toast({ title: 'App Store URL or App Name is required.', variant: 'destructive' });
      return;
    }
    setIsImporting(true);
    try {
      const { data: responseData, error: invokeError } = await supabase.functions.invoke('app-store-scraper', {
        body: { appStoreUrl: importerUrl },
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

      onImportSuccess({
        ...responseData,
        title: responseData.title, // Directly from scraper
        subtitle: responseData.subtitle || '', // Directly from scraper, with a fallback
        locale: locale,
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
        <Button onClick={handleImport} disabled={isImporting || !importerUrl} className="w-full">
          {isImporting ? 'Importing...' : 'Import App Data'}
          <Sparkles className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};
