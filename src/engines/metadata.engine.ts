import { MetadataField, MetadataScore, CompetitorKeywordAnalysis, KeywordData, CompetitorData, ValidationResult } from '@/types/aso';

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  sanitized: any;
}

class MetadataEngine {
  /**
   * Validate metadata against App Store requirements
   */
  validateMetadata(metadata: MetadataField): ValidationResult {
    const issues: string[] = [];

    // Title validation
    if (!metadata.title) {
      issues.push('Title is required');
    } else if (metadata.title.length > 30) {
      issues.push(`Title exceeds 30 characters (${metadata.title.length})`);
    }

    // Subtitle validation
    if (!metadata.subtitle) {
      issues.push('Subtitle is required');
    } else if (metadata.subtitle.length > 30) {
      issues.push(`Subtitle exceeds 30 characters (${metadata.subtitle.length})`);
    }

    // Keywords validation
    if (!metadata.keywords) {
      issues.push('Keywords are required');
    } else if (metadata.keywords.length > 100) {
      issues.push(`Keywords exceed 100 characters (${metadata.keywords.length})`);
    }

    // Check for keyword duplication between title and keywords
    if (metadata.title && metadata.keywords) {
      const titleWords = metadata.title.toLowerCase().split(/\s+/);
      const keywordList = metadata.keywords.toLowerCase().split(',').map(k => k.trim());
      
      const duplicates = titleWords.filter(word => 
        keywordList.some(keyword => keyword.includes(word) && word.length > 2)
      );
      
      if (duplicates.length > 0) {
        issues.push(`Avoid repeating title words in keywords: ${duplicates.join(', ')}`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      sanitized: metadata as any // Cast for now since we're validating metadata, not full scraped data
    };
  }

  /**
   * Calculate comprehensive metadata score - Updated to match centralized MetadataScore interface
   */
  calculateMetadataScore(metadata: MetadataField, keywords: KeywordData[] = []): MetadataScore {
    const titleScore = this.scoreTitleUsage(metadata.title);
    const subtitleScore = this.scoreSubtitleUsage(metadata.subtitle);
    const keywordsScore = this.scoreKeywordUsage(metadata.keywords);
    
    const characterUsage = this.calculateCharacterUsage(metadata);
    const keywordDensity = this.calculateKeywordDensity(metadata, keywords);
    const uniqueness = this.calculateUniqueness(metadata);

    const overall = Math.round(
      (titleScore * 0.3 + subtitleScore * 0.25 + keywordsScore * 0.25 + 
       characterUsage * 0.1 + keywordDensity * 0.05 + uniqueness * 0.05)
    );

    return {
      overall,
      title: titleScore,
      subtitle: subtitleScore,
      keywords: keywordsScore,
      breakdown: {
        characterUsage,
        keywordDensity,
        uniqueness
      }
    };
  }

  /**
   * Filter and prioritize keywords based on volume and relevancy
   */
  filterAndPrioritizeKeywords(keywords: KeywordData[]): KeywordData[] {
    return keywords
      .filter(k => k.keyword && k.keyword.trim().length > 0)
      .sort((a, b) => {
        const scoreA = (a.volume || 0) * 0.4 + (a.relevancy || 0) * 0.6;
        const scoreB = (b.volume || 0) * 0.4 + (b.relevancy || 0) * 0.6;
        return scoreB - scoreA;
      })
      .slice(0, 30);
  }

  /**
   * Analyze competitor keywords for insights
   */
  analyzeCompetitors(competitors: CompetitorData[]): CompetitorKeywordAnalysis[] {
    const keywordMap = new Map<string, { frequency: number; apps: Set<string> }>();
    const totalApps = competitors.length;

    if (totalApps === 0) return [];

    competitors.forEach(competitor => {
      const allText = [
        competitor.title,
        competitor.subtitle,
        competitor.keywords,
        competitor.description
      ].filter(Boolean).join(' ').toLowerCase();

      const words = allText
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2)
        .filter(word => !this.isStopWord(word));

      // Use a Set to ensure we only count frequency once per competitor for a given word
      const competitorWords = new Set(words);

      competitorWords.forEach(word => {
        if (!keywordMap.has(word)) {
          keywordMap.set(word, { frequency: 0, apps: new Set() });
        }
        
        const entry = keywordMap.get(word)!;
        entry.frequency++;
        entry.apps.add(competitor.id || competitor.name);
      });
    });

    return Array.from(keywordMap.entries())
      .map(([keyword, data]) => ({
        keyword,
        frequency: data.frequency,
        percentage: Math.round((data.frequency / totalApps) * 100),
        apps: Array.from(data.apps)
      }))
      .filter(item => item.frequency > 1)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 50);
  }

  private scoreTitleUsage(title: string): number {
    if (!title) return 0;
    const length = title.length;
    if (length >= 25 && length <= 30) return 100;
    if (length >= 20 && length < 25) return 85;
    if (length >= 15 && length < 20) return 70;
    return Math.max(0, 50 - Math.abs(20 - length) * 2);
  }

  private scoreSubtitleUsage(subtitle: string): number {
    if (!subtitle) return 0;
    const length = subtitle.length;
    if (length >= 25 && length <= 30) return 100;
    if (length >= 20 && length < 25) return 85;
    if (length >= 15 && length < 20) return 70;
    return Math.max(0, 50 - Math.abs(20 - length) * 2);
  }

  private scoreKeywordUsage(keywords: string): number {
    if (!keywords) return 0;
    const length = keywords.length;
    if (length >= 90 && length <= 100) return 100;
    if (length >= 80 && length < 90) return 85;
    if (length >= 70 && length < 80) return 70;
    return Math.max(0, 50 - Math.abs(80 - length));
  }

  private calculateCharacterUsage(metadata: MetadataField): number {
    const titleUsage = (metadata.title?.length || 0) / 30;
    const subtitleUsage = (metadata.subtitle?.length || 0) / 30;
    const keywordsUsage = (metadata.keywords?.length || 0) / 100;
    
    return Math.round((titleUsage + subtitleUsage + keywordsUsage) / 3 * 100);
  }

  private calculateKeywordDensity(metadata: MetadataField, keywords: KeywordData[]): number {
    if (keywords.length === 0) return 50;
    
    const allText = `${metadata.title} ${metadata.subtitle} ${metadata.keywords}`.toLowerCase();
    const matchedKeywords = keywords.filter(k => 
      allText.includes(k.keyword.toLowerCase())
    );
    
    return Math.round((matchedKeywords.length / keywords.length) * 100);
  }

  private calculateUniqueness(metadata: MetadataField): number {
    const allWords = `${metadata.title} ${metadata.subtitle}`.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    const uniqueWords = new Set(allWords);
    return Math.round((uniqueWords.size / Math.max(allWords.length, 1)) * 100);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 
      'these', 'those', 'you', 'your', 'app', 'apps'
    ]);
    return stopWords.has(word);
  }
}

export const metadataEngine = new MetadataEngine();
export type { MetadataField, MetadataScore, KeywordData };
