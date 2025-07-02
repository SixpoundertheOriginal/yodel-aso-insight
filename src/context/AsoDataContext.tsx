import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { useBigQueryData } from '../hooks/useBigQueryData';
import { useMockAsoData, type AsoData, type DateRange, type TrafficSource } from '../hooks/useMockAsoData';
import { subDays } from 'date-fns';

interface AsoDataFilters {
  dateRange: DateRange;
  trafficSources: string[];
  clients: string[];
}

type DataSource = 'mock' | 'bigquery';
type DataSourceStatus = 'available' | 'loading' | 'error' | 'fallback';

interface BigQueryMeta {
  rowCount: number;
  totalRows: number;
  executionTimeMs: number;
  queryParams: {
    client: string;
    dateRange: { from: string; to: string } | null;
    limit: number;
  };
  projectId: string;
  timestamp: string;
  debug?: {
    queryPreview: string;
    parameterCount: number;
    jobComplete: boolean;
  };
}

// Hook Registry Interface
interface HookInstanceData {
  instanceId: string;
  availableTrafficSources: string[];
  sourcesCount: number;
  data: any;
  metadata: any;
  loading: boolean;
  error?: Error;
  lastUpdated: number;
}

interface AsoDataContextType {
  data: AsoData | null;
  loading: boolean;
  error: Error | null;
  filters: AsoDataFilters;
  setFilters: React.Dispatch<React.SetStateAction<AsoDataFilters>>;
  currentDataSource: DataSource;
  dataSourceStatus: DataSourceStatus;
  meta?: BigQueryMeta;
  availableTrafficSources?: string[];
  userTouchedFilters: boolean;
  setUserTouchedFilters: React.Dispatch<React.SetStateAction<boolean>>;
  // New: Hook registration system
  registerHookInstance: (instanceId: string, data: HookInstanceData) => void;
}

const AsoDataContext = createContext<AsoDataContextType | undefined>(undefined);

interface AsoDataProviderProps {
  children: ReactNode;
}

// Local storage key for persisting filter preferences
const FILTER_STORAGE_KEY = 'aso-dashboard-filters';

// Load saved filters from localStorage
const loadSavedFilters = (): Partial<AsoDataFilters> => {
  try {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        trafficSources: Array.isArray(parsed.trafficSources) ? parsed.trafficSources : []
      };
    }
  } catch (error) {
    console.warn('Failed to load saved filters:', error);
  }
  return {};
};

// Save filters to localStorage
const saveFilters = (filters: AsoDataFilters) => {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({
      trafficSources: filters.trafficSources
    }));
  } catch (error) {
    console.warn('Failed to save filters:', error);
  }
};

