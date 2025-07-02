
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

// Local storage key for persisting filter preferences
const FILTER_STORAGE_KEY = 'aso-dashboard-filters';

// Load saved filters from localStorage
const loadSavedFilters = (): Partial<AsoDataFilters> => {
  try {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Only restore traffic sources if they exist and are an array, not date ranges (those should be fresh)
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
    // Only save traffic sources for persistence
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
  
  const savedFilters = loadSavedFilters();

  // **PERMANENT DISCOVERY STATE: Never gets overwritten**
  const [discoveredTrafficSources, setDiscoveredTrafficSources] = useState<string[]>([]);

  // Track if the user has manually modified filters in the UI
  const [userTouchedFilters, setUserTouchedFilters] = useState(false);

  // Always start with an empty traffic source filter so discovery query is unfiltered
  const [filters, setFilters] = useState<AsoDataFilters>({
    dateRange: {
      from: subDays(new Date(), 30), // Default to last 30 days
      to: new Date(),
    },
    trafficSources: [],
    clients: ['TUI'], // Default client for BigQuery
  });



  // Save filters to localStorage when they change
  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  // Try BigQuery first - MAIN AUTHORITATIVE SOURCE
  const bigQueryReady = filters.clients.length > 0;
  const bigQueryResult = useBigQueryData(
    filters.clients,
    filters.dateRange,
    filters.trafficSources,
    bigQueryReady
  );
  
  // **CRITICAL: Ensure this is the MAIN hook instance - tag it for debugging**
  console.log('🚨 [MAIN CONTEXT HOOK] This is the authoritative BigQuery hook for traffic sources');

  // Fallback to mock data - pass all required arguments
  const mockResult = useMockAsoData(
    filters.clients,
    filters.dateRange,
    filters.trafficSources
  );

  // Determine which data source to use and manage status
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

  // Select the appropriate data source
  const selectedResult = currentDataSource === 'bigquery' && !bigQueryResult.error 
    ? bigQueryResult 
    : mockResult;

  // **SMART HOOK SELECTION: Track best metadata from any hook instance**
  const [bestMetadata, setBestMetadata] = useState<any>(null);
  const [bestSourceCount, setBestSourceCount] = useState(0);

  // **CRITICAL DEBUG: Track what Context receives from Hook**
  useEffect(() => {
    const currentSources = bigQueryResult.meta?.availableTrafficSources || [];
    const currentCount = currentSources.length;
    
    console.log('🚨 [CONTEXT→HOOK DEBUG] What Context sees from BigQuery Hook:', {
      loading: bigQueryResult.loading,
      error: bigQueryResult.error?.message,
      hasData: !!bigQueryResult.data,
      hasMeta: !!bigQueryResult.meta,
      metaKeys: bigQueryResult.meta ? Object.keys(bigQueryResult.meta) : [],
      availableTrafficSources: currentSources,
      sourcesCount: currentCount,
      dataSource: currentDataSource,
      filterState: filters.trafficSources.length === 0 ? 'UNFILTERED' : 'FILTERED',
      bestSourceCountSoFar: bestSourceCount
    });

    // **SMART SELECTION: Use hook instance with most sources**
    if (currentCount > bestSourceCount) {
      console.log('🎯 [SMART SELECTION] Found better hook instance with more sources:', {
        previousBest: bestSourceCount,
        newBest: currentCount,
        sources: currentSources
      });
      setBestMetadata(bigQueryResult.meta);
      setBestSourceCount(currentCount);
    } else if (currentCount < bestSourceCount) {
      console.log('🚫 [SMART SELECTION] Ignoring hook instance with fewer sources:', {
        currentCount,
        bestCount: bestSourceCount,
        reason: 'FEWER_SOURCES_THAN_BEST'
      });
    }
  }, [
    bigQueryResult.loading, 
    bigQueryResult.error, 
    bigQueryResult.data, 
    bigQueryResult.meta,
    bigQueryResult.meta?.availableTrafficSources,
    currentDataSource,
    filters.trafficSources.length,
    bestSourceCount
  ]);

  // **DISCOVERY ACCUMULATION: Use best metadata to update discovered sources**
  useEffect(() => {
    const bestSources = bestMetadata?.availableTrafficSources || [];
    
    console.log('🔍 [DISCOVERY] Using best metadata for sources update:', {
      bestSources,
      bestCount: bestSources.length,
      discoveredCount: discoveredTrafficSources.length,
      shouldUpdate: bestSources.length > discoveredTrafficSources.length
    });
    
    if (bestSources.length > discoveredTrafficSources.length) {
      console.log('🔍 [DISCOVERY] Found more traffic sources from best hook:', {
        current: discoveredTrafficSources.length,
        new: bestSources.length,
        sources: bestSources
      });
      setDiscoveredTrafficSources([...bestSources]);
    }
  }, [bestMetadata?.availableTrafficSources, discoveredTrafficSources.length]);

  // **ALWAYS RETURN DISCOVERED SOURCES: Never gets filtered or reduced**
  const bestAvailableTrafficSources = useMemo(() => {
    if (discoveredTrafficSources.length > 0) {
      console.log('✅ [STABLE] Using discovered traffic sources:', discoveredTrafficSources);
      return [...discoveredTrafficSources];
    }
    
    // Fallback to best metadata while discovery is happening
    const bestSources = bestMetadata?.availableTrafficSources || [];
    console.log('⏳ [FALLBACK] Using best metadata sources while discovering:', bestSources);
    return [...bestSources];
  }, [discoveredTrafficSources, bestMetadata?.availableTrafficSources]);

  const contextValue: AsoDataContextType = {
    data: selectedResult.data,
    loading: selectedResult.loading,
    error: selectedResult.error,
    filters,
    setFilters,
    currentDataSource,
    dataSourceStatus,
    meta: currentDataSource === 'bigquery' ? (bestMetadata || bigQueryResult.meta) : undefined,
    // Spread to avoid accidental external mutation of context state
    availableTrafficSources: [...bestAvailableTrafficSources],
    userTouchedFilters,
    setUserTouchedFilters,
  };

  // **DEBUG: Monitor hook selection and traffic source state**
  console.log('🔍 [SMART SELECTION DEBUG] Hook selection state:', {
    currentHookSources: bigQueryResult.meta?.availableTrafficSources?.length || 0,
    bestHookSources: bestSourceCount,
    discoveredCount: discoveredTrafficSources.length,
    finalCount: bestAvailableTrafficSources.length,
    finalSources: bestAvailableTrafficSources,
    usingBestMetadata: !!bestMetadata,
    filterState: filters.trafficSources.length === 0 ? 'UNFILTERED' : 'FILTERED'
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
