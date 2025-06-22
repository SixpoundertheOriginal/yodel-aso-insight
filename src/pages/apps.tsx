
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/layouts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Search, 
  BarChart3, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  ToggleLeft,
  ToggleRight,
  MoreVertical,
  Plus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useApp } from '@/context/AppContext';
import { useAppManagement } from '@/hooks/useAppManagement';
import { AppUsageDashboard } from '@/components/AppManagement/AppUsageDashboard';
import { AppManagementModal } from '@/components/AppManagement/AppManagementModal';
import { AuditLogViewer } from '@/components/AppManagement/AuditLogViewer';

const AppsPage: React.FC = () => {
  const { apps, selectedApp, setSelectedApp, isLoading } = useApp();
  const { deleteApp, toggleAppStatus, canAddApp } = useAppManagement();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingApp, setEditingApp] = useState<any>(null);

  const handleAddApp = () => {
    setModalMode('create');
    setEditingApp(null);
    setModalOpen(true);
  };

  const handleEditApp = (app: any) => {
    setModalMode('edit');
    setEditingApp(app);
    setModalOpen(true);
  };

  const handleDeleteApp = (appId: string) => {
    if (confirm('Are you sure you want to delete this app? This action cannot be undone.')) {
      deleteApp(appId);
    }
  };

  const handleToggleStatus = (appId: string, currentStatus: boolean) => {
    toggleAppStatus({ appId, isActive: !currentStatus });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Apps</h1>
            <p className="text-zinc-400">Loading your apps...</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-zinc-900/50 border-zinc-800 animate-pulse">
                <CardContent className="p-6">
                  <div className="h-32 bg-zinc-700 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Apps</h1>
          <p className="text-zinc-400">
            Manage and analyze your apps with enterprise-grade controls and monitoring.
          </p>
        </div>

        {/* Usage Dashboard */}
        <AppUsageDashboard onAddApp={handleAddApp} />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Apps Grid */}
          <div className="lg:col-span-2">
            {apps.length === 0 ? (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-12 text-center">
                  <Smartphone className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Apps Found</h3>
                  <p className="text-zinc-400 mb-4">
                    You don't have any apps in your organization yet.
                  </p>
                  <Button 
                    onClick={handleAddApp}
                    disabled={!canAddApp}
                    className="bg-yodel-orange hover:bg-orange-600 disabled:bg-zinc-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First App
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {apps.map((app) => (
                  <Card 
                    key={app.id} 
                    className={`bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer ${
                      selectedApp?.id === app.id ? 'ring-2 ring-yodel-orange border-yodel-orange' : ''
                    }`}
                    onClick={() => setSelectedApp(app)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {app.app_icon_url ? (
                            <img 
                              src={app.app_icon_url} 
                              alt={app.app_name}
                              className="h-12 w-12 rounded-xl flex-shrink-0"
                            />
                          ) : (
                            <div className="h-12 w-12 bg-zinc-700 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Smartphone className="h-6 w-6 text-zinc-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-white text-lg truncate">{app.app_name}</CardTitle>
                            <CardDescription className="text-zinc-400 truncate">
                              {app.developer_name || 'Unknown Developer'}
                            </CardDescription>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {selectedApp?.id === app.id && (
                            <Badge className="bg-yodel-orange text-white">Selected</Badge>
                          )}
                          {!app.is_active && (
                            <Badge variant="secondary" className="bg-zinc-700 text-zinc-400">
                              Inactive
                            </Badge>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleEditApp(app);
                              }}>
                                <Edit3 className="h-4 w-4 mr-2" />
                                Edit App
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStatus(app.id, app.is_active);
                              }}>
                                {app.is_active ? (
                                  <>
                                    <ToggleLeft className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <ToggleRight className="h-4 w-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-zinc-700" />
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteApp(app.id);
                                }}
                                className="text-red-400 focus:text-red-400"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete App
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                          {app.platform}
                        </Badge>
                        {app.category && (
                          <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                            {app.category}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-zinc-800/50 rounded">
                          <div className="text-xs text-zinc-400">Rank</div>
                          <div className="text-sm font-semibold text-white">#47</div>
                        </div>
                        <div className="p-2 bg-zinc-800/50 rounded">
                          <div className="text-xs text-zinc-400">Keywords</div>
                          <div className="text-sm font-semibold text-white">156</div>
                        </div>
                        <div className="p-2 bg-zinc-800/50 rounded">
                          <div className="text-xs text-zinc-400">Trend</div>
                          <div className="text-sm font-semibold text-green-400">↗ +12%</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          asChild 
                          size="sm" 
                          className="flex-1 bg-yodel-orange hover:bg-orange-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link to="/keyword-intelligence">
                            <Search className="h-4 w-4 mr-1" />
                            Keywords
                          </Link>
                        </Button>
                        <Button 
                          asChild 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 border-zinc-700 hover:bg-zinc-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link to="/dashboard">
                            <BarChart3 className="h-4 w-4 mr-1" />
                            Analytics
                          </Link>
                        </Button>
                      </div>

                      {app.app_store_id && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full text-zinc-400 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = app.platform === 'iOS' 
                              ? `https://apps.apple.com/app/id${app.app_store_id}`
                              : `https://play.google.com/store/apps/details?id=${app.app_store_id}`;
                            window.open(url, '_blank');
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View in Store
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Audit Log Sidebar */}
          <div>
            <AuditLogViewer />
          </div>
        </div>

        {/* App Management Modal */}
        <AppManagementModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          app={editingApp}
          mode={modalMode}
        />
      </div>
    </MainLayout>
  );
};

export default AppsPage;
