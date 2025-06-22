
import { KeywordGapAnalysis, KeywordCluster } from '@/services/competitor-keyword-analysis.service';
import { AdvancedKeywordData } from '@/hooks/useAdvancedKeywordIntelligence';

export interface AppMetadata {
  id: string;
  app_name: string;
  category?: string;
  organizationId: string;
}

export interface KeywordDataState {
  keywords: AdvancedKeywordData[];
  gaps: KeywordGapAnalysis[];
  clusters: KeywordCluster[];
  lastUpdated: Date;
  isStale: boolean;
}

export interface KeywordGenerationConfig {
  maxKeywords?: number;
  includeAppSpecific?: boolean;
  includeBranded?: boolean;
  includeCompetitor?: boolean;
}

class KeywordDataPipelineService {
  private dataCache = new Map<string, KeywordDataState>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate app-specific keywords using enhanced semantic analysis
   */
  generateAppSpecificKeywords(app: AppMetadata): string[] {
    const appName = app.app_name.toLowerCase();
    const category = app.category?.toLowerCase() || '';
    
    console.log('📱 [PIPELINE] Generating keywords for:', app.app_name, 'category:', category);
    
    // Enhanced category mapping with more specific terms
    const categoryKeywords: Record<string, string[]> = {
      education: [
        'learn', 'study', 'course', 'lessons', 'tutorial', 'education app',
        'online learning', 'skill development', 'knowledge', 'training'
      ],
      health: [
        'fitness', 'workout', 'health', 'exercise', 'wellness', 'nutrition',
        'medical', 'healthcare', 'mental health', 'physical fitness'
      ],
      productivity: [
        'productivity', 'task', 'organize', 'manage', 'efficiency', 'workflow',
        'time management', 'planning', 'organization', 'optimization'
      ],
      entertainment: [
        'game', 'play', 'fun', 'entertainment', 'puzzle', 'gaming',
        'casual game', 'brain training', 'strategy', 'adventure'
      ],
      language: [
        'language', 'learn', 'speak', 'translate', 'pronunciation', 'fluency',
        'conversation', 'vocabulary', 'grammar', 'linguistic'
      ]
    };

    // Detect primary category
    let primaryCategory = 'productivity'; // Default
    for (const [cat, _] of Object.entries(categoryKeywords)) {
      if (category.includes(cat) || appName.includes(cat)) {
        primaryCategory = cat;
        break;
      }
    }

    const baseKeywords = categoryKeywords[primaryCategory] || categoryKeywords.productivity;
    
    // Add branded variations
    const brandedKeywords = [
      appName,
      `${appName} app`,
      ...baseKeywords.slice(0, 3).map(kw => `${appName} ${kw}`)
    ];

    // Add category-specific combinations
    const categorySpecific = baseKeywords.slice(0, 6).map(kw => 
      Math.random() > 0.5 ? `${kw} app` : kw
    );

    return [...new Set([...brandedKeywords, ...categorySpecific])];
  }

