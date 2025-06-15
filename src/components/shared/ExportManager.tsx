
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Table } from 'lucide-react';
import { exportService } from '@/services';
import { ExportFormat } from '@/types/aso';

interface ExportManagerProps {
  data: any;
  filename?: string;
  formats?: ExportFormat['format'][];
  includeMetadata?: boolean;
  additionalMetadata?: any;
  className?: string;
}

export const ExportManager: React.FC<ExportManagerProps> = ({
  data,
  filename = 'export',
  formats = ['json', 'csv'],
  includeMetadata = true,
  additionalMetadata,
  className = ''
}) => {
  const handleExport = (format: ExportFormat['format']) => {
    const exportData = exportService.prepareExportData(data, includeMetadata, additionalMetadata);
    
    switch (format) {
      case 'json':
        exportService.exportToJson(exportData, filename);
        break;
      case 'csv':
        if (Array.isArray(data)) {
          exportService.exportToCsv(data, filename);
        } else {
          console.warn('CSV export requires array data');
        }
        break;
      default:
        console.warn(`Export format ${format} not supported yet`);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'json':
        return <FileText className="w-4 h-4" />;
      case 'csv':
        return <Table className="w-4 h-4" />;
      default:
        return <Download className="w-4 h-4" />;
    }
  };

  return (
    <div className={`flex space-x-2 ${className}`}>
      {formats.map(format => (
        <Button
          key={format}
          variant="outline"
          size="sm"
          onClick={() => handleExport(format)}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          {getFormatIcon(format)}
          <span className="ml-1 capitalize">{format}</span>
        </Button>
      ))}
    </div>
  );
};
