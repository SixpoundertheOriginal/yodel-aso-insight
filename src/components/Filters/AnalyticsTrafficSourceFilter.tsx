
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

/**
 * Shared Analytics Traffic Source Filter Component
 * 
 * A multi-select filter for traffic sources used across all Analytics & Insights pages.
 * This component provides consistent UX and behavior for filtering ASO data by traffic sources.
 * 
 * Features:
 * - Multi-select with checkboxes
 * - Search functionality (when >5 sources)
 * - Select All / Clear All actions
 * - Stable source list (non-mutable)
 * - Integration with AsoDataContext
 * 
 * Usage Examples:
 * 
 * // Basic usage (Overview page - already implemented)
 * <AnalyticsTrafficSourceFilter 
 *   selectedSources={filters.trafficSources}
 *   onChange={handleSourceChange}
 * />
 * 
 * // TODO: Dashboard page usage
 * <AnalyticsTrafficSourceFilter 
 *   selectedSources={dashboardFilters.trafficSources}
 *   onChange={setDashboardTrafficSources}
 *   allowClear={true}
 * />
 * 
 * // TODO: Conversion Analysis page usage
 * <AnalyticsTrafficSourceFilter 
 *   selectedSources={conversionFilters.trafficSources}
 *   onChange={setConversionTrafficSources}
 *   disabledSources={['App Store Browse']} // Example: disable if no conversion data
 * />
 */

interface AnalyticsTrafficSourceFilterProps {
  /** Currently selected traffic sources */
  selectedSources: string[];
  /** Callback when selection changes */
  onChange: (sources: string[]) => void;
  /** Optional sources to disable (gray out with tooltip) */
  disabledSources?: string[];
  /** Whether to show Select All button (default: true) */
  allowSelectAll?: boolean;
  /** Whether to show Clear All button (default: true) */
  allowClear?: boolean;
  /** Custom placeholder text for the trigger button */
  placeholder?: string;
  /** Custom width class (default: w-full md:w-80) */
  widthClass?: string;
}

const AnalyticsTrafficSourceFilter: React.FC<AnalyticsTrafficSourceFilterProps> = ({
  selectedSources,
  onChange,
  disabledSources = [],
  allowSelectAll = true,
  allowClear = true,
  placeholder = "All Traffic Sources",
  widthClass = "w-full md:w-80"
}) => {
  const { data } = useAsoData();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Get stable list of all available traffic sources from BigQuery data
  // This list should remain consistent and not be filtered by user selection
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
    if (disabledSources.includes(source)) return;
    
    if (checked) {
      // Add source if not already selected
      if (!selectedSources.includes(source)) {
        const newSources = [...selectedSources, source];
        console.debug(`✅ [TrafficSourceFilter] Source added: ${source}, new selection:`, newSources);
        onChange(newSources);
      }
    } else {
      // Remove source
      const newSources = selectedSources.filter(s => s !== source);
      console.debug(`➖ [TrafficSourceFilter] Source removed: ${source}, new selection:`, newSources);
      onChange(newSources);
    }
  };
  
  // Handle Select All
  const handleSelectAll = () => {
    if (!allowSelectAll) return;
    const enabledSources = allAvailableSources.filter(source => 
      !disabledSources.includes(source)
    );
    console.debug('✅ [TrafficSourceFilter] Select All triggered, sources:', enabledSources);
    onChange([...enabledSources]);
  };
  
  // Enhanced Clear All with comprehensive state reset
  const handleClearAll = () => {
    if (!allowClear) return;
    console.debug('🧹 [TrafficSourceFilter] Clear All triggered → trafficSources = []');
    onChange([]); // This should result in no filtering (show all sources)
  };
  
  // Generate display text for the button
  const getDisplayText = () => {
    if (selectedSources.length === 0) {
      // When no sources are selected, we show all sources
      return placeholder;
    }
    
    const enabledSources = allAvailableSources.filter(source => 
      !disabledSources.includes(source)
    );
    
    if (selectedSources.length === enabledSources.length) {
      return `All Sources (${enabledSources.length})`;
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
  
  // Enhanced state logging for debugging filter issues
  console.log('📊 [AnalyticsTrafficSourceFilter] Multi-select state:', {
    allAvailableSources: allAvailableSources.length,
    selectedSources: selectedSources.length,
    selectedSourcesList: selectedSources,
    disabledSources: disabledSources.length,
    displayText: getDisplayText(),
    searchTerm,
    isNoFilterState: selectedSources.length === 0,
    filterDecision: selectedSources.length === 0 ? 'SHOW_ALL_SOURCES' : 'APPLY_FILTER'
  });
  
  return (
    <div className={widthClass}>
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
              {allowSelectAll && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="flex-1 text-zinc-300 hover:text-white hover:bg-zinc-700"
                  disabled={selectedSources.length === allAvailableSources.filter(s => !disabledSources.includes(s)).length}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Select All
                </Button>
              )}
              {allowClear && (
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
              )}
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
                  const isDisabled = disabledSources.includes(source);
                  
                  return (
                    <div
                      key={source}
                      className={`flex items-center space-x-3 px-2 py-2 rounded ${
                        isDisabled 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:bg-zinc-700 cursor-pointer'
                      }`}
                      onClick={() => !isDisabled && handleSourceToggle(source, !isSelected)}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={isDisabled}
                        onCheckedChange={(checked) => 
                          !isDisabled && handleSourceToggle(source, checked as boolean)
                        }
                        className="border-zinc-600 data-[state=checked]:bg-yodel-orange data-[state=checked]:border-yodel-orange"
                      />
                      <span className={`text-sm flex-1 ${
                        isDisabled ? 'text-zinc-500' : 'text-white cursor-pointer'
                      }`}>
                        {source}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Enhanced summary footer with filter state info */}
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

export default AnalyticsTrafficSourceFilter;
