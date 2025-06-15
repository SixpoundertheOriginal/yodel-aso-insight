
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class MetadataErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 [ERROR_BOUNDARY] Metadata component error:', error);
    console.error('🚨 [ERROR_BOUNDARY] Error info:', errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="bg-red-900/20 border-red-700/50">
          <CardHeader>
            <CardTitle className="text-red-300 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Metadata Display Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-red-200 text-sm">
              <p className="mb-2">
                An error occurred while displaying the app metadata. This is likely due to unexpected data format.
              </p>
              <details className="bg-red-900/30 p-3 rounded text-xs">
                <summary className="cursor-pointer font-medium">Technical Details</summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <strong>Error:</strong> {this.state.error?.message}
                  </div>
                  <div>
                    <strong>Stack:</strong>
                    <pre className="text-xs overflow-auto max-h-32 mt-1">
                      {this.state.error?.stack}
                    </pre>
                  </div>
                </div>
              </details>
            </div>
            <div className="flex space-x-2">
              <Button onClick={this.handleReset} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