export const AsoDataProvider: React.FC<AsoDataProviderProps> = ({ children }) => {
  const [currentDataSource, setCurrentDataSource] = useState<DataSource>('bigquery');
  const [dataSourceStatus, setDataSourceStatus] = useState<DataSourceStatus>('loading');
  
  // Simplified hook registry - no longer needed for main data flow
  const [discoveredTrafficSources, setDiscoveredTrafficSources] = useState<string[]>([]);
  
  const savedFilters = loadSavedFilters();
  const [userTouchedFilters, setUserTouchedFilters] = useState(false);

  const [filters, setFilters] = useState<AsoDataFilters>({
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date(),
    },
    trafficSources: [],
    clients: ['TUI'],
  });

  // Save filters to localStorage when they change
  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  // Simplified registration - just update discovered sources directly
  const registerHookInstance = useCallback((instanceId: string, data: HookInstanceData) => {
    console.log(`🔄 [SIMPLE REGISTRATION] Instance ${instanceId}:`, {
      sourcesCount: data.sourcesCount,
      sources: data.availableTrafficSources
    });

    if (data.availableTrafficSources && data.availableTrafficSources.length > 0) {
      setDiscoveredTrafficSources(prev => {
        const newSources = [...new Set([...prev, ...data.availableTrafficSources])];
        console.log(`📊 [DISCOVERED SOURCES UPDATE] ${prev.length} → ${newSources.length}:`, newSources);
        return newSources;
      });
    }
  }, []);

  // Simplified - no complex best hook selection needed

  // Single hook for data - no circular dependency
  const bigQueryReady = filters.clients.length > 0;
  const bigQueryResult = useBigQueryData(
    filters.clients,
    filters.dateRange,
    filters.trafficSources,
    bigQueryReady
  );

  // Register discovered sources from the main hook
  useEffect(() => {
    if (bigQueryResult.meta?.availableTrafficSources) {
      const sources = bigQueryResult.meta.availableTrafficSources;
      console.log(`📊 [MAIN HOOK] Discovered ${sources.length} sources:`, sources);
      setDiscoveredTrafficSources(sources);
    }
  }, [bigQueryResult.meta?.availableTrafficSources]);

  // Fallback to mock data
  const mockResult = useMockAsoData(
    filters.clients,
    filters.dateRange,
    filters.trafficSources
  );

  // Use discovered sources with priority system
  const bestAvailableTrafficSources = useMemo(() => {
    console.log('🔍 [PRIORITY SYSTEM] Evaluating sources:');
    console.log('  1. discoveredTrafficSources:', discoveredTrafficSources);
    console.log('  2. bigQueryResult.meta sources:', bigQueryResult.meta?.availableTrafficSources);
    console.log('  3. data sources:', bigQueryResult.data?.trafficSources?.map(s => s.name));
    
    // Priority 1: Discovered sources (from successful queries)
    if (discoveredTrafficSources.length > 0) {
      console.log('✅ [PRIORITY 1] Using discoveredTrafficSources:', discoveredTrafficSources);
      return discoveredTrafficSources;
    }
    
    // Priority 2: Current meta sources
    if (bigQueryResult.meta?.availableTrafficSources?.length > 0) {
      console.log('✅ [PRIORITY 2] Using meta sources:', bigQueryResult.meta.availableTrafficSources);
      return bigQueryResult.meta.availableTrafficSources;
    }
    
    // Priority 3: Data sources
    const dataSources = bigQueryResult.data?.trafficSources?.map(s => s.name).filter(Boolean) || [];
    if (dataSources.length > 0) {
      console.log('✅ [PRIORITY 3] Using data sources:', dataSources);
      return dataSources;
    }
    
    console.log('⚠️ [PRIORITY FALLBACK] Using default sources');
    return ['App Store Search', 'App Store Browse', 'Apple Search Ads'];
  }, [discoveredTrafficSources, bigQueryResult.meta?.availableTrafficSources, bigQueryResult.data?.trafficSources]);

  // Determine data source status
  useEffect(() => {
    if (bigQueryResult.loading) {
      setDataSourceStatus('loading');
      setCurrentDataSource('bigquery');
    } else if (bigQueryResult.error) {
      console.warn('BigQuery failed, using mock data:', bigQueryResult.error.message);
      setDataSourceStatus('fallback');
      setCurrentDataSource('mock');
    } else if (bigQueryResult.data) {
      setDataSourceStatus('available');
      setCurrentDataSource('bigquery');
    } else {
      setDataSourceStatus('fallback'); 
      setCurrentDataSource('mock');
    }
  }, [bigQueryResult.loading, bigQueryResult.error, bigQueryResult.data]);

  const contextValue: AsoDataContextType = {
    data: bigQueryResult.data,
    loading: bigQueryResult.loading,
    error: bigQueryResult.error,
    filters,
    setFilters,
    currentDataSource,
    dataSourceStatus,
    meta: currentDataSource === 'bigquery' ? bigQueryResult.meta : undefined,
    availableTrafficSources: [...bestAvailableTrafficSources],
    userTouchedFilters,
    setUserTouchedFilters,
    registerHookInstance,
  };

  // Final logging
  console.log('🚨 [CONTEXT→COMPONENT] Final context values:');
  console.log('  availableTrafficSources:', contextValue.availableTrafficSources);
  console.log('  sourcesCount:', contextValue.availableTrafficSources?.length || 0);
  console.log('  discoveredTrafficSources:', discoveredTrafficSources);

  return (
    <AsoDataContext.Provider value={contextValue}>
      {children}
    </AsoDataContext.Provider>
  );
};

export const useAsoData = (): AsoDataContextType => {
  const context = useContext(AsoDataContext);
  if (context === undefined) {
    throw new Error('useAsoData must be used within an AsoDataProvider');
  }
  return context;
};
