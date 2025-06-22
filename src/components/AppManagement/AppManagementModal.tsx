
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Search, Loader2, ExternalLink } from 'lucide-react';
import { useAppManagement } from '@/hooks/useAppManagement';

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
  const [searchResults, setSearchResults] = useState<any[]>([]);

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
  };

  const handleAppStoreSearch = async () => {
    if (!formData.app_name.trim()) return;
    
    setIsSearching(true);
    // Mock search results - in real implementation, this would call App Store API
    setTimeout(() => {
      setSearchResults([
        {
          id: '123456789',
          name: formData.app_name,
          developer: 'Example Developer',
          category: 'Productivity',
          icon: 'https://via.placeholder.com/60x60',
          bundleId: 'com.example.app'
        }
      ]);
      setIsSearching(false);
    }, 1000);
  };

  const selectSearchResult = (result: any) => {
    setFormData(prev => ({
      ...prev,
      app_store_id: result.id,
      developer_name: result.developer,
      category: result.category,
      app_icon_url: result.icon,
      bundle_id: result.bundleId
    }));
    setSearchResults([]);
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

              {searchResults.length > 0 && (
                <div className="border border-zinc-700 rounded-lg p-3 space-y-2">
                  <div className="text-sm font-medium text-white">Search Results:</div>
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 bg-zinc-800 rounded cursor-pointer hover:bg-zinc-700"
                      onClick={() => selectSearchResult(result)}
                    >
                      <img src={result.icon} alt={result.name} className="w-8 h-8 rounded" />
                      <div className="flex-1">
                        <div className="text-white font-medium">{result.name}</div>
                        <div className="text-xs text-zinc-400">{result.developer} • {result.category}</div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-zinc-400" />
                    </div>
                  ))}
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
                  placeholder="123456789"
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
