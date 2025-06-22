
import { supabase } from '@/integrations/supabase/client';
import { keywordRankingService } from './keyword-ranking.service';
import { keywordPersistenceService } from './keyword-persistence.service';
import { ScrapedMetadata } from '@/types/aso';

export interface KeywordJob {
  id: string;
  organizationId: string;
  jobType: 'batch_analysis' | 'competitor_research' | 'trend_analysis';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  inputData: Record<string, any>;
  resultData?: Record<string, any>;
  errorMessage?: string;
  priority: number;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  createdBy?: string;
  createdAt: string;
}

export interface BatchAnalysisInput {
  apps: ScrapedMetadata[];
  maxKeywords?: number;
  includeCompetitors?: boolean;
}

export interface CompetitorResearchInput {
  targetApp: ScrapedMetadata;
  competitorApps: ScrapedMetadata[];
  keywords: string[];
}

class KeywordJobProcessorService {
  private isProcessing = false;
  private processInterval: NodeJS.Timeout | null = null;

  /**
   * Start the background job processor
   */
  startProcessor(intervalMs = 30000): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }

    this.processInterval = setInterval(() => {
      this.processNextJob();
    }, intervalMs);

    console.log('🚀 [JOB-PROCESSOR] Background job processor started');
  }

  /**
   * Stop the background job processor
   */
  stopProcessor(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    console.log('🛑 [JOB-PROCESSOR] Background job processor stopped');
  }

  /**
   * Queue a new background job
   */
  async queueJob(
    organizationId: string,
    jobType: KeywordJob['jobType'],
    inputData: Record<string, any>,
    priority = 5,
    userId?: string
  ): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('keyword_ranking_jobs')
        .insert({
          organization_id: organizationId,
          job_type: jobType,
          input_data: inputData,
          priority,
          created_by: userId || null
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ [JOB-PROCESSOR] Failed to queue job:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ [JOB-PROCESSOR] Queued ${jobType} job: ${data.id}`);
      return { success: true, jobId: data.id };

    } catch (error) {
      console.error('❌ [JOB-PROCESSOR] Exception queueing job:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process the next pending job
   */
  private async processNextJob(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Get the next pending job with highest priority
      const { data: jobs, error } = await supabase
        .from('keyword_ranking_jobs')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('scheduled_at', { ascending: true })
        .limit(1);

      if (error || !jobs || jobs.length === 0) {
        return;
      }

      const job = jobs[0];
      console.log(`🔄 [JOB-PROCESSOR] Processing job ${job.id} (${job.job_type})`);

      // Mark job as processing
      await this.updateJobStatus(job.id, 'processing', { started_at: new Date().toISOString() });

      // Process based on job type
      let result: Record<string, any> = {};
      
      switch (job.job_type) {
        case 'batch_analysis':
          result = await this.processBatchAnalysis(job);
          break;
        case 'competitor_research':
          result = await this.processCompetitorResearch(job);
          break;
        case 'trend_analysis':
          result = await this.processTrendAnalysis(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      // Mark job as completed
      await this.updateJobStatus(job.id, 'completed', {
        completed_at: new Date().toISOString(),
        result_data: result
      });

      console.log(`✅ [JOB-PROCESSOR] Completed job ${job.id}`);

    } catch (error) {
      console.error('❌ [JOB-PROCESSOR] Job processing failed:', error);
      // Mark job as failed if we have the job ID
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process batch analysis job
   */
  private async processBatchAnalysis(job: KeywordJob): Promise<Record<string, any>> {
    const input = job.inputData as BatchAnalysisInput;
    const results: Record<string, any> = {};

    for (const app of input.apps) {
      try {
        const rankings = await keywordRankingService.getAppKeywordRankings(app, {
          organizationId: job.organizationId,
          maxKeywords: input.maxKeywords || 15,
          includeCompetitors: input.includeCompetitors || false,
          cacheEnabled: true,
          batchProcessing: true
        });

        results[app.appId] = {
          success: true,
          rankings,
          processedAt: new Date().toISOString()
        };

        // Save to persistent storage
        await keywordPersistenceService.saveRankingHistory(
          rankings,
          job.organizationId,
          app.appId,
          job.createdBy
        );

        // Record metrics
        await keywordPersistenceService.recordMetric(
          job.organizationId,
          'batch_analysis_processed',
          rankings.length,
          'rankings',
          { appId: app.appId, jobId: job.id }
        );

      } catch (error) {
        results[app.appId] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          processedAt: new Date().toISOString()
        };
      }
    }

    return { results, totalApps: input.apps.length };
  }

  /**
   * Process competitor research job
   */
  private async processCompetitorResearch(job: KeywordJob): Promise<Record<string, any>> {
    const input = job.inputData as CompetitorResearchInput;
    const results: Record<string, any> = {
      targetApp: input.targetApp.appId,
      competitors: {},
      keywordAnalysis: {}
    };

    // Analyze target app
    const targetRankings = await keywordRankingService.getAppKeywordRankings(
      input.targetApp,
      { organizationId: job.organizationId }
    );

    results.targetRankings = targetRankings;

    // Analyze competitors
    for (const competitor of input.competitorApps) {
      const competitorRankings = await keywordRankingService.getAppKeywordRankings(
        competitor,
        { organizationId: job.organizationId }
      );
      
      results.competitors[competitor.appId] = competitorRankings;
    }

    return results;
  }

  /**
   * Process trend analysis job
   */
  private async processTrendAnalysis(job: KeywordJob): Promise<Record<string, any>> {
    const { appId, keywords } = job.inputData;
    const trendData: Record<string, any> = {};

    for (const keyword of keywords) {
      const trend = await keywordPersistenceService.calculateKeywordTrend(
        job.organizationId,
        appId,
        keyword
      );
      
      const history = await keywordPersistenceService.getRankingHistory(
        job.organizationId,
        appId,
        keyword,
        30
      );

      trendData[keyword] = {
        trend,
        dataPoints: history.length,
        latestPosition: history[0]?.position || null
      };
    }

    return { trends: trendData, analyzedKeywords: keywords.length };
  }

  /**
   * Update job status and metadata
   */
  private async updateJobStatus(
    jobId: string,
    status: KeywordJob['status'],
    updates: Record<string, any> = {}
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('keyword_ranking_jobs')
        .update({ status, ...updates })
        .eq('id', jobId);

      if (error) {
        console.error('❌ [JOB-PROCESSOR] Failed to update job status:', error);
      }
    } catch (error) {
      console.error('❌ [JOB-PROCESSOR] Exception updating job status:', error);
    }
  }

  /**
   * Get job status and results
   */
  async getJobStatus(jobId: string): Promise<KeywordJob | null> {
    try {
      const { data, error } = await supabase
        .from('keyword_ranking_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('❌ [JOB-PROCESSOR] Failed to fetch job status:', error);
        return null;
      }

      return {
        id: data.id,
        organizationId: data.organization_id,
        jobType: data.job_type,
        status: data.status,
        inputData: data.input_data,
        resultData: data.result_data,
        errorMessage: data.error_message,
        priority: data.priority,
        scheduledAt: data.scheduled_at,
        startedAt: data.started_at,
        completedAt: data.completed_at,
        createdBy: data.created_by,
        createdAt: data.created_at
      };

    } catch (error) {
      console.error('❌ [JOB-PROCESSOR] Exception fetching job status:', error);
      return null;
    }
  }

  /**
   * Get job queue for organization
   */
  async getJobQueue(organizationId: string, limit = 50): Promise<KeywordJob[]> {
    try {
      const { data, error } = await supabase
        .from('keyword_ranking_jobs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ [JOB-PROCESSOR] Failed to fetch job queue:', error);
        return [];
      }

      return data?.map(job => ({
        id: job.id,
        organizationId: job.organization_id,
        jobType: job.job_type,
        status: job.status,
        inputData: job.input_data,
        resultData: job.result_data,
        errorMessage: job.error_message,
        priority: job.priority,
        scheduledAt: job.scheduled_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        createdBy: job.created_by,
        createdAt: job.created_at
      })) || [];

    } catch (error) {
      console.error('❌ [JOB-PROCESSOR] Exception fetching job queue:', error);
      return [];
    }
  }
}

export const keywordJobProcessorService = new KeywordJobProcessorService();
