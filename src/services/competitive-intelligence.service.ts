
import { CompetitorData, CompetitorKeywordAnalysis, ScrapedMetadata } from '@/types/aso';
import { competitorAnalysisService } from './competitor-analysis.service';

interface CompetitiveContext {
  competitors: CompetitorData[];
  keywordGaps: string[];
  opportunities: string[];
  threats: string[];
  positioning: string[];
}

interface MarketIntelligence {
  saturation: number;
  averageRating: number;
  categoryLeader?: CompetitorData;
  trends: string[];
  recommendations: string[];
}

class CompetitiveIntelligenceService {
  /**
   * Generate comprehensive competitive context for AI metadata generation
   */
  generateCompetitiveContext(
    competitors: CompetitorData[],
    userKeywords: string[] = [],
    targetApp?: ScrapedMetadata
  ): CompetitiveContext {
    const keywordAnalysis = competitorAnalysisService.analyzeCompetitorKeywords(competitors);
    
    // Identify keyword gaps
    const competitorKeywords = keywordAnalysis.map(item => item.keyword);
    const keywordGaps = competitorKeywords.filter(keyword => 
      !userKeywords.some(userKeyword => 
        userKeyword.toLowerCase().includes(keyword.toLowerCase())
      )
    ).slice(0, 15);

    // Identify opportunities (moderate competition)
    const opportunities = keywordAnalysis
      .filter(item => item.percentage >= 40 && item.percentage <= 70)
      .map(item => item.keyword)
      .slice(0, 10);

    // Identify threats (high competition)
    const threats = keywordAnalysis
      .filter(item => item.percentage > 80)
      .map(item => item.keyword)
      .slice(0, 8);

    // Generate positioning insights
    const positioning = this.generatePositioningInsights(competitors, targetApp);

    return {
      competitors,
      keywordGaps,
      opportunities,
      threats,
      positioning
    };
  }

  /**
   * Generate market intelligence for strategic decisions
   */
  generateMarketIntelligence(competitors: CompetitorData[]): MarketIntelligence {
    if (competitors.length === 0) {
      return {
        saturation: 0,
        averageRating: 0,
        trends: [],
        recommendations: ['Consider being a first mover in this space']
      };
    }

    const ratings = competitors.map(c => c.rating || 0).filter(r => r > 0);
    const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    const saturation = Math.min((competitors.length / 20) * 100, 100);
    
    const categoryLeader = competitors.reduce((leader, comp) => 
      (comp.rating || 0) > (leader.rating || 0) ? comp : leader, 
      competitors[0]
    );

    const trends = this.identifyMarketTrends(competitors);
    const recommendations = this.generateMarketRecommendations(saturation, averageRating, trends);

    return {
      saturation,
      averageRating,
      categoryLeader,
      trends,
      recommendations
    };
  }

  /**
   * Create competitive-aware AI prompt enhancement
   */
  createCompetitivePromptContext(context: CompetitiveContext, targetAudience?: string): string {
    if (context.competitors.length === 0) {
      return 'No competitive data available for context.';
    }

    let promptContext = `COMPETITIVE INTELLIGENCE CONTEXT:

Market Overview:
- ${context.competitors.length} direct competitors analyzed
- Category: ${context.competitors[0]?.category || 'Mixed'}
${targetAudience ? `- Target Audience: ${targetAudience}` : ''}

`;

    if (context.keywordGaps.length > 0) {
      promptContext += `Keyword Opportunities (competitors use, you don't):
${context.keywordGaps.slice(0, 8).map(k => `- ${k}`).join('\n')}

`;
    }

    if (context.opportunities.length > 0) {
      promptContext += `Medium-Competition Keywords (good targets):
${context.opportunities.slice(0, 6).map(k => `- ${k}`).join('\n')}

`;
    }

    if (context.threats.length > 0) {
      promptContext += `High-Competition Keywords (avoid or differentiate):
${context.threats.slice(0, 5).map(k => `- ${k}`).join('\n')}

`;
    }

    if (context.positioning.length > 0) {
      promptContext += `Positioning Insights:
${context.positioning.map(p => `- ${p}`).join('\n')}

`;
    }

    promptContext += `STRATEGIC GUIDANCE: Use this competitive context to suggest metadata that differentiates from competitors while targeting underserved keyword opportunities. Avoid oversaturated terms unless you can provide a unique angle.`;

    return promptContext;
  }

