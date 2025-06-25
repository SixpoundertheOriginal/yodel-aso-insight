
import React, { useState } from "react";
import { MainLayout } from "../layouts";
import { useAsoData } from "../context/AsoDataContext";
import ComparisonChart from "../components/ComparisonChart";
import { useComparisonData } from "../hooks";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AiInsightsPanel } from "../components/AiInsightsPanel";
import { TrafficSourceSelect } from "@/components/Filters";

const OverviewPage: React.FC = () => {
  const { data, loading, filters, setFilters } = useAsoData();
  const { current, previous } = useComparisonData('period');
  
  // Local state for traffic source selection to avoid global state conflicts
  const [selectedSources, setSelectedSources] = useState<string[]>(
    filters.trafficSources
  );

  // Handle traffic source filter change
  const handleSourceChange = (sources: string[]) => {
    console.log('🎯 [Overview] Traffic source filter changed:', sources);
    setSelectedSources(sources);
    setFilters(prev => ({
      ...prev,
      trafficSources: sources
    }));
  };

  console.log('📊 [Overview] Current data:', { 
    loading, 
    hasData: !!data, 
    selectedSources,
    filtersTrafficSources: filters.trafficSources 
  });

  return (
    <MainLayout>
      <div className="flex flex-col space-y-10">
        {/* AI Insights Panel - Top Priority */}
        <div className="mb-6">
          <AiInsightsPanel maxDisplayed={3} />
        </div>

        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-white">Performance Overview</h1>
          
          <div className="flex gap-4">
            {/* Traffic Source Filter - Only control that should be on page level */}
            <TrafficSourceSelect 
              selectedSources={selectedSources}
              onSourceChange={handleSourceChange}
            />
          </div>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 gap-10">
            {[1, 2, 3].map((_, index) => (
              <Card key={index} className="bg-zinc-900 border-zinc-800 shadow-lg">
                <CardHeader>
                  <CardTitle>
                    <Skeleton className="h-8 w-48" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[500px] w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Charts */}
        {!loading && current && previous && (
          <div className="grid grid-cols-1 gap-10">
            {/* Impressions Chart */}
            <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
              <CardHeader className="bg-zinc-900/80 backdrop-filter backdrop-blur-sm border-b border-zinc-800/50">
                <CardTitle className="text-2xl font-bold text-white">Impressions</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <ComparisonChart
                  currentData={current.timeseriesData}
                  previousData={previous.timeseriesData}
                  title="Impressions"
                  metric="impressions"
                />
              </CardContent>
            </Card>
            
            {/* Downloads Chart */}
            <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
              <CardHeader className="bg-zinc-900/80 backdrop-filter backdrop-blur-sm border-b border-zinc-800/50">
                <CardTitle className="text-2xl font-bold text-white">Downloads</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <ComparisonChart
                  currentData={current.timeseriesData}
                  previousData={previous.timeseriesData}
                  title="Downloads"
                  metric="downloads"
                />
              </CardContent>
            </Card>
            
            {/* Conversion Rate Chart - calculated as (downloads/impressions)*100 */}
            <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
              <CardHeader className="bg-zinc-900/80 backdrop-filter backdrop-blur-sm border-b border-zinc-800/50">
                <CardTitle className="text-2xl font-bold text-white">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {data && data.summary && (
                  <>
                    <div className="mb-10">
                      <div className="h-[250px]">
                        <div className="flex flex-col h-full justify-center items-center">
                          <div className="text-8xl font-bold text-yodel-orange">
                            {((data.summary.downloads.value / data.summary.impressions.value) * 100).toFixed(1)}%
                          </div>
                          <div className="flex items-center mt-8">
                            <span className={`text-2xl ${data.summary.cvr.delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {data.summary.cvr.delta >= 0 ? '↑' : '↓'}
                              {Math.abs(data.summary.cvr.delta).toFixed(1)}%
                            </span>
                            <span className="text-xl text-zinc-400 ml-3">vs previous period</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8">
                      <div className="h-[220px]">
                        <div className="grid grid-cols-2 gap-8 h-full">
                          <div className="stat-card flex flex-col justify-center">
                            <div className="text-zinc-400 mb-3 text-lg">Total Impressions</div>
                            <div className="text-4xl font-bold text-white">
                              {data.summary.impressions.value.toLocaleString()}
                            </div>
                            <div className={`text-base mt-4 ${data.summary.impressions.delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {data.summary.impressions.delta >= 0 ? '↑' : '↓'} 
                              {Math.abs(data.summary.impressions.delta).toFixed(1)}% vs previous
                            </div>
                          </div>
                          
                          <div className="stat-card flex flex-col justify-center">
                            <div className="text-zinc-400 mb-3 text-lg">Total Downloads</div>
                            <div className="text-4xl font-bold text-white">
                              {data.summary.downloads.value.toLocaleString()}
                            </div>
                            <div className={`text-base mt-4 ${data.summary.downloads.delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {data.summary.downloads.delta >= 0 ? '↑' : '↓'} 
                              {Math.abs(data.summary.downloads.delta).toFixed(1)}% vs previous
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default OverviewPage;
