
export interface VisibilityMetrics {
  visibilityScore: number;
  estimatedImpressions: number;
  estimatedCTR: number;
  impactScore: number;
  competitiveGap: number;
}

export interface KeywordVisibilityData {
  keyword: string;
  rank: number;
  searchVolume: number;
  visibility: VisibilityMetrics;
  trend: 'up' | 'down' | 'stable';
  opportunity: 'high' | 'medium' | 'low';
}

class KeywordVisibilityCalculatorService {
  /**
   * Calculate visibility score based on rank, volume, and estimated CTR
   */
  calculateVisibilityScore(rank: number, searchVolume: number): VisibilityMetrics {
    // CTR estimates based on App Store research
    const ctrByRank = {
      1: 0.45, 2: 0.25, 3: 0.18, 4: 0.14, 5: 0.11,
      6: 0.09, 7: 0.08, 8: 0.07, 9: 0.06, 10: 0.05
    };
    
    const estimatedCTR = rank <= 10 ? ctrByRank[rank as keyof typeof ctrByRank] : Math.max(0.01, 0.05 * Math.pow(0.8, rank - 10));
    const estimatedImpressions = searchVolume * 0.7; // Assume 70% of searches see results
    const visibilityScore = (estimatedImpressions * estimatedCTR) / 100; // Normalized score
    
    // Impact score considers both visibility and potential
    const positionFactor = Math.max(0.1, (101 - rank) / 100);
    const volumeFactor = Math.min(1, searchVolume / 10000);
    const impactScore = visibilityScore * positionFactor * volumeFactor;
    
    // Competitive gap (how much visibility could improve if ranked #1)
    const maxVisibility = (estimatedImpressions * 0.45) / 100;
    const competitiveGap = maxVisibility - visibilityScore;
    
    return {
      visibilityScore: Math.round(visibilityScore * 100) / 100,
      estimatedImpressions: Math.round(estimatedImpressions),
      estimatedCTR: Math.round(estimatedCTR * 10000) / 100, // Percentage
      impactScore: Math.round(impactScore * 100) / 100,
      competitiveGap: Math.round(competitiveGap * 100) / 100
    };
  }

  /**
   * Calculate overall app visibility across all keywords
   */
  calculateAppVisibility(keywords: KeywordVisibilityData[]): {
    totalVisibility: number;
    averageRank: number;
    topKeywordContribution: number;
    improvementPotential: number;
    visibilityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  } {
    if (keywords.length === 0) {
      return {
        totalVisibility: 0,
        averageRank: 0,
        topKeywordContribution: 0,
        improvementPotential: 0,
        visibilityGrade: 'F'
      };
    }

    const totalVisibility = keywords.reduce((sum, kw) => sum + kw.visibility.visibilityScore, 0);
    const averageRank = keywords.reduce((sum, kw) => sum + kw.rank, 0) / keywords.length;
    const topKeywords = keywords.slice(0, 10); // Top 10 keywords
    const topKeywordContribution = topKeywords.reduce((sum, kw) => sum + kw.visibility.visibilityScore, 0);
    const improvementPotential = keywords.reduce((sum, kw) => sum + kw.visibility.competitiveGap, 0);

    // Grade based on total visibility and average rank
    let visibilityGrade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (totalVisibility > 1000 && averageRank < 10) visibilityGrade = 'A';
    else if (totalVisibility > 500 && averageRank < 20) visibilityGrade = 'B';
    else if (totalVisibility > 200 && averageRank < 35) visibilityGrade = 'C';
    else if (totalVisibility > 50 && averageRank < 50) visibilityGrade = 'D';

    return {
      totalVisibility: Math.round(totalVisibility),
      averageRank: Math.round(averageRank * 10) / 10,
      topKeywordContribution: Math.round(topKeywordContribution),
      improvementPotential: Math.round(improvementPotential),
      visibilityGrade
    };
  }

  /**
   * Identify high-impact keyword opportunities
   */
  identifyOpportunities(keywords: KeywordVisibilityData[]): {
    quickWins: KeywordVisibilityData[];
    highPotential: KeywordVisibilityData[];
    longTerm: KeywordVisibilityData[];
  } {
    const quickWins = keywords.filter(kw => 
      kw.rank > 5 && kw.rank <= 15 && 
      kw.searchVolume > 1000 && 
      kw.visibility.competitiveGap > 5
    );

    const highPotential = keywords.filter(kw => 
      kw.rank > 15 && kw.rank <= 30 && 
      kw.searchVolume > 2000 &&
      kw.opportunity === 'high'
    );

    const longTerm = keywords.filter(kw => 
      kw.rank > 30 && 
      kw.searchVolume > 5000 &&
      kw.visibility.competitiveGap > 10
    );

    return {
      quickWins: quickWins.slice(0, 10),
      highPotential: highPotential.slice(0, 10),
      longTerm: longTerm.slice(0, 10)
    };
  }
}

export const keywordVisibilityCalculatorService = new KeywordVisibilityCalculatorService();
