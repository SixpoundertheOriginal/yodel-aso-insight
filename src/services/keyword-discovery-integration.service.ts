
import { supabase } from '@/integrations/supabase/client';

export interface KeywordDiscoveryConfig {
  organizationId: string;
  appId: string;
  seedKeywords?: string[];
  competitorApps?: string[];
  maxKeywords?: number;
  country?: string;
}

export interface DiscoveredKeywordResult {
  keyword: string;
  estimatedVolume: number;
  difficulty: number;
  source: string;
  competitorRank?: number;
  competitorApp?: string;
}

class KeywordDiscoveryIntegrationService {
  /**
   * Discover keywords for an app using the App Store scraper
   */
  async discoverKeywords(config: KeywordDiscoveryConfig): Promise<DiscoveredKeywordResult[]> {
    try {
      console.log('🔍 [DISCOVERY-INTEGRATION] Starting keyword discovery for app:', config.appId);

      // Get app metadata to enhance discovery
      const appMetadata = await this.getAppMetadata(config.appId);
      
      const discoveryRequest = {
        organizationId: config.organizationId,
        targetApp: appMetadata ? {
          name: appMetadata.app_name,
          appId: config.appId,
          category: appMetadata.category || 'Productivity'
        } : undefined,
        competitorApps: config.competitorApps || this.getDefaultCompetitors(appMetadata?.category),
        seedKeywords: config.seedKeywords || this.getDefaultSeedKeywords(appMetadata?.category),
        country: config.country || 'us',
        maxKeywords: config.maxKeywords || 100
      };

      console.log('📡 [DISCOVERY-INTEGRATION] Calling keyword discovery service...');
      
      const { data, error } = await supabase.functions.invoke('app-store-scraper', {
        body: discoveryRequest
      });

      if (error) {
        console.error('❌ [DISCOVERY-INTEGRATION] Service error:', error);
        throw new Error(`Keyword discovery service error: ${error.message}`);
      }

      if (!data?.success) {
        console.error('❌ [DISCOVERY-INTEGRATION] Discovery failed:', data?.error);
        throw new Error(`Keyword discovery failed: ${data?.error || 'Unknown error'}`);
      }

      const keywords = data.data.keywords || [];
      console.log('✅ [DISCOVERY-INTEGRATION] Keywords discovered:', keywords.length);

      return keywords;

    } catch (error) {
      console.error('💥 [DISCOVERY-INTEGRATION] Exception:', error);
      throw error;
    }
  }

  /**
   * Save discovered keywords as ranking snapshots
   */
  async saveDiscoveredKeywords(
    organizationId: string,
    appId: string,
    keywords: DiscoveredKeywordResult[]
  ): Promise<{ success: boolean; saved: number }> {
    try {
      console.log('💾 [DISCOVERY-INTEGRATION] Saving discovered keywords:', keywords.length);

      const currentDate = new Date().toISOString().split('T')[0];
      
      // Transform discovered keywords to ranking snapshots
      const snapshots = keywords.map((keyword, index) => ({
        organization_id: organizationId,
        app_id: appId,
        keyword: keyword.keyword,
        rank_position: this.estimateInitialRank(keyword.difficulty, index),
        search_volume: keyword.estimatedVolume,
        difficulty_score: keyword.difficulty,
        volume_trend: this.randomTrend(),
        snapshot_date: currentDate
      }));

      // Insert in batches to avoid conflicts
      const batchSize = 20;
      let successfulInserts = 0;
      
      for (let i = 0; i < snapshots.length; i += batchSize) {
        const batch = snapshots.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('keyword_ranking_snapshots')
          .upsert(batch, { 
            onConflict: 'organization_id,app_id,keyword,snapshot_date',
            ignoreDuplicates: false 
          });

        if (error) {
          console.error('❌ [DISCOVERY-INTEGRATION] Failed to insert batch:', error);
        } else {
          successfulInserts += batch.length;
        }
      }

      console.log('✅ [DISCOVERY-INTEGRATION] Keywords saved:', successfulInserts);
      return { success: successfulInserts > 0, saved: successfulInserts };

    } catch (error) {
      console.error('💥 [DISCOVERY-INTEGRATION] Exception saving keywords:', error);
      return { success: false, saved: 0 };
    }
  }

  /**
   * Full keyword discovery and save workflow
   */
  async discoverAndSaveKeywords(config: KeywordDiscoveryConfig): Promise<{ 
    success: boolean; 
    keywordsDiscovered: number; 
    keywordsSaved: number 
  }> {
    try {
      // Discover keywords
      const keywords = await this.discoverKeywords(config);
      
      if (keywords.length === 0) {
        return { success: false, keywordsDiscovered: 0, keywordsSaved: 0 };
      }

      // Save to database
      const saveResult = await this.saveDiscoveredKeywords(
        config.organizationId,
        config.appId,
        keywords
      );

      return {
        success: saveResult.success,
        keywordsDiscovered: keywords.length,
        keywordsSaved: saveResult.saved
      };

    } catch (error) {
      console.error('💥 [DISCOVERY-INTEGRATION] Full workflow failed:', error);
      return { success: false, keywordsDiscovered: 0, keywordsSaved: 0 };
    }
  }

  // Helper methods
  private async getAppMetadata(appId: string) {
    try {
      const { data } = await supabase
        .from('apps')
        .select('app_name, category')
        .eq('id', appId)
        .single();

      return data;
    } catch {
      return null;
    }
  }

  private getDefaultCompetitors(category?: string): string[] {
    const competitors: Record<string, string[]> = {
      'Health & Fitness': ['389801252', '1040872112', '448474618'],
      'Productivity': ['1091189122', '966085870', '1090624618'],
      'Education': ['479516143', '1135441750', '918858936'],
      'Lifestyle': ['1437816860', '1107421413', '1052240851']
    };

    return competitors[category || 'Productivity'] || competitors['Productivity'];
  }

  private getDefaultSeedKeywords(category?: string): string[] {
    const seeds: Record<string, string[]> = {
      'Health & Fitness': ['fitness', 'workout', 'health', 'meditation'],
      'Productivity': ['productivity', 'task manager', 'notes', 'calendar'],
      'Education': ['learning', 'study', 'education', 'courses'],
      'Lifestyle': ['lifestyle', 'wellness', 'mindfulness', 'habits']
    };

    return seeds[category || 'Productivity'] || seeds['Productivity'];
  }

  private estimateInitialRank(difficulty: number, index: number): number {
    // Estimate initial rank based on difficulty and discovery order
    const baseRank = Math.floor(difficulty * 15) + Math.floor(index / 3) + 1;
    return Math.min(baseRank, 150); // Cap at rank 150
  }

  private randomTrend(): 'up' | 'down' | 'stable' {
    const trends = ['up', 'down', 'stable'] as const;
    return trends[Math.floor(Math.random() * trends.length)];
  }
}

export const keywordDiscoveryIntegrationService = new KeywordDiscoveryIntegrationService();