  /**
   * Generate positioning insights based on competitive analysis
   */
  private generatePositioningInsights(competitors: CompetitorData[], targetApp?: ScrapedMetadata): string[] {
    const insights: string[] = [];

    if (competitors.length === 0) return insights;

    const avgRating = competitors.reduce((sum, c) => sum + (c.rating || 0), 0) / competitors.length;
    
    if (avgRating < 4.0) {
      insights.push('Market has quality gaps - emphasize superior user experience');
    }

    // Analyze title patterns
    const titleWords = competitors.flatMap(c => 
      (c.title || '').toLowerCase().split(/\s+/).filter(w => w.length > 3)
    );
    const commonTitleWords = this.findCommonWords(titleWords);
    
    if (commonTitleWords.length > 0) {
      insights.push(`Competitors commonly use: ${commonTitleWords.slice(0, 3).join(', ')} - consider differentiation`);
    }

    // Analyze subtitle patterns
    const subtitleWords = competitors.flatMap(c => 
      (c.subtitle || '').toLowerCase().split(/\s+/).filter(w => w.length > 3)
    );
    const commonSubtitleWords = this.findCommonWords(subtitleWords);
    
    if (commonSubtitleWords.length > 0 && commonSubtitleWords[0] !== commonTitleWords[0]) {
      insights.push(`Subtitle opportunity: avoid overused '${commonSubtitleWords[0]}'`);
    }

    // Market saturation insight
    if (competitors.length > 15) {
      insights.push('Highly competitive market - focus on unique value proposition');
    } else if (competitors.length < 5) {
      insights.push('Low competition - opportunity for category leadership');
    }

    return insights;
  }

  /**
   * Identify trending patterns in competitor metadata
   */
  private identifyMarketTrends(competitors: CompetitorData[]): string[] {
    const trends: string[] = [];

    // Analyze common themes in descriptions and titles
    const allText = competitors.flatMap(c => [
      c.title || '',
      c.subtitle || '',
      c.description?.substring(0, 200) || ''
    ]).join(' ').toLowerCase();

    const trendKeywords = [
      'ai', 'smart', 'premium', 'pro', 'ultimate', 'advanced',
      'easy', 'simple', 'fast', 'secure', 'free', 'unlimited'
    ];

    trendKeywords.forEach(keyword => {
      const frequency = (allText.match(new RegExp(keyword, 'g')) || []).length;
      if (frequency >= competitors.length * 0.3) {
        trends.push(`"${keyword}" is trending in this category`);
      }
    });

    return trends.slice(0, 3);
  }

  /**
   * Generate strategic recommendations based on market analysis
   */
  private generateMarketRecommendations(
    saturation: number, 
    averageRating: number, 
    trends: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (saturation < 50) {
      recommendations.push('Low competition - consider broader keyword targeting');
    } else if (saturation > 80) {
      recommendations.push('High competition - focus on long-tail keywords and unique positioning');
    }

    if (averageRating < 4.0) {
      recommendations.push('Quality opportunity - emphasize superior features and user experience');
    }

    if (trends.length > 0) {
      recommendations.push(`Consider incorporating trending themes: ${trends[0]}`);
    }

    recommendations.push('Analyze top performer metadata for successful patterns');

    return recommendations;
  }

  /**
   * Find most common words in text array
   */
  private findCommonWords(words: string[]): string[] {
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(wordCount)
      .filter(([word, count]) => count >= 2 && word.length > 3)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, 5);
  }
}

export const competitiveIntelligenceService = new CompetitiveIntelligenceService();
