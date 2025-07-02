import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback, useRef } from 'react';
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
  
  // ✅ LOOP FIX: Track last registered data to prevent duplicate registrations
  const lastRegisteredDataRef = useRef<Map<string, string>>(new Map());
  
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

  // ✅ LOOP FIX: Stable registration function that prevents duplicate registrations
  const registerHookInstance = useCallback((instanceId: string, data: HookInstanceData) => {
    // Create a hash of the important data to detect if it actually changed
    const dataHash = JSON.stringify({
      sourcesCount: data.sourcesCount,
      availableTrafficSources: data.availableTrafficSources,
      loading: data.loading,
      hasData: !!data.data,
      hasError: !!data.error
    });

    // Check if this is the same data as last registration
    const lastDataHash = lastRegisteredDataRef.current.get(instanceId);
    if (lastDataHash === dataHash) {
      console.log(`🚫 [LOOP PREVENTION] Instance ${instanceId} - skipping duplicate registration`);
      return; // Skip registration - same data
    }

    // Update the hash tracker
    lastRegisteredDataRef.current.set(instanceId, dataHash);

    console.log(`🔄 [HOOK REGISTRY] Registering instance ${instanceId}:`, {
      sourcesCount: data.sourcesCount,
      hasData: !!data.data,
      loading: data.loading,
      error: !!data.error,
      dataHash: dataHash.slice(0, 50) + '...' // Log partial hash for debugging
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
  }, []); // ✅ LOOP FIX: Empty dependency array - stable reference

  // ✅ MEMOIZE: Best hook data to prevent unnecessary recalculations
  const bestHookData = useMemo(() => {
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

  // ✅ MEMOIZE: Selected result to prevent object reference changes
  const selectedResult = useMemo(() => {
    return bestHookData || fallbackBigQueryResult;
  }, [bestHookData, fallbackBigQueryResult.data, fallbackBigQueryResult.loading, fallbackBigQueryResult.error]);

  // ✅ NUCLEAR OPTION: Stop all state updates that cause re-renders
  const stableStatusRef = useRef<{ status: DataSourceStatus; source: DataSource }>({
    status: 'loading',
    source: 'bigquery'
  });

  // ✅ NUCLEAR: Use refs instead of state to prevent re-renders entirely
  const statusUpdaterRef = useRef<() => void>();
  statusUpdaterRef.current = () => {
    let newStatus: DataSourceStatus;
    let newSource: DataSource;

    if (selectedResult.loading) {
      newStatus = 'loading';
      newSource = 'bigquery';
    } else if (selectedResult.error) {
      newStatus = 'fallback';
      newSource = 'mock';
    } else if (selectedResult.data) {
      newStatus = 'available';
      newSource = 'bigquery';
    } else {
      newStatus = 'fallback';
      newSource = 'mock';
    }

    // Only update if genuinely different
    if (stableStatusRef.current.status !== newStatus || stableStatusRef.current.source !== newSource) {
      console.log('🔄 [STATUS CHANGE] Updating:', { from: stableStatusRef.current, to: { status: newStatus, source: newSource } });
      stableStatusRef.current = { status: newStatus, source: newSource };
      
      // Batch state updates to prevent multiple re-renders
      React.startTransition(() => {
        setDataSourceStatus(newStatus);
        setCurrentDataSource(newSource);
      });
    }
  };

  // ✅ NUCLEAR: Only update status when actual data state changes - use minimal dependencies
  useEffect(() => {
    statusUpdaterRef.current?.();
  }, [!!selectedResult.loading, !!selectedResult.error, !!selectedResult.data]); // Only booleans, no object references

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
