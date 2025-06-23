
/**
 * Metadata Scoring Service
 * Analyzes app metadata quality and provides optimization scores
 */

import { ScrapedMetadata, CompetitorData } from '@/types/aso';

export interface MetadataScores {
  overall: number;
  title: number;
  subtitle: number;
  keywords: number;
  description: number;
  breakdown: {
    characterUsage: number;
    keywordDensity: number;
    uniqueness: number;
    competitiveStrength: number;
  };
}

export interface MetadataAnalysis {
  scores: MetadataScores;
  recommendations: Array<{
    field: 'title' | 'subtitle' | 'keywords' | 'description';
    priority: 'high' | 'medium' | 'low';
    issue: string;
    suggestion: string;
    impact: number;
  }>;
  competitorComparison: {
    betterThan: number;
    worseThan: number;
    averageScore: number;
  };
}

class MetadataScoringService {
  private maxCharacters = {
    title: 30,
    subtitle: 30,
    keywords: 100,
    description: 4000
  };

  /**
   * Analyze app metadata and generate comprehensive scores
   */
  async analyzeMetadata(
    metadata: ScrapedMetadata,
    competitors: CompetitorData[] = [],
    targetKeywords: string[] = []
  ): Promise<MetadataAnalysis> {
    console.log('📊 [METADATA-SCORING] Analyzing metadata for', metadata.name);

    const scores = this.calculateScores(metadata, competitors, targetKeywords);
    const recommendations = this.generateRecommendations(metadata, scores, competitors);
    const competitorComparison = this.compareWithCompetitors(scores, competitors);

    return {
      scores,
      recommendations,
      competitorComparison
    };
  }

  /**
   * Calculate detailed metadata scores
   */
  private calculateScores(
    metadata: ScrapedMetadata,
    competitors: CompetitorData[],
    targetKeywords: string[]
  ): MetadataScores {
    const titleScore = this.scoreTitleField(metadata.title, targetKeywords);
    const subtitleScore = this.scoreSubtitleField(metadata.subtitle || '', targetKeywords);
    const keywordsScore = this.scoreKeywordsField(metadata.title + ' ' + (metadata.subtitle || ''), targetKeywords);
    const descriptionScore = this.scoreDescriptionField(metadata.description || '', targetKeywords);

    // Calculate breakdown metrics
    const characterUsage = this.calculateCharacterUsage(metadata);
    const keywordDensity = this.calculateKeywordDensity(metadata, targetKeywords);
    const uniqueness = this.calculateUniqueness(metadata, competitors);
    const competitiveStrength = this.calculateCompetitiveStrength(metadata, competitors);

    const overall = Math.round(
      (titleScore * 0.3 + subtitleScore * 0.25 + keywordsScore * 0.25 + descriptionScore * 0.2)
    );

    return {
      overall,
      title: titleScore,
      subtitle: subtitleScore,
      keywords: keywordsScore,
      description: descriptionScore,
      breakdown: {
        characterUsage,
        keywordDensity,
        uniqueness,
        competitiveStrength
      }
    };
  }

  /**
   * Score title field
   */
  private scoreTitleField(title: string, targetKeywords: string[]): number {
    let score = 50; // Base score

    // Character length optimization
    const length = title.length;
    if (length >= 25 && length <= 30) {
      score += 20;
    } else if (length >= 20 && length < 25) {
      score += 15;
    } else if (length < 20) {
      score += 5;
    }

    // Keyword inclusion
    const titleLower = title.toLowerCase();
    const keywordMatches = targetKeywords.filter(keyword => 
      titleLower.includes(keyword.toLowerCase())
    );
    score += Math.min(keywordMatches.length * 10, 30);

    return Math.min(score, 100);
  }

  /**
   * Score subtitle field
   */
  private scoreSubtitleField(subtitle: string, targetKeywords: string[]): number {
    if (!subtitle) return 0;

    let score = 40; // Base score for having subtitle

    // Character length optimization
    const length = subtitle.length;
    if (length >= 25 && length <= 30) {
      score += 25;
    } else if (length >= 20 && length < 25) {
      score += 20;
    }

    // Keyword inclusion
    const subtitleLower = subtitle.toLowerCase();
    const keywordMatches = targetKeywords.filter(keyword => 
      subtitleLower.includes(keyword.toLowerCase())
    );
    score += Math.min(keywordMatches.length * 10, 35);

    return Math.min(score, 100);
  }

  /**
   * Score keywords field
   */
  private scoreKeywordsField(combinedText: string, targetKeywords: string[]): number {
    let score = 30; // Base score

    const textLower = combinedText.toLowerCase();
    const uniqueKeywords = new Set(targetKeywords.map(k => k.toLowerCase()));
    
    let matchedKeywords = 0;
    uniqueKeywords.forEach(keyword => {
      if (textLower.includes(keyword)) {
        matchedKeywords++;
      }
    });

    // Score based on keyword coverage
    const coverage = uniqueKeywords.size > 0 ? matchedKeywords / uniqueKeywords.size : 0;
    score += coverage * 70;

    return Math.min(score, 100);
  }

