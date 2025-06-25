
import React, { useState, useMemo } from "react";
import { useAsoData } from "@/context/AsoDataContext";
import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

interface TrafficSourceSelectProps {
  selectedSources: string[];
  onSourceChange: (sources: string[]) => void;
}

const TrafficSourceSelect: React.FC<TrafficSourceSelectProps> = ({
  selectedSources,
  onSourceChange,
}) => {
  const { data } = useAsoData();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Get stable list of all available traffic sources from BigQuery data
  const allAvailableSources = useMemo(() => {
    if (!data?.trafficSources) return [];
    return data.trafficSources
      .map(source => source.name)
      .filter(Boolean)
      .sort(); // Sort alphabetically for consistent display
  }, [data?.trafficSources]);
  
  // Filter sources based on search term
  const filteredSources = useMemo(() => {
    if (!searchTerm) return allAvailableSources;
    return allAvailableSources.filter(source =>
      source.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allAvailableSources, searchTerm]);
  
  // Handle individual source toggle
  const handleSourceToggle = (source: string, checked: boolean) => {
    if (checked) {
      // Add source if not already selected
      if (!selectedSources.includes(source)) {
        onSourceChange([...selectedSources, source]);
      }
    } else {
      // Remove source
      onSourceChange(selectedSources.filter(s => s !== source));
    }
  };
  
  // Handle Select All
  const handleSelectAll = () => {
    onSourceChange([...allAvailableSources]);
  };
  
  // Handle Clear All
  const handleClearAll = () => {
    onSourceChange([]);
  };
  
  // Generate display text for the button
  const getDisplayText = () => {
    if (selectedSources.length === 0) {
      return "All Traffic Sources";
    }
    
    if (selectedSources.length === allAvailableSources.length) {
      return `All Sources (${allAvailableSources.length})`;
    }
    
    if (selectedSources.length === 1) {
      return selectedSources[0];
    }
    
    if (selectedSources.length <= 2) {
      return selectedSources.join(", ");
    }
    
    return `${selectedSources.length} Sources Selected`;
  };
  
  // Don't render if no sources available
  if (allAvailableSources.length === 0) {
    return null;
  }
  
  console.log('📊 [TrafficSourceSelect] Multi-select state:', {
    allAvailableSources: allAvailableSources.length,
    selectedSources: selectedSources.length,
    displayText: getDisplayText(),
    searchTerm
  });
  
  return (
    <div className="w-full md:w-80">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
          >
            <span className="truncate">{getDisplayText()}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-0 bg-zinc-800 border-zinc-700" 
          align="end"
        >
          <div className="p-3">
            {/* Search bar (only show if more than 5 sources) */}
            {allAvailableSources.length > 5 && (
              <>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    placeholder="Search sources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-zinc-900 border-zinc-600 text-white placeholder-zinc-400"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Separator className="bg-zinc-700 mb-3" />
              </>
            )}
            
            {/* Select All / Clear All buttons */}
            <div className="flex gap-2 mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="flex-1 text-zinc-300 hover:text-white hover:bg-zinc-700"
                disabled={selectedSources.length === allAvailableSources.length}
              >
                <Check className="h-4 w-4 mr-1" />
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="flex-1 text-zinc-300 hover:text-white hover:bg-zinc-700"
                disabled={selectedSources.length === 0}
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
            
            <Separator className="bg-zinc-700 mb-3" />
            
            {/* Source list with checkboxes */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredSources.length === 0 ? (
                <div className="text-center text-zinc-400 py-4">
                  No sources found matching "{searchTerm}"
                </div>
              ) : (
                filteredSources.map((source) => {
                  const isSelected = selectedSources.includes(source);
                  
                  return (
                    <div
                      key={source}
                      className="flex items-center space-x-3 px-2 py-2 rounded hover:bg-zinc-700 cursor-pointer"
                      onClick={() => handleSourceToggle(source, !isSelected)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => 
                          handleSourceToggle(source, checked as boolean)
                        }
                        className="border-zinc-600 data-[state=checked]:bg-yodel-orange data-[state=checked]:border-yodel-orange"
                      />
                      <span className="text-white text-sm flex-1 cursor-pointer">
                        {source}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Summary footer */}
            <Separator className="bg-zinc-700 mt-3 mb-2" />
            <div className="text-xs text-zinc-400 px-2">
              {selectedSources.length === 0
                ? "All traffic sources will be included"
                : `${selectedSources.length} of ${allAvailableSources.length} sources selected`
              }
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TrafficSourceSelect;
