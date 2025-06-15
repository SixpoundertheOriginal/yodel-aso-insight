import { CompetitorData, CompetitorKeywordAnalysis } from '@/types/aso';

class CompetitorAnalysisService {
  /**
   * @deprecated This method is obsolete. Competitor data is now fetched directly via the API and attached to the main metadata object.
   */
  extractCompetitorData(description: string): { competitors: CompetitorData[]; cleanDescription: string } {
    console.warn("`extractCompetitorData` is deprecated and should no longer be used.");
    const regex = /<!--COMPETITORS_START-->((.|\n)*)<!--COMPETITORS_END-->/;
    const cleanDescription = description.replace(regex, '').trim();
    return {
      competitors: [],
      cleanDescription
    };
  }

  /**
   * Analyze competitor keywords for frequency and relevance
   */
  analyzeCompetitorKeywords(competitors: CompetitorData[]): CompetitorKeywordAnalysis[] {
    const keywordMap = new Map<string, { frequency: number; apps: Set<string> }>();
    const totalApps = competitors.length;

    if (totalApps === 0) {
      return [];
    }

    // Extract keywords from all competitor data
    competitors.forEach(competitor => {
      const allText = [
        competitor.title,
        competitor.subtitle,
        competitor.keywords,
        competitor.description
      ].filter(Boolean).join(' ').toLowerCase();

      // Simple keyword extraction (can be enhanced with NLP)
      const words = allText
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2)
        .filter(word => !this.isStopWord(word));

      words.forEach(word => {
        if (!keywordMap.has(word)) {
          keywordMap.set(word, { frequency: 0, apps: new Set() });
        }
        
        const entry = keywordMap.get(word)!;
        if (!entry.apps.has(competitor.id)) {
          entry.frequency++;
          entry.apps.add(competitor.id);
        }
      });
    });

    // Convert to analysis format and sort by frequency
    return Array.from(keywordMap.entries())
      .map(([keyword, data]) => ({
        keyword,
        frequency: data.frequency,
        percentage: Math.round((data.frequency / totalApps) * 100),
        apps: Array.from(data.apps)
      }))
      .filter(item => item.frequency > 1) // Only keywords appearing in multiple apps
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 50); // Top 50 keywords
  }

  /**
   * Generate competitor insights summary
   */
  generateCompetitorInsights(analysis: CompetitorKeywordAnalysis[]): string {
    if (analysis.length === 0) {
      return '';
    }

    const topKeywords = analysis.slice(0, 15);
    const threshold = Math.max(topKeywords[0]?.percentage - (topKeywords[0]?.percentage % 10), 20);

    return `
Top Competitor Keywords (found in over ${threshold}% of competitors):
${topKeywords.map(k => `- ${k.keyword} (in ${k.frequency} apps)`).join('\n')}`;
  }

  /**
   * Check if word is a stop word (can be expanded)
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'you', 'your', 'app', 'apps'
    ]);
    return stopWords.has(word);
  }

  /**
   * Filter keywords by relevance score
   */
  filterKeywordsByRelevance(analysis: CompetitorKeywordAnalysis[], minPercentage: number = 20): CompetitorKeywordAnalysis[] {
    return analysis.filter(item => item.percentage >= minPercentage);
  }
}

export const competitorAnalysisService = new CompetitorAnalysisService();
