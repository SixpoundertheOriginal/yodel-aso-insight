
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface CppErrorBoundaryProps {
  children: React.ReactNode;
  onReset: () => void;
}

interface CppErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class CppErrorBoundary extends React.Component<CppErrorBoundaryProps, CppErrorBoundaryState> {
  constructor(props: CppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): CppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ [CPP-ERROR-BOUNDARY] Component error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="bg-zinc-900/50 border-red-800">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              CPP Co-Pilot Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-zinc-400">
              Something went wrong with the CPP analysis. This might be due to:
            </p>
            <ul className="text-zinc-400 text-sm space-y-1 ml-4">
              <li>• Invalid App Store URL or app not found</li>
              <li>• Network connectivity issues</li>
              <li>• Screenshot analysis service temporarily unavailable</li>
              <li>• Organization context missing</li>
            </ul>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-zinc-800/50 p-3 rounded text-xs text-red-300">
                <strong>Debug Info:</strong> {this.state.error.message}
              </div>
            )}
            <Button onClick={this.handleReset} className="bg-yodel-orange hover:bg-yodel-orange/80">
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