  /**
   * Enhanced keyword data generation with proper app context
   */
  generateEnhancedKeywordData(
    app: AppMetadata,
    gaps: KeywordGapAnalysis[], 
    clusters: KeywordCluster[],
    config: KeywordGenerationConfig = {}
  ): AdvancedKeywordData[] {
    
    console.log('🎯 [PIPELINE] Generating enhanced data for:', app.app_name);

    const {
      maxKeywords = 50,
      includeAppSpecific = true,
      includeBranded = true,
      includeCompetitor = true
    } = config;

    // Collect keywords from different sources
    const allKeywords = new Set<string>();

    // Add gap analysis keywords
    if (includeCompetitor) {
      gaps.forEach(gap => allKeywords.add(gap.keyword));
    }

    // Add cluster keywords
    clusters.forEach(cluster => {
      allKeywords.add(cluster.primaryKeyword);
      cluster.relatedKeywords.forEach(kw => allKeywords.add(kw));
    });

    // Add app-specific keywords
    if (includeAppSpecific) {
      this.generateAppSpecificKeywords(app).forEach(kw => allKeywords.add(kw));
    }

    // Convert to enhanced keyword data
    const keywords = Array.from(allKeywords).slice(0, maxKeywords).map((keyword, index) => {
      const gapData = gaps.find(g => g.keyword === keyword);
      const relatedCluster = clusters.find(c => 
        c.primaryKeyword === keyword || c.relatedKeywords.includes(keyword)
      );

      // Enhanced ranking calculation based on data sources
      let estimatedRank: number;
      if (gapData?.targetRank) {
        estimatedRank = gapData.targetRank;
      } else if (keyword.toLowerCase().includes(app.app_name.toLowerCase())) {
        estimatedRank = Math.floor(Math.random() * 5) + 1; // Branded terms rank better
      } else {
        estimatedRank = Math.floor(Math.random() * 50) + 5;
      }

      return {
        keyword,
        rank: estimatedRank,
        searchVolume: gapData?.searchVolume || Math.floor(Math.random() * 20000) + 1000,
        difficulty: gapData?.difficultyScore || Math.round((Math.random() * 6 + 2) * 10) / 10,
        trend: (['up', 'down', 'stable'] as const)[Math.floor(Math.random() * 3)],
        opportunity: gapData?.gapOpportunity as 'high' | 'medium' | 'low' || 
                    (['high', 'medium', 'low'] as const)[Math.floor(Math.random() * 3)],
        competitorRank: gapData?.bestCompetitorRank || Math.floor(Math.random() * 30) + 1,
        volumeHistory: []
      };
    });

    // Sort by opportunity and rank
    keywords.sort((a, b) => {
      const opportunityOrder = { high: 3, medium: 2, low: 1 };
      const aScore = (opportunityOrder[a.opportunity || 'low'] * 100) + (100 - (a.rank || 100));
      const bScore = (opportunityOrder[b.opportunity || 'low'] * 100) + (100 - (b.rank || 100));
      return bScore - aScore;
    });

    console.log('✅ [PIPELINE] Generated', keywords.length, 'enhanced keywords for', app.app_name);
    return keywords;
  }

  /**
   * Get cached keyword data or generate new
   */
  getKeywordData(
    app: AppMetadata,
    gaps: KeywordGapAnalysis[],
    clusters: KeywordCluster[],
    config?: KeywordGenerationConfig
  ): KeywordDataState {
    const cacheKey = `${app.organizationId}:${app.id}`;
    const cached = this.dataCache.get(cacheKey);

    // Return cached if fresh
    if (cached && !this.isStale(cached)) {
      console.log('💾 [PIPELINE] Using cached keyword data for', app.app_name);
      return cached;
    }

    // Generate fresh data
    const keywords = this.generateEnhancedKeywordData(app, gaps, clusters, config);
    
    const newState: KeywordDataState = {
      keywords,
      gaps,
      clusters,
      lastUpdated: new Date(),
      isStale: false
    };

    this.dataCache.set(cacheKey, newState);
    console.log('🔄 [PIPELINE] Generated fresh keyword data for', app.app_name);
    
    return newState;
  }

  /**
   * Check if cached data is stale
   */
  private isStale(data: KeywordDataState): boolean {
    const age = Date.now() - data.lastUpdated.getTime();
    return age > this.CACHE_TTL;
  }

  /**
   * Clear cache for specific app
   */
  clearCache(organizationId: string, appId?: string): void {
    if (appId) {
      this.dataCache.delete(`${organizationId}:${appId}`);
    } else {
      // Clear all for organization
      for (const key of this.dataCache.keys()) {
        if (key.startsWith(`${organizationId}:`)) {
          this.dataCache.delete(key);
        }
      }
    }
  }

  /**
   * Get cache stats for debugging
   */
  getCacheStats() {
    return {
      size: this.dataCache.size,
      entries: Array.from(this.dataCache.keys()),
      ttl: this.CACHE_TTL
    };
  }
}

export const keywordDataPipelineService = new KeywordDataPipelineService();
