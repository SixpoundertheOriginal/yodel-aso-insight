
import { KeywordData, parseKeywordData } from './keywordAnalysis';

export interface MetadataField {
  title: string;
  subtitle: string;
  keywords: string;
}

export interface MetadataConstraints {
  titleLimit: number;
  subtitleLimit: number;
  keywordsLimit: number;
}

export interface MetadataScore {
  coverage: number;
  conversion: number;
  compliance: number;
  overall: number;
}

export interface EnhancedKeywordData extends KeywordData {
  metadataFlags?: {
    titleOnly?: boolean;
    supportive?: boolean;
    fallback?: boolean;
    banned?: boolean;
  };
  titlePriority?: number;
  subtitlePriority?: number;
}

export class MetadataEngine {
  private constraints: MetadataConstraints = {
    titleLimit: 30,
    subtitleLimit: 30,
    keywordsLimit: 100
  };

  private bannedTerms = ['best', '#1', 'free', 'top', 'ultimate'];

  filterAndPrioritizeKeywords(keywords: KeywordData[]): EnhancedKeywordData[] {
    return keywords
      .filter(k => !this.bannedTerms.some(term => 
        k.keyword.toLowerCase().includes(term.toLowerCase())
      ))
      .map(k => ({
        ...k,
        titlePriority: this.calculateTitlePriority(k),
        subtitlePriority: this.calculateSubtitlePriority(k),
        metadataFlags: {
          titleOnly: k.volume > 80 && k.relevancy > 30,
          supportive: k.volume > 60 && k.relevancy > 20,
          fallback: k.volume > 40,
          banned: this.bannedTerms.some(term => 
            k.keyword.toLowerCase().includes(term.toLowerCase())
          )
        }
      }))
      .sort((a, b) => (b.titlePriority || 0) - (a.titlePriority || 0));
  }

  private calculateTitlePriority(keyword: KeywordData): number {
    return (keyword.volume * 0.4) + (keyword.relevancy * 0.3) + (keyword.kei * 0.3);
  }

  private calculateSubtitlePriority(keyword: KeywordData): number {
    return (keyword.volume * 0.3) + (keyword.relevancy * 0.4) + (keyword.chance * 0.3);
  }

  allocateKeywordsToBudget(keywords: EnhancedKeywordData[]): {
    titleKeywords: EnhancedKeywordData[];
    subtitleKeywords: EnhancedKeywordData[];
    keywordFieldTerms: EnhancedKeywordData[];
  } {
    const titleKeywords: EnhancedKeywordData[] = [];
    const subtitleKeywords: EnhancedKeywordData[] = [];
    const keywordFieldTerms: EnhancedKeywordData[] = [];
    
    let titleBudget = this.constraints.titleLimit;
    let subtitleBudget = this.constraints.subtitleLimit;
    let keywordsBudget = this.constraints.keywordsLimit;

    // Allocate to title first (highest priority)
    for (const keyword of keywords) {
      if (keyword.metadataFlags?.titleOnly && titleBudget >= keyword.keyword.length + 1) {
        titleKeywords.push(keyword);
        titleBudget -= keyword.keyword.length + 1; // +1 for space
        if (titleKeywords.length >= 2) break; // Max 2 keywords in title
      }
    }

    // Allocate to subtitle (complementary keywords)
    for (const keyword of keywords) {
      if (!titleKeywords.includes(keyword) && 
          keyword.metadataFlags?.supportive && 
          subtitleBudget >= keyword.keyword.length + 1) {
        subtitleKeywords.push(keyword);
        subtitleBudget -= keyword.keyword.length + 1;
        if (subtitleKeywords.length >= 3) break; // Max 3 keywords in subtitle
      }
    }

    // Allocate remaining to keyword field
    for (const keyword of keywords) {
      if (!titleKeywords.includes(keyword) && 
          !subtitleKeywords.includes(keyword) &&
          keywordsBudget >= keyword.keyword.length + 1) {
        keywordFieldTerms.push(keyword);
        keywordsBudget -= keyword.keyword.length + 1; // +1 for comma
      }
    }

    return { titleKeywords, subtitleKeywords, keywordFieldTerms };
  }

