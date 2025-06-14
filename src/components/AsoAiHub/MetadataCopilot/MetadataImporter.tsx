
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
      toast({ title: "App Store URL is required.", variant: "destructive" });
      return;
    }
    setIsImporting(true);
    try {
      const { data: scrapedData, error } = await supabase.functions.invoke('app-store-scraper', {
        body: { appStoreUrl: importerUrl }
      });

      if (error || !scrapedData) {
        throw new Error(error?.message || "Failed to scrape App Store page.");
      }

      toast({
        title: "App data imported successfully!",
        description: `Now generating metadata for ${scrapedData.name}.`,
      });

      const urlParts = new URL(importerUrl).pathname.split('/');
      const locale = urlParts[1] || 'us';
      
      const [title, ...subtitleParts] = scrapedData.name.split(/ - | \| /);
      const subtitle = subtitleParts.join(' - ');

      onImportSuccess({
        ...scrapedData,
        title: title.trim(),
        subtitle: subtitle.trim() || '',
        locale: locale,
      });

    } catch (e: any) {
      toast({
        title: "Import Failed",
        description: e.message || "Could not retrieve data from the App Store.",
        variant: "destructive"
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
          <Label htmlFor="app-store-url" className="text-zinc-300">App Store URL</Label>
          <Input
            id="app-store-url"
            placeholder="https://apps.apple.com/us/app/tiktok/id835599320"
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
