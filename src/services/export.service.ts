
import { ExportFormat } from '@/types/aso';

class ExportService {
  /**
   * Export data to JSON format
   */
  exportToJson(data: any, filename?: string): void {
    const jsonData = JSON.stringify(data, null, 2);
    this.downloadBlob(jsonData, `${filename || 'export'}.json`, 'application/json');
  }

  /**
   * Export data to CSV format
   */
  exportToCsv(data: any[], filename?: string): void {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Data must be a non-empty array for CSV export');
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma or quote
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    this.downloadBlob(csvContent, `${filename || 'export'}.csv`, 'text/csv');
  }

  /**
   * Create and download blob
   */
  private downloadBlob(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate export metadata
   */
  generateExportMetadata(additionalData?: any) {
    return {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      source: 'ASO Insights Platform',
      ...additionalData
    };
  }

  /**
   * Prepare data for export with metadata
   */
  prepareExportData(data: any, includeMetadata: boolean = true, additionalMetadata?: any) {
    const exportData = includeMetadata ? {
      metadata: this.generateExportMetadata(additionalMetadata),
      data
    } : data;

    return exportData;
  }
}

export const exportService = new ExportService();
