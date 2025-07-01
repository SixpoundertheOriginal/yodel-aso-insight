
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
  
  // **PHASE 1: Preserve discovery metadata across filter changes**
  const [discoveryMetadata, setDiscoveryMetadata] = useState<string[]>([]);
  
  const savedFilters = loadSavedFilters();

  // Track completion of the very first BigQuery request
  const [firstQueryCompleted, setFirstQueryCompleted] = useState(false);

  // Always start with an empty traffic source filter so discovery query is unfiltered
  const [filters, setFilters] = useState<AsoDataFilters>({
    dateRange: {
      from: subDays(new Date(), 30), // Default to last 30 days
      to: new Date(),
    },
    trafficSources: [],
    clients: ['TUI'], // Default client for BigQuery
  });

  // Inform when the unfiltered query kicks off
  useEffect(() => {
    if (filters.trafficSources.length === 0 && !firstQueryCompleted) {
      console.log('🚀 [AsoDataContext] Initial discovery query running with no traffic source filter');
    }
  }, [filters.trafficSources, firstQueryCompleted]);

  // Enhanced filter change logging with state validation
  useEffect(() => {
    console.log('🎯 [AsoDataContext] Filter state updated:', {
      dateRange: {
        from: filters.dateRange.from.toISOString().split('T')[0],
        to: filters.dateRange.to.toISOString().split('T')[0]
      },
      trafficSources: filters.trafficSources,
      trafficSourcesCount: filters.trafficSources.length,
      trafficSourcesEmpty: filters.trafficSources.length === 0,
      clients: filters.clients,
      filterDecision: filters.trafficSources.length === 0 ? 'NO_FILTER_ALL_SOURCES' : 'APPLY_SPECIFIC_FILTERS'
    });
    
    // Debug log when filters are completely cleared
    if (filters.trafficSources.length === 0) {
      console.debug('✅ [AsoDataContext] Filter cleared → trafficSources = [], expecting ALL traffic sources in response');
    }
  }, [filters]);

  // Save filters to localStorage when they change
  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  // Try BigQuery first
  const bigQueryResult = useBigQueryData(
    filters.clients,
    filters.dateRange,
    filters.trafficSources
  );

  // Mark when the initial unfiltered request has finished
  useEffect(() => {
    if (!bigQueryResult.loading && !firstQueryCompleted) {
      setFirstQueryCompleted(true);
      console.log('✅ [AsoDataContext] Initial discovery query completed');
    }
  }, [bigQueryResult.loading, firstQueryCompleted]);

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

  // **PRESERVATION: Handle discovery metadata separately**
  useEffect(() => {
    if (
      currentDataSource === 'bigquery' &&
      bigQueryResult.meta?.availableTrafficSources &&
      JSON.stringify(discoveryMetadata) !==
        JSON.stringify(bigQueryResult.meta.availableTrafficSources)
    ) {
      console.log('🔍 [Debug] Evaluating discovery metadata preservation...', {
        current: discoveryMetadata,
        incoming: bigQueryResult.meta.availableTrafficSources
      });
      console.log(
        '🔒 [Context] Preserving discovery metadata:',
        bigQueryResult.meta.availableTrafficSources
      );
      // Spread to ensure a fresh array reference is stored
      setDiscoveryMetadata([
        ...bigQueryResult.meta.availableTrafficSources
      ]);
    }
  }, [currentDataSource, bigQueryResult.meta?.availableTrafficSources, discoveryMetadata]);

  // Reapply saved filters after discovery metadata is known and first query finished
  useEffect(() => {
    if (
      firstQueryCompleted &&
      discoveryMetadata.length > 0 &&
      savedFilters.trafficSources &&
      savedFilters.trafficSources.length > 0 &&
      filters.trafficSources.length === 0
    ) {
      console.log('🔄 [AsoDataContext] Reapplying saved traffic source filters:', savedFilters.trafficSources);
      setFilters(prev => ({ ...prev, trafficSources: savedFilters.trafficSources as string[] }));
    }
  }, [firstQueryCompleted, discoveryMetadata.length, filters.trafficSources.length]);

  // **COMPUTATION: Determine best available sources**
  const bestAvailableTrafficSources = useMemo(() => {
    // Return preserved metadata if available
    if (discoveryMetadata.length > 0) {
      return [...discoveryMetadata];
    }
    // Otherwise return current metadata
    return currentDataSource === 'bigquery'
      ? [...(bigQueryResult.meta?.availableTrafficSources || [])]
      : [];
  }, [discoveryMetadata, currentDataSource, bigQueryResult.meta?.availableTrafficSources]);

  const contextValue: AsoDataContextType = {
    data: selectedResult.data,
    loading: selectedResult.loading,
    error: selectedResult.error,
    filters,
    setFilters,
    currentDataSource,
    dataSourceStatus,
    meta: currentDataSource === 'bigquery' ? bigQueryResult.meta : undefined,
    // Spread to avoid accidental external mutation of context state
    availableTrafficSources: [...bestAvailableTrafficSources],
  };

  // **DIAGNOSTIC: Understanding the traffic source issue**
  console.log('🔍 [DIAGNOSTIC] Context state:', {
    currentDataSource,
    bigQueryMeta_sources: bigQueryResult.meta?.availableTrafficSources,
    discoveryMetadata_length: discoveryMetadata.length,
    discoveryMetadata_actual: discoveryMetadata,
    bestAvailableTrafficSources_length: bestAvailableTrafficSources?.length,
    bestAvailableTrafficSources_actual: bestAvailableTrafficSources,
    contextValue_sources: contextValue.availableTrafficSources
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
