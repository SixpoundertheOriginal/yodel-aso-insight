
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Clock, CheckCircle, XCircle, BarChart3, Zap, Database } from 'lucide-react';
import { keywordRankingService } from '@/services/keyword-ranking.service';
import { keywordJobProcessorService, KeywordJob } from '@/services/keyword-job-processor.service';
import { keywordPersistenceService, ServiceMetric } from '@/services/keyword-persistence.service';
import { keywordCacheService } from '@/services/keyword-cache.service';

interface MonitoringData {
  healthStatus: any;
  recentJobs: KeywordJob[];
  performanceMetrics: ServiceMetric[];
  cacheStats: any;
}

const KeywordRankingMonitor: React.FC = () => {
  const [monitoringData, setMonitoringData] = useState<MonitoringData>({
    healthStatus: null,
    recentJobs: [],
    performanceMetrics: [],
    cacheStats: null
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [organizationId] = useState('default'); // Should come from auth context

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const [healthStatus, recentJobs, performanceMetrics, cacheStats] = await Promise.all([
        keywordRankingService.getHealthStatus(),
        keywordJobProcessorService.getJobQueue(organizationId, 10),
        keywordPersistenceService.getMetrics(organizationId, undefined, 6),
        Promise.resolve(keywordCacheService.getStats())
      ]);

      setMonitoringData({
        healthStatus,
        recentJobs,
        performanceMetrics,
        cacheStats
      });
    } catch (error) {
      console.error('Failed to refresh monitoring data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [organizationId]);

  const getJobStatusBadge = (status: KeywordJob['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-600"><Activity className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-600"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'unhealthy': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Keyword Ranking Monitor</h2>
          <p className="text-zinc-400">Real-time monitoring and performance analytics</p>
        </div>
        <Button 
          onClick={refreshData} 
          disabled={isRefreshing}
          variant="outline"
          className="border-zinc-700"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Health Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Service Status</p>
                <p className={`text-lg font-bold ${getHealthStatusColor(monitoringData.healthStatus?.status || 'unknown')}`}>
                  {monitoringData.healthStatus?.status?.toUpperCase() || 'UNKNOWN'}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Cache Hit Rate</p>
                <p className="text-lg font-bold text-white">
                  {monitoringData.cacheStats?.hitRate?.toFixed(1) || '0'}%
                </p>
              </div>
              <Zap className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Cache Entries</p>
                <p className="text-lg font-bold text-white">
                  {monitoringData.cacheStats?.totalEntries || 0}
                </p>
              </div>
              <Database className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Circuit Breaker</p>
                <p className={`text-lg font-bold ${
                  monitoringData.healthStatus?.circuitBreaker?.isOpen ? 'text-red-400' : 'text-green-400'
                }`}>
                  {monitoringData.healthStatus?.circuitBreaker?.isOpen ? 'OPEN' : 'CLOSED'}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring */}
      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList className="bg-zinc-900 border-zinc-800">
          <TabsTrigger value="jobs">Background Jobs</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="circuit">Circuit Breaker</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Recent Background Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monitoringData.recentJobs.map((job) => {
                    const duration = job.completedAt && job.startedAt
                      ? Math.round((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000)
                      : null;

                    return (
                      <TableRow key={job.id}>
                        <TableCell className="font-mono text-xs">{job.id.slice(0, 8)}...</TableCell>
                        <TableCell>{job.jobType}</TableCell>
                        <TableCell>{getJobStatusBadge(job.status)}</TableCell>
                        <TableCell>{job.priority}</TableCell>
                        <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
                        <TableCell>{duration ? `${duration}s` : '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Performance Metrics (Last 6 Hours)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Recorded At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monitoringData.performanceMetrics.slice(0, 20).map((metric) => (
                    <TableRow key={metric.id}>
                      <TableCell className="font-medium">{metric.metricName}</TableCell>
                      <TableCell>{metric.metricValue}</TableCell>
                      <TableCell>{metric.metricUnit}</TableCell>
                      <TableCell className="text-xs">
                        {Object.keys(metric.tags).length > 0 
                          ? JSON.stringify(metric.tags) 
                          : '-'
                        }
                      </TableCell>
                      <TableCell>{new Date(metric.recordedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="circuit">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Circuit Breaker Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-zinc-400">Current State</p>
                  <p className={`text-lg font-bold ${
                    monitoringData.healthStatus?.circuitBreaker?.isOpen ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {monitoringData.healthStatus?.circuitBreaker?.isOpen ? 'OPEN' : 'CLOSED'}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-zinc-400">Failure Count</p>
                  <p className="text-lg font-bold text-white">
                    {monitoringData.healthStatus?.circuitBreaker?.failures || 0}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-zinc-400">Last Failure</p>
                  <p className="text-sm text-zinc-300">
                    {monitoringData.healthStatus?.circuitBreaker?.lastFailureTime 
                      ? new Date(monitoringData.healthStatus.circuitBreaker.lastFailureTime).toLocaleString()
                      : 'None'
                    }
                  </p>
                </div>
              </div>
              
              {monitoringData.healthStatus?.circuitBreaker?.isOpen && (
                <div className="mt-4">
                  <Button
                    onClick={() => keywordRankingService.resetCircuitBreaker()}
                    variant="outline"
                    className="border-red-600 text-red-400 hover:bg-red-600/10"
                  >
                    Reset Circuit Breaker
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KeywordRankingMonitor;
