// src/pages/dashboard.tsx
import React, { useState, useEffect } from "react";
import { MainLayout } from "../layouts";
import KpiCard from "../components/KpiCard";
import TimeSeriesChart from "../components/TimeSeriesChart";
import ComparisonChart from "../components/ComparisonChart";
import { useAsoData } from "../context/AsoDataContext";
import { useComparisonData } from "../hooks/useComparisonData";
import { Toggle } from "@/components/ui/toggle";
import { Card, CardContent } from "@/components/ui/card";

const Dashboard: React.FC = () => {
  const [excludeAsa, setExcludeAsa] = useState(false);
  const { data, loading, filters, setFilters } = useAsoData();

  // Update traffic sources when excludeAsa toggles
  useEffect(() => {
    if (excludeAsa) {
      setFilters(prev => ({
        ...prev,
        trafficSources: prev.trafficSources.filter(src => src !== "Apple Search Ads"),
      }));
    } else {
      setFilters(prev =>
        prev.trafficSources.includes("Apple Search Ads")
          ? prev
          : { ...prev, trafficSources: [...prev.trafficSources, "Apple Search Ads"] }
      );
    }
  }, [excludeAsa, setFilters]);

  const periodComparison = useComparisonData("period");
  const yearComparison = useComparisonData("year");
  
  // Console logs for debugging
  console.log("Period comparison current data:", periodComparison.current?.timeseriesData);
  console.log("Period comparison previous data:", periodComparison.previous?.timeseriesData);
  console.log("Sample data point:", periodComparison.current?.timeseriesData?.[0]);

  if (loading || !data) {
    return (
      <MainLayout>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-zinc-800 animate-pulse rounded-md"></div>
          ))}
        </div>
        <div className="h-64 bg-zinc-800 animate-pulse rounded-md"></div>
      </MainLayout>
    );
  }

  // Add null/undefined checks for the summary data
  const impressionsValue = data.summary?.impressions?.value || 0;
  const impressionsDelta = data.summary?.impressions?.delta || 0;
  const downloadsValue = data.summary?.downloads?.value || 0;
  const downloadsDelta = data.summary?.downloads?.delta || 0;
  const pageViewsValue = data.summary?.product_page_views?.value || 0;
  const pageViewsDelta = data.summary?.product_page_views?.delta || 0;
  const cvrValue = data.summary?.cvr?.value || 0;
  const cvrDelta = data.summary?.cvr?.delta || 0;

  return (
    <MainLayout>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <KpiCard
          title="Impressions"
          value={impressionsValue}
          delta={impressionsDelta}
        />
        <KpiCard
          title="Downloads"
          value={downloadsValue}
          delta={downloadsDelta}
        />
        <KpiCard
          title="Product Page Views"
          value={pageViewsValue}
          delta={pageViewsDelta}
        />
        <KpiCard 
          title="CVR" 
          value={cvrValue} 
          delta={cvrDelta} 
        />
      </div>

      {/* Exclude ASA Toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center">
          <span className="text-sm text-zinc-400 mr-2">Exclude ASA</span>
          <Toggle
            pressed={excludeAsa}
            onPressedChange={setExcludeAsa}
            aria-label="Exclude Apple Search Ads"
          />
        </div>
      </div>

      {/* Performance Metrics Chart */}
      <Card className="bg-zinc-800 rounded-md mb-8">
        <CardContent className="p-6">
          <h2 className="text-lg font-medium mb-4">Performance Metrics</h2>
          {data.timeseriesData && <TimeSeriesChart data={data.timeseriesData} />}
        </CardContent>
      </Card>

      {/* Previous Period Comparison */}
      {!periodComparison.loading &&
        periodComparison.current &&
        periodComparison.previous && (
          <Card className="bg-zinc-800 rounded-md mb-8">
            <CardContent className="p-6">
              <h2 className="text-lg font-medium mb-4">Previous Period</h2>
              <ComparisonChart
                currentData={periodComparison.current.timeseriesData}
                previousData={periodComparison.previous.timeseriesData}
                title="Previous Period"
                metric="downloads"
              />
            </CardContent>
          </Card>
        )}

      {/* Previous Year Comparison */}
      {!yearComparison.loading &&
        yearComparison.current &&
        yearComparison.previous && (
          <Card className="bg-zinc-800 rounded-md mb-8">
            <CardContent className="p-6">
              <h2 className="text-lg font-medium mb-4">Previous Year</h2>
              <ComparisonChart
                currentData={yearComparison.current.timeseriesData}
                previousData={yearComparison.previous.timeseriesData}
                title="Previous Year"
                metric="downloads"
              />
            </CardContent>
          </Card>
        )}
    </MainLayout>
  );
};

export default Dashboard;
