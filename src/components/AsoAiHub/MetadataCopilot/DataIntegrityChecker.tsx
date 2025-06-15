
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrapedMetadata } from './MetadataWorkspace';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface DataIntegrityCheckerProps {
  metadata: ScrapedMetadata;
}

interface IntegrityCheck {
  field: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  value?: any;
}

export const DataIntegrityChecker: React.FC<DataIntegrityCheckerProps> = ({ metadata }) => {
  const checks: IntegrityCheck[] = [
    {
      field: 'App Icon',
      status: metadata.icon ? 'pass' : 'fail',
      message: metadata.icon ? 'Icon URL present' : 'Missing app icon - will show placeholder',
      value: metadata.icon
    },
    {
      field: 'Developer Name',
      status: metadata.developer ? 'pass' : 'warn',
      message: metadata.developer ? 'Developer name available' : 'Developer name missing - showing N/A',
      value: metadata.developer
    },
    {
      field: 'Rating',
      status: metadata.rating && metadata.rating > 0 ? 'pass' : 'warn',
      message: metadata.rating && metadata.rating > 0 ? `Rating: ${metadata.rating}/5` : 'No rating data - showing 0.0',
      value: metadata.rating
    },
    {
      field: 'Reviews Count',
      status: metadata.reviews && metadata.reviews > 0 ? 'pass' : 'warn',
      message: metadata.reviews && metadata.reviews > 0 ? `${metadata.reviews} reviews` : 'No review count data',
      value: metadata.reviews
    },
    {
      field: 'App Subtitle',
      status: metadata.subtitle ? 'pass' : 'warn',
      message: metadata.subtitle ? 'Subtitle available' : 'No subtitle - may impact discoverability',
      value: metadata.subtitle
    },
    {
      field: 'Category',
      status: metadata.applicationCategory ? 'pass' : 'warn',
      message: metadata.applicationCategory ? `Category: ${metadata.applicationCategory}` : 'Category not specified',
      value: metadata.applicationCategory
    }
  ];

  const passCount = checks.filter(c => c.status === 'pass').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const failCount = checks.filter(c => c.status === 'fail').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'fail': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-green-300';
      case 'warn': return 'text-yellow-300';
      case 'fail': return 'text-red-300';
      default: return 'text-zinc-300';
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white text-sm flex items-center justify-between">
          Data Quality Report
          <div className="flex space-x-2 text-xs">
            <span className="text-green-400">✓ {passCount}</span>
            <span className="text-yellow-400">⚠ {warnCount}</span>
            <span className="text-red-400">✗ {failCount}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {checks.map((check, index) => (
          <div key={index} className="flex items-start space-x-3">
            {getStatusIcon(check.status)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-200">{check.field}</span>
              </div>
              <p className={`text-xs ${getStatusColor(check.status)}`}>
                {check.message}
              </p>
              {check.value && (
                <p className="text-xs text-zinc-500 truncate mt-1">
                  Value: {typeof check.value === 'string' ? check.value : JSON.stringify(check.value)}
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
