
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

// Enterprise-grade data validation function
const validateMetadata = (data: any): { isValid: boolean; issues: string[]; sanitized: ScrapedMetadata } => {
  const issues: string[] = [];
  
  console.log('🔍 [VALIDATION] Raw data received from scraper:', JSON.stringify(data, null, 2));
  
  // Check required fields
  if (!data.name) issues.push('Missing app name');
  if (!data.url) issues.push('Missing app URL');
  if (!data.title) issues.push('Missing app title');
  
  // Check data types and values
  if (data.rating !== undefined && (typeof data.rating !== 'number' || isNaN(data.rating))) {
    issues.push(`Invalid rating: ${data.rating} (type: ${typeof data.rating})`);
  }
  
  if (data.reviews !== undefined && (typeof data.reviews !== 'number' || isNaN(data.reviews))) {
    issues.push(`Invalid reviews count: ${data.reviews} (type: ${typeof data.reviews})`);
  }
  
  // Check for missing visual elements
  if (!data.icon) issues.push('Missing app icon URL');
  if (!data.developer) issues.push('Missing developer name');
  if (!data.subtitle) issues.push('Missing app subtitle');
  
  console.log('⚠️ [VALIDATION] Data validation issues:', issues);
  
  // Create sanitized version with enterprise-grade defaults
  const sanitized: ScrapedMetadata = {
    name: data.name || 'Unknown App',
    url: data.url || '',
    title: data.title || data.name || 'App Title',
    subtitle: data.subtitle || '',
    description: data.description || 'No description available.',
    applicationCategory: data.applicationCategory || 'App',
    locale: data.locale || 'us',
    icon: data.icon || undefined,
    developer: data.developer || data.author || undefined,
    rating: typeof data.rating === 'number' && !isNaN(data.rating) ? data.rating : 0,
    reviews: typeof data.reviews === 'number' && !isNaN(data.reviews) ? data.reviews : 0,
    price: data.price || 'Free',
  };
  
  console.log('✅ [VALIDATION] Sanitized metadata:', JSON.stringify(sanitized, null, 2));
  
  return {
    isValid: issues.length === 0,
    issues,
    sanitized
  };
};

export const MetadataImporter: React.FC<MetadataImporterProps> = ({ onImportSuccess }) => {
  const [importerUrl, setImporterUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
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
    console.log('🚀 [IMPORT] Starting import process for:', importerUrl);
    console.log('🏢 [IMPORT] Organization ID:', organizationId);

    try {
      console.log('📡 [IMPORT] Calling app-store-scraper function...');
      const { data: responseData, error: invokeError } = await supabase.functions.invoke('app-store-scraper', {
        body: { appStoreUrl: importerUrl, organizationId },
      });

      console.log('📦 [IMPORT] Raw response from scraper:', JSON.stringify(responseData, null, 2));

      // Handle invocation errors (e.g., function crashed, network issue, 5xx)
      if (invokeError) {
        console.error('❌ [IMPORT] Supabase function invocation error:', invokeError);
        throw new Error(`The import service is currently unavailable. Please try again later. (Details: ${invokeError.message})`);
      }

      // Handle application-level errors returned by the function (e.g., 404, 422)
      if (responseData.error) {
        console.error('❌ [IMPORT] App Store scraper application error:', responseData.error);
        throw new Error(responseData.error);
      }
      
      // Enterprise-grade data validation
      const validation = validateMetadata(responseData);
      
      if (!validation.isValid) {
        console.warn('⚠️ [IMPORT] Data validation warnings:', validation.issues);
        toast({
          title: 'Data Quality Warning',
          description: `Some app data may be incomplete: ${validation.issues.slice(0, 2).join(', ')}${validation.issues.length > 2 ? '...' : ''}`,
          variant: 'default',
        });
      }

      // Validate that we received the core data we need
      if (!validation.sanitized.name || !validation.sanitized.url || !validation.sanitized.title) {
        console.error('❌ [IMPORT] Critical data missing after validation:', validation.sanitized);
        throw new Error('Received incomplete data from the import service. The App Store page might have a non-standard format.');
      }

      toast({
        title: 'App data imported successfully!',
        description: `Now generating metadata for ${validation.sanitized.name}.`,
      });

      // Extract locale from URL for enhanced data
      const urlParts = new URL(validation.sanitized.url).pathname.split('/');
      const locale = urlParts[1] || 'us';
      
      const finalMetadata = {
        ...validation.sanitized,
        locale: locale,
      };

      console.log('🎯 [IMPORT] Final metadata being passed to workspace:', JSON.stringify(finalMetadata, null, 2));
      
      onImportSuccess(finalMetadata);

    } catch (e: any) {
      console.error('❌ [IMPORT] Import failed:', e);
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
        <CardTitle className="text-white text-lg flex items-center justify-between">
          Import from App Store
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={() => setDebugMode(!debugMode)}
              className="text-xs bg-zinc-700 px-2 py-1 rounded"
            >
              {debugMode ? 'Hide Debug' : 'Show Debug'}
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {debugMode && (
          <div className="bg-zinc-800/50 p-3 rounded text-xs text-zinc-300">
            <div>Organization ID: {organizationId || 'Not loaded'}</div>
            <div>Debug Mode: Active</div>
            <div>Check browser console for detailed logs</div>
          </div>
        )}
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
