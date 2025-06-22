
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { keywordDiscoveryService } from '@/services/keyword-discovery.service';
import { toast } from 'sonner';

interface ProgressiveKeywordLoaderProps {
  organizationId: string;
  appId: string;
  onKeywordsLoaded: (keywords: any[]) => void;
}

export const ProgressiveKeywordLoader: React.FC<ProgressiveKeywordLoaderProps> = ({
  organizationId,
  appId,
  onKeywordsLoaded
}) => {
  const [loadingStage, setLoadingStage] = useState<'cached' | 'background' | 'fresh' | 'complete'>('cached');
  const [discoveryJobs, setDiscoveryJobs] = useState<Array<{
    id: string;
    type: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    progress: number;
    keywordsFound: number;
  }>>([]);
  const [totalProgress, setTotalProgress] = useState(0);

  // Start progressive loading
  useEffect(() => {
    startProgressiveLoading();
  }, [organizationId, appId]);

  const startProgressiveLoading = useCallback(async () => {
    try {
      // Stage 1: Load cached keywords immediately
      setLoadingStage('cached');
      setTotalProgress(25);
      
      // Simulate loading cached keywords
      setTimeout(() => {
        const cachedKeywords = generateMockKeywords('cached', 10);
        onKeywordsLoaded(cachedKeywords);
        
        // Stage 2: Start background discovery jobs
        setLoadingStage('background');
        setTotalProgress(50);
        startDiscoveryJobs();
      }, 500);
      
    } catch (error) {
      console.error('❌ [PROGRESSIVE-LOADER] Loading failed:', error);
      toast.error('Failed to load keywords');
    }
  }, [organizationId, appId, onKeywordsLoaded]);

  const startDiscoveryJobs = async () => {
    const jobTypes = [
      { type: 'category_exploration', label: 'Category Keywords' },
      { type: 'competitor_analysis', label: 'Competitor Analysis' },
      { type: 'trending_keywords', label: 'Trending Keywords' }
    ] as const;

    const newJobs = [];

    for (const jobType of jobTypes) {
      try {
        const jobId = await keywordDiscoveryService.createDiscoveryJob(
          organizationId,
          appId,
          jobType.type,
          { category: 'productivity' }
        );

        newJobs.push({
          id: jobId,
          type: jobType.label,
          status: 'running' as const,
          progress: 0,
          keywordsFound: 0
        });
      } catch (error) {
        console.error('❌ [PROGRESSIVE-LOADER] Failed to create job:', jobType.type, error);
      }
    }

    setDiscoveryJobs(newJobs);

    // Simulate job progress
    simulateJobProgress(newJobs);
  };

  const simulateJobProgress = (jobs: typeof discoveryJobs) => {
    const intervals: NodeJS.Timeout[] = [];

    jobs.forEach((job, index) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20 + 5; // Random progress between 5-25%
        
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          // Complete the job
          setDiscoveryJobs(prev => prev.map(j => 
            j.id === job.id 
              ? { ...j, status: 'completed', progress: 100, keywordsFound: Math.floor(Math.random() * 15) + 5 }
              : j
          ));
          
          // Load fresh keywords for this job
          const freshKeywords = generateMockKeywords(job.type, Math.floor(Math.random() * 10) + 5);
          onKeywordsLoaded(prev => [...prev, ...freshKeywords]);
          
          // Check if all jobs are complete
          setTimeout(() => {
            setDiscoveryJobs(current => {
              const allComplete = current.every(j => j.status === 'completed');
              if (allComplete) {
                setLoadingStage('complete');
                setTotalProgress(100);
                toast.success('Keyword discovery completed');
              }
              return current;
            });
          }, 100);
        } else {
          setDiscoveryJobs(prev => prev.map(j => 
            j.id === job.id ? { ...j, progress } : j
          ));
        }
        
        // Update total progress
        setTotalProgress(prev => Math.min(prev + 2, 95));
      }, 800 + index * 200); // Stagger the intervals
      
      intervals.push(interval);
    });

    // Cleanup intervals after 30 seconds
    setTimeout(() => {
      intervals.forEach(clearInterval);
    }, 30000);
  };

  const generateMockKeywords = (source: string, count: number) => {
    const baseKeywords = [
      'productivity app', 'task manager', 'workflow tool', 'team collaboration',
      'project management', 'time tracking', 'goal setting', 'habit tracker',
      'note taking', 'calendar app', 'reminder tool', 'focus app'
    ];
    
    return baseKeywords.slice(0, count).map((keyword, index) => ({
      keyword: `${keyword} ${source}`,
      rank: Math.floor(Math.random() * 50) + 1,
      searchVolume: Math.floor(Math.random() * 10000) + 1000,
      difficulty: Math.round((Math.random() * 6 + 2) * 10) / 10,
      trend: (['up', 'down', 'stable'] as const)[Math.floor(Math.random() * 3)],
      opportunity: (['high', 'medium', 'low'] as const)[Math.floor(Math.random() * 3)],
      competitorRank: Math.floor(Math.random() * 30) + 1,
      volumeHistory: [],
      source
    }));
  };

  const getStageIcon = (stage: typeof loadingStage) => {
    switch (stage) {
      case 'cached':
        return <Clock className="h-4 w-4 text-blue-400" />;
      case 'background':
        return <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />;
      case 'fresh':
        return <RefreshCw className="h-4 w-4 text-purple-400" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
    }
  };

  const getStageDescription = (stage: typeof loadingStage) => {
    switch (stage) {
      case 'cached':
        return 'Loading cached keywords for instant results';
      case 'background':
        return 'Running background discovery jobs';
      case 'fresh':
        return 'Collecting fresh keyword data';
      case 'complete':
        return 'All keyword discovery completed';
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          {getStageIcon(loadingStage)}
          Progressive Keyword Loading
        </CardTitle>
        <CardDescription>
          {getStageDescription(loadingStage)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Overall Progress</span>
            <span className="text-white">{Math.round(totalProgress)}%</span>
          </div>
          <Progress value={totalProgress} className="h-2" />
        </div>

        {/* Discovery Jobs */}
        {discoveryJobs.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white">Discovery Jobs</h4>
            {discoveryJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {job.status === 'running' && <Loader2 className="h-3 w-3 animate-spin text-yellow-400" />}
                  {job.status === 'completed' && <CheckCircle className="h-3 w-3 text-green-400" />}
                  {job.status === 'failed' && <AlertCircle className="h-3 w-3 text-red-400" />}
                  
                  <div>
                    <p className="text-sm text-white">{job.type}</p>
                    <p className="text-xs text-zinc-400">
                      {job.status === 'completed' ? `Found ${job.keywordsFound} keywords` : `${Math.round(job.progress)}% complete`}
                    </p>
                  </div>
                </div>
                
                <Badge variant={
                  job.status === 'completed' ? 'default' :
                  job.status === 'failed' ? 'destructive' : 'secondary'
                }>
                  {job.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {loadingStage === 'complete' && (
          <div className="flex gap-2">
            <Button 
              onClick={startProgressiveLoading} 
              variant="outline" 
              size="sm"
              className="text-white border-zinc-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Discovery
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
