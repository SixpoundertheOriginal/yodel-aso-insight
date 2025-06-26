
import { useState, useEffect } from 'react';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface MetricSummary {
  value: number;
  delta: number; // percentage change
}

export interface AsoMetrics {
  impressions: MetricSummary;
  downloads: MetricSummary;
  product_page_views: MetricSummary; // Renamed from 'pageViews' to match App Store Connect
  cvr: MetricSummary;
}

export interface TrafficSource {
  name: string;
  value: number;
  delta: number;
}

export interface TimeSeriesPoint {
  date: string;
  impressions: number;
  downloads: number;
  product_page_views: number; // Renamed to be consistent with AsoMetrics
}

export interface AsoData {
  summary: AsoMetrics;
  timeseriesData: TimeSeriesPoint[];
  trafficSources: TrafficSource[];
}

// Complete list of all available traffic sources - static and comprehensive
const ALL_AVAILABLE_TRAFFIC_SOURCES = [
  'App Store Search',
  'App Store Browse', 
  'Web Referrer',
  'Apple Search Ads',
  'App Referrer',
  'Event Notification',
  'Institutional Purchase',
  'Other'
];

export const useMockAsoData = (
  clientList: string[],
  dateRange: DateRange,
  trafficSources: string[]
): { data: AsoData | null; loading: boolean; error: Error | null } => {
  const [data, setData] = useState<AsoData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const generateMockData = async () => {
      try {
        setLoading(true);
        
        // Generate random values for metrics
        const generateMetric = (): MetricSummary => {
          const value = Math.floor(Math.random() * 99000) + 1000; // 1k to 100k
          const delta = (Math.random() * 40) - 20; // -20% to +20%
          return { value, delta };
        };
        
        // Generate summary metrics
        const summary: AsoMetrics = {
          impressions: generateMetric(),
          downloads: generateMetric(),
          product_page_views: generateMetric(), // Renamed from 'pageViews'
          cvr: { 
            value: parseFloat((Math.random() * 10).toFixed(2)), // 0 to 10%
            delta: parseFloat((Math.random() * 40 - 20).toFixed(1)) // -20% to +20%
          }
        };
        
        // Generate timeseries data for the last 30 days
        const timeseriesData: TimeSeriesPoint[] = [];
        const endDate = dateRange.to;
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 29); // 30 days including the end date
        
        for (let i = 0; i < 30; i++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(startDate.getDate() + i);
          
          timeseriesData.push({
            date: currentDate.toISOString().split('T')[0],
            impressions: Math.floor(Math.random() * 5000) + 500,
            downloads: Math.floor(Math.random() * 1000) + 100,
            product_page_views: Math.floor(Math.random() * 3000) + 300, // Renamed from 'pageViews'
          });
        }
        
        // Generate traffic source data for ALL available sources, not just selected ones
        // This fixes the circular dependency issue where only selected sources were available
        const trafficSourceData: TrafficSource[] = ALL_AVAILABLE_TRAFFIC_SOURCES.map((source) => ({
          name: source,
          value: Math.floor(Math.random() * 50000) + 5000,
          delta: parseFloat((Math.random() * 40 - 20).toFixed(1))
        }));
        
        const mockData: AsoData = {
          summary,
          timeseriesData,
          trafficSources: trafficSourceData // Always return all available sources
        };
        
        // Simulate API delay
        setTimeout(() => {
          setData(mockData);
          setLoading(false);
        }, 800);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setLoading(false);
      }
    };
    
    generateMockData();
  }, [clientList, dateRange.from, dateRange.to, trafficSources]);
  
  return { data, loading, error };
};
