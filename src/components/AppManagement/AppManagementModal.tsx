
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Search, Loader2, ExternalLink, Star } from 'lucide-react';
import { useAppManagement } from '@/hooks/useAppManagement';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppStoreIntegrationService } from '@/services/appstore-integration.service';
import { toast } from 'sonner';

interface App {
  id: string;
  app_name: string;
  platform: string;
  app_store_id?: string;
  bundle_id?: string;
  category?: string;
  developer_name?: string;
  app_icon_url?: string;
}

interface AppManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  app?: App | null;
  mode: 'create' | 'edit';
}

export const AppManagementModal: React.FC<AppManagementModalProps> = ({
  isOpen,
  onClose,
  app,
  mode
}) => {
  const { createApp, updateApp, isCreating, isUpdating } = useAppManagement();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    app_name: '',
    platform: 'iOS' as 'iOS' | 'Android',
    app_store_id: '',
    bundle_id: '',
    category: '',
    developer_name: '',
    app_icon_url: ''
  });

  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);

  // Reset form when modal opens/closes or app changes
  useEffect(() => {
    if (app && mode === 'edit') {
      setFormData({
        app_name: app.app_name || '',
        platform: (app.platform as 'iOS' | 'Android') || 'iOS',
        app_store_id: app.app_store_id || '',
        bundle_id: app.bundle_id || '',
        category: app.category || '',
        developer_name: app.developer_name || '',
        app_icon_url: app.app_icon_url || ''
      });
    } else {
      setFormData({
        app_name: '',
        platform: 'iOS',
        app_store_id: '',
        bundle_id: '',
        category: '',
        developer_name: '',
        app_icon_url: ''
      });
    }
    setSearchResults([]);
  }, [app, mode, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-validate App Store ID when user types it
    if (field === 'app_store_id' && value.length > 5) {
      handleValidateAppStoreId(value);
    }
  };

  const handleAppStoreSearch = async () => {
    if (!formData.app_name.trim()) {
      toast.error('Please enter an app name to search');
      return;
    }

    if (!user) {
      toast.error('Authentication required');
      return;
    }

    setIsSearching(true);
    setSearchResults(null);
    
    try {
      // Get user's organization ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        toast.error('Organization not found');
        return;
      }

      const result = await AppStoreIntegrationService.searchApp(
        formData.app_name,
        profile.organization_id
      );

      if (result.success && result.data) {
        setSearchResults(result.data);
        toast.success('App found! Click to auto-fill details.');
      } else {
        toast.error(result.error || 'No apps found for that search term');
        setSearchResults(null);
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleValidateAppStoreId = async (appStoreId: string) => {
    if (!user || appStoreId.length < 6) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) return;

      const result = await AppStoreIntegrationService.validateAppStoreId(
        appStoreId,
        formData.platform,
        profile.organization_id
      );

      if (result.success && result.data) {
        // Auto-fill some fields if validation succeeds
        setFormData(prev => ({
          ...prev,
          app_name: result.data!.name || prev.app_name,
          developer_name: result.data!.developer || prev.developer_name,
          category: result.data!.applicationCategory || prev.category,
          app_icon_url: result.data!.icon || prev.app_icon_url,
          bundle_id: result.data!.appId || prev.bundle_id
        }));
      }
    } catch (error) {
      // Silent validation - don't show errors for this
      console.log('App Store ID validation failed:', error);
    }
  };

  const selectSearchResult = (result: any) => {
    setFormData(prev => ({
      ...prev,
      app_store_id: result.appId || '',
      developer_name: result.developer || '',
      category: result.applicationCategory || '',
      app_icon_url: result.icon || '',
      bundle_id: result.appId || prev.bundle_id
    }));
    setSearchResults(null);
    toast.success('App details auto-filled from App Store');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.app_name.trim()) return;

    const submitData = {
      app_name: formData.app_name.trim(),
      platform: formData.platform,
      app_store_id: formData.app_store_id || undefined,
      bundle_id: formData.bundle_id || undefined,
      category: formData.category || undefined,
      developer_name: formData.developer_name || undefined,
      app_icon_url: formData.app_icon_url || undefined,
    };

    if (mode === 'edit' && app) {
      updateApp({ id: app.id, ...submitData });
    } else {
      createApp(submitData);
    }
    
    onClose();
  };

  const isSubmitting = isCreating || isUpdating;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-yodel-orange" />
            {mode === 'edit' ? 'Edit App' : 'Add New App'}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {mode === 'edit' 
              ? 'Update app information and settings'
              : 'Add a new app to your organization for ASO tracking'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="app_name" className="text-white">App Name *</Label>
                <Input
                  id="app_name"
                  value={formData.app_name}
                  onChange={(e) => handleInputChange('app_name', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Enter app name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="platform" className="text-white">Platform *</Label>
                <Select value={formData.platform} onValueChange={(value) => handleInputChange('platform', value)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="iOS">iOS</SelectItem>
                    <SelectItem value="Android">Android</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* App Store Search */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAppStoreSearch}
                  disabled={!formData.app_name.trim() || isSearching}
                  className="border-zinc-700 hover:bg-zinc-800"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Search App Store
                </Button>
                <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                  Auto-fill metadata
                </Badge>
              </div>

              {searchResults && (
                <div className="border border-zinc-700 rounded-lg p-3 space-y-2">
                  <div className="text-sm font-medium text-white">Search Result:</div>
                  <div
                    className="flex items-center gap-3 p-3 bg-zinc-800 rounded cursor-pointer hover:bg-zinc-700 transition-colors"
                    onClick={() => selectSearchResult(searchResults)}
                  >
                    {searchResults.icon ? (
                      <img src={searchResults.icon} alt={searchResults.name} className="w-12 h-12 rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 bg-zinc-600 rounded-lg flex items-center justify-center">
                        <Smartphone className="h-6 w-6 text-zinc-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-white font-medium">{searchResults.name}</div>
                      <div className="text-sm text-zinc-400">{searchResults.developer}</div>
                      {searchResults.rating > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-zinc-400">{searchResults.rating}</span>
                          {searchResults.reviews > 0 && (
                            <span className="text-xs text-zinc-500">({searchResults.reviews} reviews)</span>
                          )}
                        </div>
                      )}
                      {searchResults.applicationCategory && (
                        <Badge variant="outline" className="mt-1 text-xs border-zinc-600 text-zinc-400">
                          {searchResults.applicationCategory}
                        </Badge>
                      )}
                    </div>
                    <ExternalLink className="h-4 w-4 text-zinc-400" />
                  </div>
                </div>
              )}
            </div>

            {/* App Store Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="app_store_id" className="text-white">App Store ID</Label>
                <Input
                  id="app_store_id"
                  value={formData.app_store_id}
                  onChange={(e) => handleInputChange('app_store_id', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder={formData.platform === 'iOS' ? '123456789' : 'com.company.app'}
                />
              </div>
              <div>
                <Label htmlFor="bundle_id" className="text-white">Bundle ID</Label>
                <Input
                  id="bundle_id"
                  value={formData.bundle_id}
                  onChange={(e) => handleInputChange('bundle_id', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="com.company.appname"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="developer_name" className="text-white">Developer Name</Label>
                <Input
                  id="developer_name"
                  value={formData.developer_name}
                  onChange={(e) => handleInputChange('developer_name', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Company Name"
                />
              </div>
              <div>
                <Label htmlFor="category" className="text-white">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Productivity"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="app_icon_url" className="text-white">App Icon URL</Label>
              <Input
                id="app_icon_url"
                value={formData.app_icon_url}
                onChange={(e) => handleInputChange('app_icon_url', e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
                placeholder="https://example.com/icon.png"
              />
              {formData.app_icon_url && (
                <div className="mt-2">
                  <img 
                    src={formData.app_icon_url} 
                    alt="App icon preview" 
                    className="w-16 h-16 rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-zinc-700 hover:bg-zinc-800"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-yodel-orange hover:bg-orange-600"
              disabled={isSubmitting || !formData.app_name.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {mode === 'edit' ? 'Update App' : 'Create App'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
