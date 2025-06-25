
import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useAsoData } from "@/context/AsoDataContext";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

const DATE_PRESETS = [
  {
    label: "Last 7 days",
    getValue: () => ({
      from: subDays(new Date(), 7),
      to: new Date()
    })
  },
  {
    label: "Last 30 days", 
    getValue: () => ({
      from: subDays(new Date(), 30),
      to: new Date()
    })
  },
  {
    label: "Last 90 days",
    getValue: () => ({
      from: subDays(new Date(), 90),
      to: new Date()
    })
  },
  {
    label: "This month",
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: new Date()
    })
  },
  {
    label: "Last month",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth)
      };
    }
  }
];

const DatePicker: React.FC = React.memo(() => {
  const { filters, setFilters } = useAsoData();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedRange, setSelectedRange] = React.useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: filters.dateRange.from,
    to: filters.dateRange.to
  });

  // Update local state when filters change externally
  React.useEffect(() => {
    setSelectedRange({
      from: filters.dateRange.from,
      to: filters.dateRange.to
    });
  }, [filters.dateRange]);

  const handlePresetSelect = (preset: typeof DATE_PRESETS[0]) => {
    const range = preset.getValue();
    const newRange = {
      from: range.from,
      to: range.to
    };
    
    setSelectedRange(newRange);
    setFilters(prev => ({
      ...prev,
      dateRange: newRange
    }));
    setIsOpen(false);
  };

  const handleCalendarSelect = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    if (!range) return;
    
    setSelectedRange(range);
    
    // Only update filters if both dates are selected
    if (range.from && range.to) {
      setFilters(prev => ({
        ...prev,
        dateRange: {
          from: range.from!,
          to: range.to!
        }
      }));
      setIsOpen(false);
    }
  };

  const getDisplayText = () => {
    const { from, to } = selectedRange;
    
    if (!from || !to) {
      return "Select date range";
    }

    // Check if current selection matches a preset
    const matchingPreset = DATE_PRESETS.find(preset => {
      const presetRange = preset.getValue();
      return Math.abs(from.getTime() - presetRange.from.getTime()) < 1000 * 60 * 60 * 24 && // Within 1 day
             Math.abs(to.getTime() - presetRange.to.getTime()) < 1000 * 60 * 60 * 24;
    });

    if (matchingPreset) {
      return matchingPreset.label;
    }

    if (from && to) {
      return `${format(from, "MMM d")} - ${format(to, "MMM d, yyyy")}`;
    }

    return "Select date range";
  };

  return (
    <div className="flex items-center">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white min-w-[200px] justify-start"
          >
            <Calendar className="mr-2 h-4 w-4" />
            <span>{getDisplayText()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-zinc-800 border-zinc-700" align="end">
          <div className="flex">
            {/* Presets sidebar */}
            <div className="border-r border-zinc-700 p-2 w-48">
              <div className="text-sm font-medium text-zinc-300 mb-2">Quick Select</div>
              <div className="space-y-1">
                {DATE_PRESETS.map((preset) => {
                  const presetRange = preset.getValue();
                  const isActive = selectedRange.from && selectedRange.to &&
                    Math.abs(selectedRange.from.getTime() - presetRange.from.getTime()) < 1000 * 60 * 60 * 24 &&
                    Math.abs(selectedRange.to.getTime() - presetRange.to.getTime()) < 1000 * 60 * 60 * 24;
                  
                  return (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal text-zinc-300 hover:text-white hover:bg-zinc-700",
                        isActive && "bg-yodel-orange text-white hover:bg-yodel-orange/80"
                      )}
                      onClick={() => handlePresetSelect(preset)}
                    >
                      {preset.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            
            {/* Calendar */}
            <div className="p-3">
              <CalendarComponent
                mode="range"
                selected={selectedRange}
                onSelect={handleCalendarSelect}
                numberOfMonths={2}
                className="pointer-events-auto"
                classNames={{
                  day_selected: "bg-yodel-orange text-white hover:bg-yodel-orange hover:text-white",
                  day_range_middle: "bg-yodel-orange/20",
                  day_range_start: "bg-yodel-orange text-white",
                  day_range_end: "bg-yodel-orange text-white"
                }}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});

DatePicker.displayName = "DatePicker";
export default DatePicker;
