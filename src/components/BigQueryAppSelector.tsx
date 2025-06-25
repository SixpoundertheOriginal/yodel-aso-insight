
import React from 'react';
import { Database, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBigQueryApps } from '@/hooks/useBigQueryApps';

interface BigQueryAppSelectorProps {
  organizationId?: string;
  selectedApps: string[];
  onSelectionChange: (selectedApps: string[]) => void;
  className?: string;
}

export const BigQueryAppSelector: React.FC<BigQueryAppSelectorProps> = ({
  organizationId,
  selectedApps,
  onSelectionChange,
  className = ""
}) => {
  const { data: bigQueryApps, isLoading, error } = useBigQueryApps(organizationId);

  const handleSelectionChange = (value: string) => {
    if (value === 'all') {
      // Select all available apps
      const allAppIds = bigQueryApps?.map(app => app.app_identifier) || [];
      onSelectionChange(allAppIds);
    } else {
      // Single app selection for now - can be extended to multi-select later
      onSelectionChange([value]);
    }
  };

  const getDisplayValue = () => {
    if (!bigQueryApps || bigQueryApps.length === 0) {
      return "No apps available";
    }

    if (selectedApps.length === 0 || selectedApps.length === bigQueryApps.length) {
      return `All Apps (${bigQueryApps.length})`;
    }

    if (selectedApps.length === 1) {
      const app = bigQueryApps.find(app => app.app_identifier === selectedApps[0]);
      return app?.app_name || app?.app_identifier || 'Unknown App';
    }

    return `${selectedApps.length} Apps Selected`;
  };

  if (error) {
    console.error('BigQuery apps error:', error);
    return (
      <div className={`flex items-center gap-2 text-sm text-red-400 ${className}`}>
        <Database className="h-4 w-4" />
        <span>Error loading apps</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-zinc-400 ${className}`}>
        <Database className="h-4 w-4 animate-pulse" />
        <span>Loading apps...</span>
      </div>
    );
  }

  if (!bigQueryApps || bigQueryApps.length === 0) {
    return (
      <div className={`flex items-center gap-2 text-sm text-zinc-400 ${className}`}>
        <Database className="h-4 w-4" />
        <span>No BigQuery apps</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Database className="h-4 w-4 text-blue-400" />
      <Select
        value={selectedApps.length === bigQueryApps.length || selectedApps.length === 0 ? 'all' : selectedApps[0]}
        onValueChange={handleSelectionChange}
      >
        <SelectTrigger className="w-[180px] h-8 bg-zinc-800 border-zinc-700 text-white">
          <SelectValue>
            <span className="text-sm">{getDisplayValue()}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          <SelectItem value="all" className="text-white hover:bg-zinc-700">
            All Apps ({bigQueryApps.length})
          </SelectItem>
          {bigQueryApps.map((app) => (
            <SelectItem 
              key={app.id} 
              value={app.app_identifier}
              className="text-white hover:bg-zinc-700"
            >
              {app.app_name || app.app_identifier}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
