import React, { createContext, useContext, ReactNode } from 'react';
import { useTrafficSourceDiscovery } from '../hooks/useTrafficSourceDiscovery';

interface TrafficSourceContextType {
  availableTrafficSources: string[];
  loading: boolean;
  error: Error | null;
  lastUpdated: number;
}

const TrafficSourceContext = createContext<TrafficSourceContextType | undefined>(undefined);

interface TrafficSourceProviderProps {
  children: ReactNode;
  clientList?: string[];
  enabled?: boolean;
}

/**
 * TOP-LEVEL Provider for traffic source discovery
 * This should be mounted ONCE at the app level to prevent re-mounting storms
 */
export const TrafficSourceProvider: React.FC<TrafficSourceProviderProps> = ({ 
  children, 
  clientList = ['TUI'], 
  enabled = true 
}) => {
  console.log('🏗️ [TRAFFIC SOURCE PROVIDER] Initializing singleton discovery provider');
  
  // ✅ SINGLETON: One discovery hook for entire app
  const discoveryResult = useTrafficSourceDiscovery(clientList, enabled);
  
  console.log('🎯 [TRAFFIC SOURCE PROVIDER] Providing discovery result:', {
    sourcesCount: discoveryResult.availableTrafficSources.length,
    sources: discoveryResult.availableTrafficSources,
    loading: discoveryResult.loading,
    error: discoveryResult.error?.message,
    lastUpdated: new Date(discoveryResult.lastUpdated).toISOString()
  });

  return (
    <TrafficSourceContext.Provider value={discoveryResult}>
      {children}
    </TrafficSourceContext.Provider>
  );
};

/**
 * Hook to consume traffic source discovery from singleton provider
 */
export const useTrafficSources = (): TrafficSourceContextType => {
  const context = useContext(TrafficSourceContext);
  if (context === undefined) {
    throw new Error('useTrafficSources must be used within a TrafficSourceProvider');
  }
  return context;
};