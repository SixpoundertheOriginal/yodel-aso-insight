
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface App {
  id: string;
  app_name: string;
  platform: string;
  app_store_id?: string;
  category?: string;
  developer_name?: string;
  app_icon_url?: string;
  is_active: boolean;
}

interface AppContextType {
  apps: App[];
  selectedApp: App | null;
  setSelectedApp: (app: App | null) => void;
  isLoading: boolean;
  error: Error | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [selectedApp, setSelectedApp] = useState<App | null>(null);

  // Get user's organization apps
  const { data: apps = [], isLoading, error } = useQuery({
    queryKey: ['user-apps'],
    queryFn: async () => {
      if (!user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) return [];

      const { data: apps, error } = await supabase
        .from('apps')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .order('app_name');

      if (error) throw error;
      return apps || [];
    },
    enabled: !!user,
  });

  // Auto-select first app if none selected
  useEffect(() => {
    if (apps.length > 0 && !selectedApp) {
      setSelectedApp(apps[0]);
    }
  }, [apps, selectedApp]);

  const value = {
    apps,
    selectedApp,
    setSelectedApp,
    isLoading,
    error: error as Error | null
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
