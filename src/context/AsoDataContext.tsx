
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

  // **FIXED DISCOVERY ACCUMULATION: Always store the maximum sources found**
  useEffect(() => {
    const bestSources = bestMetadata?.availableTrafficSources || [];
    
    console.log('🔍 [DISCOVERY FIX] Discovery accumulation check:', {
      bestMetadataExists: !!bestMetadata,
      bestSources: bestSources,
      bestSourcesCount: bestSources.length,
      currentDiscovered: discoveredTrafficSources,
      currentDiscoveredCount: discoveredTrafficSources.length,
      shouldUpdate: bestSources.length > 0 && bestSources.length >= discoveredTrafficSources.length,
      willForceUpdate: bestSources.length >= 8
    });
    
    // **CRITICAL FIX: Update if we have ANY sources from best metadata**
    if (bestSources.length > 0) {
      // Always update if we found more sources OR if we have the complete set (8+)
      if (bestSources.length > discoveredTrafficSources.length || bestSources.length >= 8) {
        console.log('🔍 [DISCOVERY FIX] Updating discovered sources:', {
          reason: bestSources.length >= 8 ? 'COMPLETE_SET_FOUND' : 'MORE_SOURCES_FOUND',
          from: discoveredTrafficSources.length,
          to: bestSources.length,
          newSources: bestSources
        });
        setDiscoveredTrafficSources([...bestSources]);
      }
    }
  }, [bestMetadata, bestMetadata?.availableTrafficSources]);

  // **IMMEDIATE OVERRIDE: Force complete update when we find 8+ sources**
  useEffect(() => {
    if (bestSourceCount >= 8 && bestMetadata?.availableTrafficSources?.length >= 8) {
      const completeSources = bestMetadata.availableTrafficSources;
      console.log('⚡ [IMMEDIATE OVERRIDE] Force setting complete traffic sources:', {
        sources: completeSources,
        count: completeSources.length,
        previousDiscovered: discoveredTrafficSources.length
      });
      setDiscoveredTrafficSources([...completeSources]);
    }
  }, [bestSourceCount, bestMetadata?.availableTrafficSources]);

  // **ENHANCED: Always return the best available sources with detailed logging**
  const bestAvailableTrafficSources = useMemo(() => {
    console.log('🔄 [BEST_SOURCES_CALC] Calculating best available sources:', {
      step: 'CALCULATION_START',
      discoveredCount: discoveredTrafficSources.length,
      discoveredSources: discoveredTrafficSources,
      bestMetadataCount: bestMetadata?.availableTrafficSources?.length || 0,
      bestMetadataSources: bestMetadata?.availableTrafficSources || [],
      currentCount: bigQueryResult.meta?.availableTrafficSources?.length || 0,
      currentSources: bigQueryResult.meta?.availableTrafficSources || []
    });

    // **PRIORITY 1: Use discovered sources if we have the complete set**
    if (discoveredTrafficSources.length >= 8) {
      console.log('✅ [PRIORITY_1] Using complete discovered traffic sources:', {
        count: discoveredTrafficSources.length,
        sources: discoveredTrafficSources
      });
      return [...discoveredTrafficSources];
    }
    
    // **PRIORITY 2: Use best metadata if it has complete sources**
    if (bestMetadata?.availableTrafficSources && bestMetadata.availableTrafficSources.length >= 8) {
      console.log('✅ [PRIORITY_2] Using complete best metadata sources:', {
        count: bestMetadata.availableTrafficSources.length,
        sources: bestMetadata.availableTrafficSources
      });
      return [...bestMetadata.availableTrafficSources];
    }

    // **PRIORITY 3: Use discovered sources even if incomplete**
    if (discoveredTrafficSources.length > 0) {
      console.log('✅ [PRIORITY_3] Using incomplete discovered sources:', {
        count: discoveredTrafficSources.length,
        sources: discoveredTrafficSources
      });
      return [...discoveredTrafficSources];
    }
    
    // **PRIORITY 4: Use best metadata even if incomplete**
    if (bestMetadata?.availableTrafficSources && bestMetadata.availableTrafficSources.length > 0) {
      console.log('✅ [PRIORITY_4] Using incomplete best metadata sources:', {
        count: bestMetadata.availableTrafficSources.length,
        sources: bestMetadata.availableTrafficSources
      });
      return [...bestMetadata.availableTrafficSources];
    }
    
    // **PRIORITY 5: Fallback to current hook data**
    const currentSources = bigQueryResult.meta?.availableTrafficSources || [];
    console.log('⏳ [PRIORITY_5] Using current hook sources as final fallback:', {
      count: currentSources.length,
      sources: currentSources
    });
    return [...currentSources];
  }, [discoveredTrafficSources, bestMetadata?.availableTrafficSources, bigQueryResult.meta?.availableTrafficSources]);

  const contextValue: AsoDataContextType = {
    data: selectedResult.data,
    loading: selectedResult.loading,
    error: selectedResult.error,
    filters,
    setFilters,
    currentDataSource,
    dataSourceStatus,
    meta: currentDataSource === 'bigquery' ? (bestMetadata || bigQueryResult.meta) : undefined,
    // **CRITICAL: Ensure fresh array reference for components**
    availableTrafficSources: [...bestAvailableTrafficSources],
    userTouchedFilters,
    setUserTouchedFilters,
  };

  // **FINAL VALIDATION: Log what context is providing to components**
  console.log('🚨 [CONTEXT→COMPONENT] Context providing to components:', {
    availableTrafficSources: contextValue.availableTrafficSources,
    sourcesCount: contextValue.availableTrafficSources?.length || 0,
    bestCalculated: bestAvailableTrafficSources,
    bestCalculatedCount: bestAvailableTrafficSources.length,
    bestMetadataExists: !!bestMetadata,
    bestSourceCount: bestSourceCount
  });

  // **DEBUG: Monitor hook selection and traffic source state**
  console.log('🔍 [SMART SELECTION DEBUG] Complete state summary:', {
    phase: 'FINAL_CHECK',
    currentHookSources: bigQueryResult.meta?.availableTrafficSources?.length || 0,
    bestHookSources: bestSourceCount,
    discoveredCount: discoveredTrafficSources.length,
    bestAvailableCount: bestAvailableTrafficSources.length,
    contextProvidingCount: contextValue.availableTrafficSources?.length || 0,
    finalSources: contextValue.availableTrafficSources,
    usingBestMetadata: !!bestMetadata,
    filterState: filters.trafficSources.length === 0 ? 'UNFILTERED' : 'FILTERED',
    dataFlowCheck: {
      'bestMetadata → discovered': bestMetadata?.availableTrafficSources?.length || 0,
      'discovered → bestAvailable': bestAvailableTrafficSources.length,
      'bestAvailable → context': contextValue.availableTrafficSources?.length || 0
    }
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
