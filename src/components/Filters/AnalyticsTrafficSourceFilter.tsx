
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
  const { data, availableTrafficSources } = useAsoData();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // **DIAGNOSTIC: Component received data**
  console.log('🔍 [COMPONENT DIAGNOSTIC] Filter component state:', {
    availableTrafficSources_length: availableTrafficSources?.length,
    availableTrafficSources_actual: availableTrafficSources,
    data_trafficSources_length: data?.trafficSources?.length,
    data_trafficSources_actual: data?.trafficSources?.map(s => s.name),
    timestamp: new Date().toISOString()
  });
  
  // **ENTERPRISE MULTI-TIER FALLBACK: Always ensure sources available**
  const allAvailableSources = useMemo(() => {
    // Tier 1: Use preserved discovery metadata (best)
    if (availableTrafficSources && availableTrafficSources.length > 1) {
      return availableTrafficSources.filter(Boolean).sort();
    }
    
    // Tier 2: Extract from current data (fallback)
    const dataSources = data?.trafficSources?.map(s => s.name).filter(Boolean) || [];
    if (dataSources.length > 0) {
      return dataSources.sort();
    }
    
    // Tier 3: Default enterprise sources (ultimate fallback)
    return [
      'App Referrer', 'App Store Browse', 'App Store Search', 
      'Apple Search Ads', 'Event Notification', 'Institutional Purchase', 
      'Other', 'Web Referrer'
    ];
  }, [availableTrafficSources, data?.trafficSources]);

  // **DIAGNOSTIC: Component computed sources**
  console.log('🔍 [COMPONENT DIAGNOSTIC] Computed allAvailableSources:', {
    allAvailableSources_length: allAvailableSources.length,
    allAvailableSources_actual: allAvailableSources,
    selectedSources_length: selectedSources.length,
    selectedSources_actual: selectedSources
  });
  
  // Filter sources based on search term
  const filteredSources = useMemo(() => {
    if (!searchTerm) return allAvailableSources;
    return allAvailableSources.filter(source =>
      source.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allAvailableSources, searchTerm]);
  
  // Memoized handlers for performance
  const handleSourceToggle = useMemo(() => (source: string, checked: boolean) => {
    if (disabledSources.includes(source)) return;
    
    const newSources = checked 
      ? [...selectedSources, source].filter((s, i, arr) => arr.indexOf(s) === i)
      : selectedSources.filter(s => s !== source);
    onChange(newSources);
  }, [selectedSources, onChange, disabledSources]);
  
  const handleSelectAll = useMemo(() => () => {
    if (!allowSelectAll) return;
    const enabledSources = allAvailableSources.filter(source => 
      !disabledSources.includes(source)
    );
    onChange([...enabledSources]);
  }, [allowSelectAll, allAvailableSources, disabledSources, onChange]);
  
  const handleClearAll = useMemo(() => () => {
    if (!allowClear) return;
    onChange([]);
  }, [allowClear, onChange]);
  
  // Memoized display text for performance
  const displayText = useMemo(() => {
    if (selectedSources.length === 0) return placeholder;
    
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
  }, [selectedSources, allAvailableSources, disabledSources, placeholder]);
  
  // Don't render if no sources available
  if (allAvailableSources.length === 0) {
    return null;
  }
  
  return (
    <div className={widthClass}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
          >
            <span className="truncate">{displayText}</span>
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
