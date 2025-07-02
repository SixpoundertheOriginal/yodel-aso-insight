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
  
  // ✅ NEW: Hook Registry to track ALL hook instances
  const [hookRegistry, setHookRegistry] = useState<Map<string, HookInstanceData>>(new Map());
  
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

  // ✅ NEW: Hook Registration Function
  const registerHookInstance = useCallback((instanceId: string, data: HookInstanceData) => {
    console.log(`🔄 [HOOK REGISTRY] Registering instance ${instanceId}:`, {
      sourcesCount: data.sourcesCount,
      hasData: !!data.data,
      loading: data.loading,
      error: !!data.error
    });

    setHookRegistry(prev => {
      const newRegistry = new Map(prev);
      newRegistry.set(instanceId, {
        ...data,
        lastUpdated: Date.now()
      });
      
      console.log(`📊 [REGISTRY STATUS] Total registered instances: ${newRegistry.size}`);
      console.log(`📊 [REGISTRY SUMMARY]`, Array.from(newRegistry.entries()).map(([id, data]) => ({
        id,
        sources: data.sourcesCount,
        hasData: !!data.data
      })));
      
      return newRegistry;
    });
  }, []);

  // ✅ NEW: Find Best Hook Instance
  const getBestHookData = useCallback((): HookInstanceData | null => {
    let bestInstance: HookInstanceData | null = null;
    let maxSources = 0;
    
    console.log(`🔍 [BEST HOOK SEARCH] Searching through ${hookRegistry.size} registered instances`);
    
    for (const [instanceId, data] of hookRegistry.entries()) {
      console.log(`🔍 [CHECKING INSTANCE] ${instanceId}:`, {
        sourcesCount: data.sourcesCount,
        hasData: !!data.data,
        loading: data.loading,
        error: !!data.error,
        sources: data.availableTrafficSources
      });
      
      // Only consider instances with data and no errors
      if (data.sourcesCount > maxSources && !data.error && !data.loading && data.data) {
        maxSources = data.sourcesCount;
        bestInstance = data;
        console.log(`🎯 [NEW BEST FOUND] Instance ${instanceId} with ${data.sourcesCount} sources`);
      }
    }
    
    if (bestInstance) {
      console.log(`✅ [BEST HOOK SELECTED]`, {
        instanceId: bestInstance.instanceId,
        sourcesCount: bestInstance.sourcesCount,
        sources: bestInstance.availableTrafficSources
      });
    } else {
      console.log(`❌ [NO BEST HOOK] No suitable instance found`);
    }
    
    return bestInstance;
  }, [hookRegistry]);

  // ✅ MODIFIED: Still create one hook for fallback, but don't rely on it exclusively
  const bigQueryReady = filters.clients.length > 0;
  const fallbackBigQueryResult = useBigQueryData(
    filters.clients,
    filters.dateRange,
    filters.trafficSources,
    bigQueryReady
  );

  // ✅ NEW: Register the fallback hook
  useEffect(() => {
    if (fallbackBigQueryResult.meta?.availableTrafficSources) {
      registerHookInstance('fallback-context-hook', {
        instanceId: 'fallback-context-hook',
        availableTrafficSources: fallbackBigQueryResult.meta.availableTrafficSources,
        sourcesCount: fallbackBigQueryResult.meta.availableTrafficSources.length,
        data: fallbackBigQueryResult.data,
        metadata: fallbackBigQueryResult.meta,
        loading: fallbackBigQueryResult.loading,
        error: fallbackBigQueryResult.error,
        lastUpdated: Date.now()
      });
    }
  }, [fallbackBigQueryResult.data, fallbackBigQueryResult.meta, fallbackBigQueryResult.loading, fallbackBigQueryResult.error, registerHookInstance]);

  // Fallback to mock data
  const mockResult = useMockAsoData(
    filters.clients,
    filters.dateRange,
    filters.trafficSources
  );

  // ✅ NEW: Use Best Hook Data Instead of Single Hook
  const bestHookData = getBestHookData();
  const selectedResult = bestHookData || fallbackBigQueryResult;

  // ✅ NEW: Get Available Traffic Sources from Best Hook
  const bestAvailableTrafficSources = useMemo(() => {
    if (bestHookData?.availableTrafficSources && bestHookData.availableTrafficSources.length > 0) {
      console.log('✅ [USING BEST HOOK SOURCES]', {
        instanceId: bestHookData.instanceId,
        sourcesCount: bestHookData.sourcesCount,
        sources: bestHookData.availableTrafficSources
      });
      return bestHookData.availableTrafficSources;
    }
    
    // Fallback to fallback hook
    const fallbackSources = fallbackBigQueryResult.meta?.availableTrafficSources || [];
    console.log('⏳ [USING FALLBACK SOURCES]', {
      sourcesCount: fallbackSources.length,
      sources: fallbackSources
    });
    return fallbackSources;
    
  }, [bestHookData, fallbackBigQueryResult.meta?.availableTrafficSources]);

  // Determine data source status
  useEffect(() => {
    if (selectedResult.loading) {
      setDataSourceStatus('loading');
      setCurrentDataSource('bigquery');
    } else if (selectedResult.error) {
      console.warn('BigQuery failed, using mock data:', selectedResult.error.message);
      setDataSourceStatus('fallback');
      setCurrentDataSource('mock');
    } else if (selectedResult.data) {
      setDataSourceStatus('available');
      setCurrentDataSource('bigquery');
    } else {
      setDataSourceStatus('fallback'); 
      setCurrentDataSource('mock');
    }
  }, [selectedResult.loading, selectedResult.error, selectedResult.data]);

  const contextValue: AsoDataContextType = {
    data: selectedResult.data,
    loading: selectedResult.loading,
    error: selectedResult.error,
    filters,
    setFilters,
    currentDataSource,
    dataSourceStatus,
    meta: currentDataSource === 'bigquery' ? (bestHookData?.metadata || fallbackBigQueryResult.meta) : undefined,
    availableTrafficSources: [...bestAvailableTrafficSources],
    userTouchedFilters,
    setUserTouchedFilters,
    registerHookInstance, // ✅ NEW: Expose registration function
  };

  // ✅ FINAL: Log what context provides to components
  console.log('🚨 [CONTEXT→COMPONENT] Context providing to components:');
  console.log('  availableTrafficSources:', contextValue.availableTrafficSources);
  console.log('  sourcesCount:', contextValue.availableTrafficSources?.length || 0);
  console.log('  usingBestHook:', !!bestHookData);
  console.log('  bestHookInstance:', bestHookData?.instanceId || 'none');
  console.log('  registeredInstances:', hookRegistry.size);

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
