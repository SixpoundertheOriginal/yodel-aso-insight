
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface KeywordRankingData {
  keyword: string;
  rank_position: number;
  search_volume: number;
  difficulty_score: number;
  volume_trend: 'up' | 'down' | 'stable';
}

class RankingDataValidatorService {
  /**
   * Validate keyword ranking data before insertion
   */
  validateKeywordRankings(data: KeywordRankingData[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(data) || data.length === 0) {
      errors.push('No data provided or data is not an array');
      return { isValid: false, errors, warnings };
    }

    data.forEach((item, index) => {
      // Validate keyword
      if (!item.keyword || typeof item.keyword !== 'string' || item.keyword.trim().length === 0) {
        errors.push(`Item ${index}: Keyword is required and must be a non-empty string`);
      } else if (item.keyword.length > 255) {
        warnings.push(`Item ${index}: Keyword is very long (${item.keyword.length} chars), consider shortening`);
      }

      // Validate rank position
      if (typeof item.rank_position !== 'number' || item.rank_position < 1) {
        errors.push(`Item ${index}: Rank position must be a number >= 1`);
      } else if (item.rank_position > 1000) {
        warnings.push(`Item ${index}: Rank position is very high (${item.rank_position}), verify accuracy`);
      }

      // Validate search volume
      if (typeof item.search_volume !== 'number' || item.search_volume < 0) {
        errors.push(`Item ${index}: Search volume must be a non-negative number`);
      }

      // Validate difficulty score
      if (typeof item.difficulty_score !== 'number' || item.difficulty_score < 0 || item.difficulty_score > 10) {
        errors.push(`Item ${index}: Difficulty score must be a number between 0 and 10`);
      }

      // Validate volume trend
      if (!['up', 'down', 'stable'].includes(item.volume_trend)) {
        errors.push(`Item ${index}: Volume trend must be 'up', 'down', or 'stable'`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Sanitize and normalize keyword ranking data
   */
  sanitizeKeywordRankings(data: KeywordRankingData[]): KeywordRankingData[] {
    return data
      .filter(item => item.keyword && typeof item.keyword === 'string')
      .map(item => ({
        keyword: item.keyword.trim().toLowerCase(),
        rank_position: Math.max(1, Math.floor(item.rank_position || 1)),
        search_volume: Math.max(0, Math.floor(item.search_volume || 0)),
        difficulty_score: Math.max(0, Math.min(10, Number(item.difficulty_score) || 0)),
        volume_trend: ['up', 'down', 'stable'].includes(item.volume_trend) 
          ? item.volume_trend 
          : 'stable'
      }));
  }

  /**
   * Check for data integrity issues
   */
  checkDataIntegrity(organizationId: string, appId: string, data: KeywordRankingData[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate keywords
    const keywordCounts = new Map<string, number>();
    data.forEach(item => {
      const normalizedKeyword = item.keyword.trim().toLowerCase();
      keywordCounts.set(normalizedKeyword, (keywordCounts.get(normalizedKeyword) || 0) + 1);
    });

    keywordCounts.forEach((count, keyword) => {
      if (count > 1) {
        warnings.push(`Duplicate keyword found: "${keyword}" appears ${count} times`);
      }
    });

    // Check for inconsistent ranking patterns
    const topRankedKeywords = data.filter(item => item.rank_position <= 10);
    const lowVolumeTopRanked = topRankedKeywords.filter(item => item.search_volume < 100);
    
    if (lowVolumeTopRanked.length > topRankedKeywords.length * 0.5) {
      warnings.push('Many top-ranked keywords have low search volume, verify data accuracy');
    }

    // Validate organization and app IDs
    if (!organizationId || typeof organizationId !== 'string') {
      errors.push('Organization ID is required and must be a valid string');
    }

    if (!appId || typeof appId !== 'string') {
      errors.push('App ID is required and must be a valid string');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export const rankingDataValidatorService = new RankingDataValidatorService();
