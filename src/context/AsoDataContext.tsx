
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAsoDataWithFallback, DataSource, CurrentDataSource } from '../hooks/useAsoDataWithFallback';
import { AsoData, DateRange } from '../hooks/useMockAsoData';

interface AsoFilters {
  clientList: string[];
  dateRange: DateRange;
  trafficSources: string[];
}

interface AsoDataContextType {
  data: AsoData | null;
  loading: boolean;
  error: Error | null;
  filters: AsoFilters;
  setFilters: React.Dispatch<React.SetStateAction<AsoFilters>>;
  // New BigQuery integration properties
  dataSource: DataSource;
  setDataSource: (source: DataSource) => void;
  currentDataSource: CurrentDataSource | null;
  dataSourceStatus: 'loading' | 'bigquery-success' | 'bigquery-failed-fallback' | 'mock-only';
}

const AsoDataContext = createContext<AsoDataContextType | undefined>(undefined);

interface AsoDataProviderProps {
  children: ReactNode;
}

export const AsoDataProvider: React.FC<AsoDataProviderProps> = ({ children }) => {
  // Default filters
  const [filters, setFilters] = useState<AsoFilters>({
    clientList: ["TUI", "YodelDelivery", "ClientX", "ClientY"],
    dateRange: {
      from: new Date(new Date().setDate(new Date().getDate() - 30)), // 30 days ago
      to: new Date(), // today
    },
    trafficSources: [
      "App Store Search",
      "App Store Browse",
      "Apple Search Ads",
      "Web Referrer", 
      "App Referrer",
      "Unknown"
    ],
  });

  // Data source management
  const [dataSource, setDataSource] = useState<DataSource>('auto');
  
  const { 
    data, 
    loading, 
    error, 
    currentDataSource, 
    dataSourceStatus 
  } = useAsoDataWithFallback(
    filters.clientList,
    filters.dateRange,
    filters.trafficSources,
    dataSource
  );
  
  const value = {
    data,
    loading,
    error,
    filters,
    setFilters,
    dataSource,
    setDataSource,
    currentDataSource,
    dataSourceStatus,
  };
  
  return (
    <AsoDataContext.Provider value={value}>
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
