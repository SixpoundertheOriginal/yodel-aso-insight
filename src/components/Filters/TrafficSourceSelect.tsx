
import React from "react";
import { useAsoData } from "@/context/AsoDataContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TrafficSourceSelectProps {
  selectedSources: string[];
  onSourceChange: (sources: string[]) => void;
}

const TrafficSourceSelect: React.FC<TrafficSourceSelectProps> = ({
  selectedSources,
  onSourceChange,
}) => {
  const { data } = useAsoData();
  
  if (!data?.trafficSources) return null;
  
  // Get unique traffic sources from BigQuery data
  const sources = data.trafficSources.map(source => source.name).filter(Boolean);
  
  // Determine current selection value for the dropdown
  const getCurrentValue = () => {
    if (selectedSources.length === 0 || selectedSources.length === sources.length) {
      return "all";
    }
    if (selectedSources.length === 1) {
      return selectedSources[0];
    }
    return "multiple";
  };
  
  const handleSourceChange = (value: string) => {
    console.log('🎯 [TrafficSourceSelect] Source changed to:', value);
    
    if (value === "all") {
      // Select all available sources (which means no filtering - show all data)
      onSourceChange([]);
      console.log('🎯 [TrafficSourceSelect] Selected all sources (no filter)');
    } else {
      // Select specific source
      onSourceChange([value]);
      console.log('🎯 [TrafficSourceSelect] Selected single source:', value);
    }
  };
  
  const displayValue = () => {
    const currentValue = getCurrentValue();
    if (currentValue === "all") {
      return `All Sources (${sources.length})`;
    }
    if (currentValue === "multiple") {
      return `${selectedSources.length} Selected`;
    }
    return currentValue;
  };
  
  console.log('📊 [TrafficSourceSelect] Available sources:', sources);
  console.log('📊 [TrafficSourceSelect] Selected sources:', selectedSources);
  console.log('📊 [TrafficSourceSelect] Current value:', getCurrentValue());
  
  return (
    <div className="w-full md:w-64">
      <Select 
        value={getCurrentValue()}
        onValueChange={handleSourceChange}
      >
        <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-white">
          <SelectValue>
            <span className="text-sm">{displayValue()}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          <SelectItem value="all" className="text-white hover:bg-zinc-700">
            All Sources ({sources.length})
          </SelectItem>
          {sources.map((source) => (
            <SelectItem 
              key={source} 
              value={source}
              className="text-white hover:bg-zinc-700"
            >
              {source}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TrafficSourceSelect;
