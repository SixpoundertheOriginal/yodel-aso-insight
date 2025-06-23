
/**
 * Semantic Clustering Service
 * Groups keywords into meaningful clusters using semantic analysis
 */

import { KeywordData } from '@/hooks/useAdvancedKeywordIntelligence';
import { KeywordCluster } from './competitor-keyword-analysis.service';

export interface SemanticClusterConfig {
  minSimilarity: number;
  maxClusters: number;
  minKeywordsPerCluster: number;
}

export interface ClusteringResult {
  clusters: KeywordCluster[];
  unclustered: KeywordData[];
  totalProcessed: number;
}

class SemanticClusteringService {
  private defaultConfig: SemanticClusterConfig = {
    minSimilarity: 0.6,
    maxClusters: 8,
    minKeywordsPerCluster: 2
  };

  /**
   * Generate semantic clusters from keyword data
   */
  async generateClusters(
    keywords: KeywordData[],
    organizationId: string,
    config?: Partial<SemanticClusterConfig>
  ): Promise<ClusteringResult> {
    const clusterConfig = { ...this.defaultConfig, ...config };
    
    console.log('🔬 [SEMANTIC-CLUSTERING] Processing', keywords.length, 'keywords');
    
    if (keywords.length === 0) {
      return {
        clusters: [],
        unclustered: [],
        totalProcessed: 0
      };
    }

    const clusters: KeywordCluster[] = [];
    const processed = new Set<string>();

    // Group keywords by semantic similarity
    for (const keyword of keywords) {
      if (processed.has(keyword.keyword)) continue;

      const cluster = await this.createClusterFromKeyword(
        keyword,
        keywords,
        processed,
        clusterConfig
      );

      if (cluster && cluster.relatedKeywords.length >= clusterConfig.minKeywordsPerCluster) {
        clusters.push(cluster);
      }
    }

    // Sort clusters by opportunity score
    clusters.sort((a, b) => (b.opportunityScore || 0) - (a.opportunityScore || 0));

    // Limit to max clusters
    const finalClusters = clusters.slice(0, clusterConfig.maxClusters);

    const unclustered = keywords.filter(k => !processed.has(k.keyword));

    console.log('✅ [SEMANTIC-CLUSTERING] Generated', finalClusters.length, 'clusters');

    return {
      clusters: finalClusters,
      unclustered,
      totalProcessed: keywords.length
    };
  }

  /**
   * Create a cluster from a seed keyword
   */
  private async createClusterFromKeyword(
    seedKeyword: KeywordData,
    allKeywords: KeywordData[],
    processed: Set<string>,
    config: SemanticClusterConfig
  ): Promise<KeywordCluster | null> {
    const relatedKeywords: string[] = [seedKeyword.keyword];
    const clusterKeywords: KeywordData[] = [seedKeyword];
    processed.add(seedKeyword.keyword);

    // Find semantically similar keywords
    for (const keyword of allKeywords) {
      if (processed.has(keyword.keyword)) continue;

      const similarity = this.calculateSimilarity(seedKeyword.keyword, keyword.keyword);
      if (similarity >= config.minSimilarity) {
        relatedKeywords.push(keyword.keyword);
        clusterKeywords.push(keyword);
        processed.add(keyword.keyword);
      }
    }

    if (relatedKeywords.length < config.minKeywordsPerCluster) {
      return null;
    }

    // Calculate cluster metrics
    const totalVolume = clusterKeywords.reduce((sum, k) => sum + (k.searchVolume || 0), 0);
    const avgDifficulty = clusterKeywords.reduce((sum, k) => sum + (k.difficulty || 0), 0) / clusterKeywords.length;
    const opportunityScore = this.calculateOpportunityScore(clusterKeywords);

    // Determine cluster type based on keyword patterns
    const clusterType = this.determineClusterType(relatedKeywords);
    const clusterName = this.generateClusterName(seedKeyword.keyword, clusterType);

    return {
      id: `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      clusterName,
      primaryKeyword: seedKeyword.keyword,
      relatedKeywords: relatedKeywords.slice(1), // Exclude primary
      clusterType,
      totalSearchVolume: totalVolume,
      avgDifficulty,
      opportunityScore,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Calculate similarity between two keywords
   */
  private calculateSimilarity(keyword1: string, keyword2: string): number {
    const words1 = keyword1.toLowerCase().split(/\s+/);
    const words2 = keyword2.toLowerCase().split(/\s+/);
    
    // Jaccard similarity
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    const jaccardScore = intersection.size / union.size;
    
    // Bonus for partial string matches
    const partialMatch = words1.some(w1 => 
      words2.some(w2 => w1.includes(w2) || w2.includes(w1))
    ) ? 0.2 : 0;
    
    return Math.min(1.0, jaccardScore + partialMatch);
  }

  /**
   * Calculate opportunity score for cluster
   */
  private calculateOpportunityScore(keywords: KeywordData[]): number {
    if (keywords.length === 0) return 0;

    const avgVolume = keywords.reduce((sum, k) => sum + (k.searchVolume || 0), 0) / keywords.length;
    const avgDifficulty = keywords.reduce((sum, k) => sum + (k.difficulty || 0), 0) / keywords.length;
    const highOpportunityCount = keywords.filter(k => k.opportunity === 'high').length;
    
    // Normalize volume (assuming max reasonable volume is 100k)
    const volumeScore = Math.min(avgVolume / 100000, 1);
    
    // Invert difficulty (lower difficulty = higher opportunity)
    const difficultyScore = Math.max(0, (10 - avgDifficulty) / 10);
    
    // Opportunity ratio
    const opportunityRatio = highOpportunityCount / keywords.length;
    
    return (volumeScore * 0.4 + difficultyScore * 0.4 + opportunityRatio * 0.2);
  }

  /**
   * Determine cluster type based on keyword patterns
   */
  private determineClusterType(keywords: string[]): 'semantic' | 'category' | 'intent' | 'competitor' {
    const allText = keywords.join(' ').toLowerCase();
    
    if (allText.includes('app') || allText.includes('software') || allText.includes('tool')) {
      return 'category';
    }
    
    if (allText.includes('best') || allText.includes('top') || allText.includes('review')) {
      return 'intent';
    }
    
    if (keywords.some(k => k.split(' ').length > 3)) {
      return 'intent';
    }
    
    return 'semantic';
  }

  /**
   * Generate meaningful cluster name
   */
  private generateClusterName(primaryKeyword: string, type: string): string {
    const words = primaryKeyword.split(' ');
    const capitalizedWords = words.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    );
    
    return capitalizedWords.join(' ') + ` (${type})`;
  }
}

export const semanticClusteringService = new SemanticClusteringService();