  validateMetadata(metadata: MetadataField): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    characterCounts: { title: number; subtitle: number; keywords: number };
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const titleLength = metadata.title.length;
    const subtitleLength = metadata.subtitle.length;
    const keywordsLength = metadata.keywords.length;

    // Character limit validation
    if (titleLength > this.constraints.titleLimit) {
      errors.push(`Title exceeds ${this.constraints.titleLimit} characters (${titleLength})`);
    }
    if (subtitleLength > this.constraints.subtitleLimit) {
      errors.push(`Subtitle exceeds ${this.constraints.subtitleLimit} characters (${subtitleLength})`);
    }
    if (keywordsLength > this.constraints.keywordsLimit) {
      errors.push(`Keywords exceed ${this.constraints.keywordsLimit} characters (${keywordsLength})`);
    }

    // Duplication check
    const titleWords = metadata.title.toLowerCase().split(/\s+/);
    const subtitleWords = metadata.subtitle.toLowerCase().split(/\s+/);
    const keywordsList = metadata.keywords.toLowerCase().split(',').map(k => k.trim());

    const titleSubtitleOverlap = titleWords.filter(word => 
      subtitleWords.includes(word) && word.length > 2
    );
    if (titleSubtitleOverlap.length > 0) {
      warnings.push(`Title and subtitle share words: ${titleSubtitleOverlap.join(', ')}`);
    }

    const titleKeywordsOverlap = titleWords.filter(word => 
      keywordsList.some(keyword => keyword.includes(word)) && word.length > 2
    );
    if (titleKeywordsOverlap.length > 0) {
      warnings.push(`Title and keywords share terms: ${titleKeywordsOverlap.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      characterCounts: {
        title: titleLength,
        subtitle: subtitleLength,
        keywords: keywordsLength
      }
    };
  }

  calculateMetadataScore(metadata: MetadataField, keywords: EnhancedKeywordData[]): MetadataScore {
    // Coverage score: how many high-value keywords are included
    const totalKeywords = keywords.filter(k => k.volume > 50).length;
    const includedKeywords = keywords.filter(k => 
      k.volume > 50 && (
        metadata.title.toLowerCase().includes(k.keyword.toLowerCase()) ||
        metadata.subtitle.toLowerCase().includes(k.keyword.toLowerCase()) ||
        metadata.keywords.toLowerCase().includes(k.keyword.toLowerCase())
      )
    ).length;
    const coverage = totalKeywords > 0 ? (includedKeywords / totalKeywords) * 100 : 0;

    // Conversion score: readability and natural language
    const conversion = this.calculateConversionScore(metadata);

    // Compliance score: adherence to rules and limits
    const validation = this.validateMetadata(metadata);
    const compliance = validation.isValid ? 100 : Math.max(0, 100 - (validation.errors.length * 20));

    const overall = (coverage * 0.4) + (conversion * 0.3) + (compliance * 0.3);

    return { coverage, conversion, compliance, overall };
  }

  private calculateConversionScore(metadata: MetadataField): number {
    let score = 100;
    
    // Penalize for unnatural structures
    if (metadata.title.includes(',')) score -= 10;
    if (metadata.subtitle.includes(',')) score -= 10;
    
    // Penalize for excessive repetition
    const allText = `${metadata.title} ${metadata.subtitle}`.toLowerCase();
    const words = allText.split(/\s+/);
    const uniqueWords = new Set(words.filter(w => w.length > 2));
    if (uniqueWords.size < words.length * 0.7) score -= 15;

    // Reward for natural capitalization
    if (this.hasNaturalCapitalization(metadata.title)) score += 5;
    if (this.hasNaturalCapitalization(metadata.subtitle)) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  private hasNaturalCapitalization(text: string): boolean {
    return /^[A-Z][a-z]+(\s[A-Z][a-z]+)*/.test(text);
  }

  generateKeywordFieldString(keywords: EnhancedKeywordData[]): string {
    return keywords
      .map(k => k.keyword.toLowerCase())
      .join(',')
      .substring(0, this.constraints.keywordsLimit);
  }
}

export const metadataEngine = new MetadataEngine();
