import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
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
}

const AsoDataContext = createContext<AsoDataContextType | undefined>(undefined);

interface AsoDataProviderProps {
  children: ReactNode;
}

// Local storage helpers
const FILTER_STORAGE_KEY = 'aso-dashboard-filters';

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
  const [userTouchedFilters, setUserTouchedFilters] = useState(false);

  // ✅ CLEAN ARCHITECTURE: Single source of truth for traffic sources
  const [allDiscoveredSources, setAllDiscoveredSources] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<AsoDataFilters>({
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date(),
    },
    trafficSources: [],
    clients: ['TUI'],
  });

  // Save filters when they change
  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  // ✅ CLEAN: Single discovery hook - no filters for maximum discovery
  const discoveryHook = useBigQueryData(
    filters.clients,
    filters.dateRange,
    [], // NO traffic source filters - discover all sources
    filters.clients.length > 0
  );

  // ✅ CLEAN: Single data hook - with filters for actual data
  const dataHook = useBigQueryData(
    filters.clients,
    filters.dateRange,
    filters.trafficSources,
    filters.clients.length > 0
  );

  // ✅ CLEAN: Accumulate all discovered sources (no circular dependencies)
  useEffect(() => {
    if (discoveryHook.meta?.availableTrafficSources) {
      const sources = discoveryHook.meta.availableTrafficSources;
      console.log(`🔍 [DISCOVERY] Found ${sources.length} sources:`, sources);
      
      setAllDiscoveredSources(prev => {
        const newSet = new Set([...prev, ...sources]);
        if (newSet.size !== prev.size) {
          console.log(`📊 [SOURCES UPDATED] ${prev.size} → ${newSet.size}:`, Array.from(newSet));
        }
        return newSet;
      });
    }
  }, [discoveryHook.meta?.availableTrafficSources]);

  // ✅ CLEAN: Also collect from data hook if it has more sources
  useEffect(() => {
    if (dataHook.meta?.availableTrafficSources) {
      const sources = dataHook.meta.availableTrafficSources;
      console.log(`🔍 [DATA HOOK] Found ${sources.length} sources:`, sources);
      
      setAllDiscoveredSources(prev => {
        const newSet = new Set([...prev, ...sources]);
        if (newSet.size !== prev.size) {
          console.log(`📊 [DATA SOURCES UPDATED] ${prev.size} → ${newSet.size}:`, Array.from(newSet));
        }
        return newSet;
      });
    }
  }, [dataHook.meta?.availableTrafficSources]);

  // ✅ CLEAN: Use discovered sources with stable reference
  const availableTrafficSources = useMemo(() => {
    const sources = Array.from(allDiscoveredSources).sort();
    console.log(`✅ [FINAL SOURCES] Providing ${sources.length} sources to components:`, sources);
    return sources;
  }, [allDiscoveredSources]);

  // Mock data fallback
  const mockResult = useMockAsoData(
    filters.clients,
    filters.dateRange,
    filters.trafficSources
  );

  // Select data source
  const selectedResult = currentDataSource === 'bigquery' && !dataHook.error 
    ? dataHook 
    : mockResult;

  // Determine data source status
  useEffect(() => {
    if (dataHook.loading) {
      setDataSourceStatus('loading');
      setCurrentDataSource('bigquery');
    } else if (dataHook.error) {
      console.warn('BigQuery failed, using mock data:', dataHook.error.message);
      setDataSourceStatus('fallback');
      setCurrentDataSource('mock');
    } else if (dataHook.data) {
      setDataSourceStatus('available');
      setCurrentDataSource('bigquery');
    } else {
      setDataSourceStatus('fallback'); 
      setCurrentDataSource('mock');
    }
  }, [dataHook.loading, dataHook.error, dataHook.data]);

  const contextValue: AsoDataContextType = {
    data: selectedResult.data,
    loading: selectedResult.loading,
    error: selectedResult.error,
    filters,
    setFilters,
    currentDataSource,
    dataSourceStatus,
    meta: currentDataSource === 'bigquery' ? dataHook.meta : undefined,
    availableTrafficSources,
    userTouchedFilters,
    setUserTouchedFilters,
  };

  console.log('🚨 [CONTEXT FINAL] Providing to components:', {
    availableTrafficSources: contextValue.availableTrafficSources,
    sourcesCount: contextValue.availableTrafficSources?.length || 0,
    discoveredTotal: allDiscoveredSources.size,
    dataLoading: dataHook.loading,
    discoveryLoading: discoveryHook.loading
  });

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
