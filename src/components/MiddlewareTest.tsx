
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client';
import { useRateLimit } from '@/hooks/useRateLimit';

export const MiddlewareTest: React.FC = () => {
  const [testInput, setTestInput] = useState('Language Learning App');
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { rateLimitInfo } = useRateLimit();

  const handleTest = async () => {
    try {
      setLoading(true);
      const result = await apiClient.generateMetadata({
        appInput: testInput,
        targetKeywords: 'language,learning,education',
        includeIntelligence: true
      });
      setTestResult(result);
    } catch (error) {
      setTestResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 max-w-2xl">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>Middleware Foundation Test</span>
          {rateLimitInfo && (
            <Badge variant="outline" className="text-zinc-300">
              {rateLimitInfo.tier} tier
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-zinc-400">Test App Input:</label>
          <Input
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Enter app description..."
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>

        <Button 
          onClick={handleTest} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Testing...' : 'Test API with Middleware'}
        </Button>

        {rateLimitInfo && (
          <div className="bg-zinc-800/50 p-3 rounded space-y-2">
            <h4 className="text-sm font-medium text-zinc-300">Current Usage:</h4>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-zinc-400">Hourly:</span>
                <div className="text-white">{rateLimitInfo.usage.hourly}/{rateLimitInfo.limits.hourly}</div>
              </div>
              <div>
                <span className="text-zinc-400">Daily:</span>
                <div className="text-white">{rateLimitInfo.usage.daily}/{rateLimitInfo.limits.daily}</div>
              </div>
              <div>
                <span className="text-zinc-400">Monthly:</span>
                <div className="text-white">{rateLimitInfo.usage.monthly}/{rateLimitInfo.limits.monthly}</div>
              </div>
            </div>
          </div>
        )}

        {testResult && (
          <div className="bg-zinc-800/50 p-3 rounded">
            <h4 className="text-sm font-medium text-zinc-300 mb-2">Test Result:</h4>
            <pre className="text-xs text-zinc-400 overflow-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
