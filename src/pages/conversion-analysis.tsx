import React from "react";
import { MainLayout } from "../layouts";
import { useAsoData } from "../context/AsoDataContext";
import KpiCard from "../components/KpiCard";
import TimeSeriesChart from "../components/TimeSeriesChart";
import { TrafficSourceSelect } from "../components/Filters";
import useSourceFiltering from "../hooks/useSourceFiltering";

const ConversionAnalysisPage: React.FC = () => {
  const { data, loading } = useAsoData();
  
  const {
    selectedSources,
    setSelectedSources,
    filteredData,
    filteredSources,
    allSourceNames
  } = useSourceFiltering(
    data?.timeseriesData,
    data?.trafficSources
  );

  // Display a loading state when data is being fetched
  if (loading || !data) {
    return (
      <MainLayout>
        <div className="flex flex-col space-y-6">
          <h1 className="text-2xl font-bold">Conversion Analysis</h1>
          {/* Loading state for the cumulative section */}
          <div className="flex justify-center">
            <div className="w-64 h-32 bg-zinc-800 animate-pulse rounded-md"></div>
          </div>
          {/* Loading state for the time series chart */}
          <div className="h-64 bg-zinc-800 animate-pulse rounded-md"></div>
          {/* Loading state for traffic source cards */}
          <h2 className="text-xl font-semibold mt-6">By Traffic Source</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-zinc-800 animate-pulse rounded-md"></div>
            ))}
          </div>
          {/* Loading state for the second time series chart */}
          <div className="h-64 bg-zinc-800 animate-pulse rounded-md"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-col space-y-6">
        <h1 className="text-2xl font-bold">Conversion Analysis</h1>
        
        {/* Cumulative Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Cumulative</h2>
          <div className="flex justify-center">
            <div className="w-64">
              <KpiCard
                title="Conversion Rate"
                value={data.summary.cvr.value}
                delta={data.summary.cvr.delta} // Using delta instead of change to match existing implementation
              />
            </div>
          </div>
        </section>
        
        {/* Main Time Series Chart with Filter */}
        <section className="mt-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
            <h2 className="text-xl font-semibold">Conversion Rate Over Time</h2>
            <TrafficSourceSelect 
              selectedSources={selectedSources} 
              onSourceChange={setSelectedSources} 
            />
          </div>
          <TimeSeriesChart data={data.timeseriesData} />
        </section>
        
        {/* By Traffic Source Section */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-4">By Traffic Source</h2>
          
          {selectedSources.length === 0 ? (
            <div className="bg-zinc-800 p-8 rounded-md text-center">
              <p className="text-gray-400">No traffic sources selected. Please select at least one source to view data.</p>
            </div>
          ) : (
            <>
              {/* Traffic Source KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                {filteredSources.map((source) => (
                  <KpiCard
                    key={source.name}
                    title={source.name}
                    value={source.value}
                    delta={source.delta} // Using delta instead of change to match existing implementation
                  />
                ))}
              </div>
              
              {/* Traffic Source Time Series Chart */}
              <TimeSeriesChart 
                data={filteredData} 
              />
            </>
          )}
        </section>
      </div>
    </MainLayout>
  );
};

export default ConversionAnalysisPage;