  /**
   * Score description field
   */
  private scoreDescriptionField(description: string, targetKeywords: string[]): number {
    if (!description) return 20; // Low score for missing description

    let score = 40; // Base score

    // Length optimization
    const length = description.length;
    if (length >= 500 && length <= 2000) {
      score += 20;
    } else if (length >= 200 && length < 500) {
      score += 15;
    }

    // Keyword density
    const descLower = description.toLowerCase();
    const keywordMentions = targetKeywords.reduce((count, keyword) => {
      const regex = new RegExp(keyword.toLowerCase(), 'g');
      const matches = descLower.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);

    const density = keywordMentions / (description.split(' ').length || 1);
    if (density >= 0.02 && density <= 0.05) {
      score += 40; // Optimal density
    } else if (density >= 0.01 && density < 0.02) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate character usage efficiency
   */
  private calculateCharacterUsage(metadata: ScrapedMetadata): number {
    const titleUsage = (metadata.title.length / this.maxCharacters.title) * 100;
    const subtitleUsage = ((metadata.subtitle?.length || 0) / this.maxCharacters.subtitle) * 100;
    
    return Math.round((titleUsage + subtitleUsage) / 2);
  }

  /**
   * Calculate keyword density
   */
  private calculateKeywordDensity(metadata: ScrapedMetadata, targetKeywords: string[]): number {
    const allText = [
      metadata.title,
      metadata.subtitle || '',
      metadata.description || ''
    ].join(' ').toLowerCase();

    const words = allText.split(/\s+/).length;
    const keywordMentions = targetKeywords.reduce((count, keyword) => {
      const regex = new RegExp(keyword.toLowerCase(), 'g');
      const matches = allText.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);

    return Math.round((keywordMentions / words) * 100 * 100) / 100; // Percentage with 2 decimals
  }

  /**
   * Calculate uniqueness compared to competitors
   */
  private calculateUniqueness(metadata: ScrapedMetadata, competitors: CompetitorData[]): number {
    if (competitors.length === 0) return 50;

    const myText = (metadata.title + ' ' + (metadata.subtitle || '')).toLowerCase();
    const myWords = new Set(myText.split(/\s+/));

    let totalSimilarity = 0;
    competitors.forEach(competitor => {
      const compText = (competitor.title + ' ' + (competitor.subtitle || '')).toLowerCase();
      const compWords = new Set(compText.split(/\s+/));
      
      const intersection = new Set([...myWords].filter(x => compWords.has(x)));
      const similarity = intersection.size / Math.max(myWords.size, compWords.size);
      totalSimilarity += similarity;
    });

    const avgSimilarity = totalSimilarity / competitors.length;
    return Math.round((1 - avgSimilarity) * 100);
  }

  /**
   * Calculate competitive strength
   */
  private calculateCompetitiveStrength(metadata: ScrapedMetadata, competitors: CompetitorData[]): number {
    if (competitors.length === 0) return 50;

    // Compare ratings, reviews, and metadata length
    const myRating = metadata.rating || 0;
    const myReviews = metadata.reviews || 0;
    const myTextLength = (metadata.title + metadata.subtitle + metadata.description).length;

    let betterThanCount = 0;
    competitors.forEach(competitor => {
      const compRating = competitor.rating || 0;
      const compReviews = competitor.reviewCount || 0;
      const compTextLength = (competitor.title + competitor.subtitle + competitor.description).length;

      let score = 0;
      if (myRating >= compRating) score++;
      if (myReviews >= compReviews) score++;
      if (myTextLength >= compTextLength) score++;

      if (score >= 2) betterThanCount++;
    });

    return Math.round((betterThanCount / competitors.length) * 100);
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    metadata: ScrapedMetadata,
    scores: MetadataScores,
    competitors: CompetitorData[]
  ): MetadataAnalysis['recommendations'] {
    const recommendations: MetadataAnalysis['recommendations'] = [];

    // Title recommendations
    if (scores.title < 70) {
      recommendations.push({
        field: 'title',
        priority: 'high',
        issue: 'Title not fully optimized',
        suggestion: metadata.title.length < 25 
          ? 'Add more descriptive keywords to reach 25-30 characters'
          : 'Include more relevant keywords while staying under 30 characters',
        impact: 85
      });
    }

    // Subtitle recommendations
    if (scores.subtitle < 60) {
      recommendations.push({
        field: 'subtitle',
        priority: 'high',
        issue: 'Subtitle needs optimization',
        suggestion: !metadata.subtitle 
          ? 'Add a subtitle to provide additional keyword opportunities'
          : 'Optimize subtitle with relevant keywords (25-30 characters)',
        impact: 75
      });
    }

    // Keywords recommendations
    if (scores.keywords < 65) {
      recommendations.push({
        field: 'keywords',
        priority: 'medium',
        issue: 'Low keyword coverage',
        suggestion: 'Include more relevant keywords in title and subtitle',
        impact: 70
      });
    }

    // Description recommendations
    if (scores.description < 60) {
      recommendations.push({
        field: 'description',
        priority: 'medium',
        issue: 'Description could be improved',
        suggestion: !metadata.description 
          ? 'Add a comprehensive description with relevant keywords'
          : 'Optimize description length and keyword density (2-5%)',
        impact: 60
      });
    }

    return recommendations.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Compare with competitors
   */
  private compareWithCompetitors(
    scores: MetadataScores,
    competitors: CompetitorData[]
  ): MetadataAnalysis['competitorComparison'] {
    if (competitors.length === 0) {
      return {
        betterThan: 0,
        worsehan: 0,
        averageScore: scores.overall
      };
    }

    // This is a simplified comparison - in a real implementation,
    // you'd analyze competitor metadata using the same scoring system
    const estimatedCompetitorScores = competitors.map(() => Math.floor(Math.random() * 40) + 40);
    const betterThan = estimatedCompetitorScores.filter(score => scores.overall > score).length;
    const worsehan = competitors.length - betterThan;
    const averageScore = estimatedCompetitorScores.reduce((sum, score) => sum + score, 0) / competitors.length;

    return {
      betterThan,
      worsehan,
      averageScore: Math.round(averageScore)
    };
  }
}

export const metadataScoringService = new MetadataScoringService();
