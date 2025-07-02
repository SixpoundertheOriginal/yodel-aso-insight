
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

  // Try BigQuery first
  const bigQueryReady = filters.clients.length > 0;
  const bigQueryResult = useBigQueryData(
    filters.clients,
    filters.dateRange,
    filters.trafficSources,
    bigQueryReady
  );

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

  // **SYNCHRONIZED PRESERVATION: Get all available traffic sources immediately**
  const bestAvailableTrafficSources = useMemo(() => {
    const currentSources = bigQueryResult.meta?.availableTrafficSources || [];
    
    // When we have an unfiltered query (empty filters) and BigQuery sources
    if (filters.trafficSources.length === 0 && currentSources.length > 0) {
      console.log('🔍 [SYNC FIX] Preserving discovery metadata:', currentSources);
      return [...currentSources];
    }
    
    // When we have filtered query, check if we have cached sources in localStorage
    if (filters.trafficSources.length > 0) {
      const stored = localStorage.getItem('aso-traffic-sources-cache');
      if (stored) {
        try {
          const cachedSources = JSON.parse(stored);
          if (Array.isArray(cachedSources) && cachedSources.length > 0) {
            console.log('🔍 [SYNC FIX] Using cached traffic sources:', cachedSources);
            return [...cachedSources];
          }
        } catch (e) {
          console.warn('Failed to parse cached traffic sources');
        }
      }
    }
    
    // Fallback to current sources
    return [...currentSources];
  }, [bigQueryResult.meta?.availableTrafficSources, filters.trafficSources.length]);

  // Cache traffic sources when we have them from unfiltered query
  useEffect(() => {
    const currentSources = bigQueryResult.meta?.availableTrafficSources || [];
    if (filters.trafficSources.length === 0 && currentSources.length > 0) {
      localStorage.setItem('aso-traffic-sources-cache', JSON.stringify(currentSources));
      console.log('🔍 [SYNC FIX] Cached traffic sources for future use:', currentSources);
    }
  }, [bigQueryResult.meta?.availableTrafficSources, filters.trafficSources.length]);

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
    userTouchedFilters,
    setUserTouchedFilters,
  };

  // **VALIDATION: Check final result**
  console.log('✅ [VALIDATION] Final traffic sources:', {
    count: bestAvailableTrafficSources.length,
    sources: bestAvailableTrafficSources,
    hasAllExpected: bestAvailableTrafficSources.length >= 7, // Expect at least 7 sources
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
