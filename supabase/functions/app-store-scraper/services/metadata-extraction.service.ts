export interface ExtractionInput {
  targetApp: any;
  competitors: any[];
}

export interface ExtractionResult {
  success: boolean;
  data?: {
    targetApp: any;
    competitors: any[];
  };
  error?: string;
}

export class MetadataExtractionService {
  constructor(private supabase: any) {}

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    try {
      // Extract and enrich target app metadata
      const enrichedTargetApp = await this.enrichMetadata(input.targetApp);
      
      // Extract competitor metadata (parallel processing)
      const competitorPromises = input.competitors.map(competitor => 
        this.extractBasicMetadata(competitor)
      );
      const enrichedCompetitors = await Promise.all(competitorPromises);

      return {
        success: true,
        data: {
          targetApp: enrichedTargetApp,
          competitors: enrichedCompetitors
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Metadata extraction failed: ${error.message}`
      };
    }
  }

  private async enrichMetadata(app: any): Promise<any> {
    // Start with iTunes API data
    let metadata = this.mapItunesDataToMetadata(app);

    // Enrich with HTML scraping if URL is available
    if (metadata.url) {
      const htmlData = await this.scrapeHtmlMetadata(metadata.url);
      metadata = this.mergeMetadata(metadata, htmlData);
    }

    return this.sanitizeMetadata(metadata);
  }

  private extractBasicMetadata(app: any): any {
    return this.sanitizeMetadata(this.mapItunesDataToMetadata(app));
  }

  private async scrapeHtmlMetadata(url: string): Promise<any> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      if (!response.ok) {
        console.warn(`HTML scraping failed for ${url}: ${response.status}`);
        return {};
      }

      const html = await response.text();
      return this.extractFromHtml(html);
    } catch (error) {
      console.warn(`HTML scraping error for ${url}:`, error);
      return {};
    }
  }

  private extractFromHtml(html: string): any {
    const scrapedData: any = {};
    
    // Extract from JSON-LD
    this.extractFromJsonLd(html, scrapedData);
    
    // Extract from Open Graph
    this.extractFromOpenGraph(html, scrapedData);
    
    // Extract from Apple-specific tags
    this.extractFromAppleTags(html, scrapedData);
    
    // Extract from standard meta tags
    this.extractFromStandardMeta(html, scrapedData);
    
    return scrapedData;
  }

  private extractFromJsonLd(html: string, data: any) {
    const regex = /<script name="schema:software-application" type="application\/ld\+json">([\s\S]*?)<\/script>/;
    const match = html.match(regex);
    
    if (match && match[1]) {
      try {
        const jsonData = JSON.parse(match[1]);
        data.name = data.name ?? jsonData.name;
        data.description = data.description ?? jsonData.description;
        data.applicationCategory = data.applicationCategory ?? jsonData.applicationCategory;
        data.operatingSystem = data.operatingSystem ?? jsonData.operatingSystem;
        data.screenshot = data.screenshot ?? jsonData.screenshot;
        data.url = data.url ?? jsonData.url;
        data.author = data.author ?? jsonData.author?.name;
        data.icon = data.icon ?? jsonData.image;

        if (jsonData.aggregateRating?.ratingValue !== undefined && data.ratingValue === undefined) {
          const numVal = Number(jsonData.aggregateRating.ratingValue);
          if (!isNaN(numVal)) data.ratingValue = numVal;
        }
        
        if (jsonData.aggregateRating?.reviewCount !== undefined && data.reviewCount === undefined) {
          const numVal = Number(jsonData.aggregateRating.reviewCount);
          if (!isNaN(numVal)) data.reviewCount = numVal;
        }
      } catch (e) {
        console.warn('JSON-LD parsing failed:', e.message);
      }
    }
  }

  private extractFromOpenGraph(html: string, data: any) {
    data.name = data.name ?? this.extractMetaContent(html, 'property', 'og:title');
    data.description = data.description ?? this.extractMetaContent(html, 'property', 'og:description');
    data.url = data.url ?? this.extractMetaContent(html, 'property', 'og:url');
    data.icon = data.icon ?? this.extractMetaContent(html, 'property', 'og:image');
  }

  private extractFromAppleTags(html: string, data: any) {
    data.icon = data.icon ?? this.extractLinkHref(html, 'apple-touch-icon');
  }

  private extractFromStandardMeta(html: string, data: any) {
    data.description = data.description ?? this.extractMetaContent(html, 'name', 'description');
    data.author = data.author ?? this.extractMetaContent(html, 'name', 'author');
    data.name = data.name ?? this.extractMetaContent(html, 'name', 'application-name');
  }

  private extractMetaContent(html: string, propertyType: 'name' | 'property', value: string): string | null {
    const regex = new RegExp(`<meta\\s+${propertyType}="\\s*${value}\\s*"\\s+content="([^"]+)"`, 'i');
    const match = html.match(regex);
    return match ? match[1].trim() : null;
  }

  private extractLinkHref(html: string, relValue: string): string | null {
    const regex = new RegExp(`<link\\s+[^>]*rel="\\s*${relValue}\\s*"[^>]*href="([^"]+)"`, 'i');
    const match = html.match(regex);
    return match ? match[1].trim() : null;
  }

  private mapItunesDataToMetadata(itunesData: any): any {
    const metadata: any = {};
    
    metadata.name = itunesData.trackName;
    if (metadata.name) {
      const parts = itunesData.trackName.split(' - ');
      if (parts.length > 1 && parts[0].length > 0) {
        metadata.title = parts[0].trim();
        metadata.subtitle = parts.slice(1).join(' - ').trim();
      } else {
        metadata.title = itunesData.trackName.trim();
        metadata.subtitle = '';
      }
    }

    metadata.url = itunesData.trackViewUrl;
    metadata.description = itunesData.description;
    metadata.applicationCategory = itunesData.primaryGenreName;
    metadata.operatingSystem = itunesData.supportedDevices?.join(', ') || 'iOS';
    metadata.icon = itunesData.artworkUrl512 || itunesData.artworkUrl100;
    metadata.developer = itunesData.artistName;
    metadata.rating = itunesData.averageUserRating;
    metadata.reviews = itunesData.userRatingCount;
    metadata.price = itunesData.formattedPrice || 'Free';
    metadata.author = itunesData.artistName;
    metadata.ratingValue = itunesData.averageUserRating;
    metadata.reviewCount = itunesData.userRatingCount;
    metadata.screenshot = itunesData.screenshotUrls;

    return metadata;
  }

  private mergeMetadata(primary: any, secondary: any): any {
    return {
      ...primary,
      // Use secondary data for enrichment
      description: secondary.description ?? primary.description,
      icon: primary.icon ?? secondary.icon,
      screenshot: primary.screenshot ?? secondary.screenshot,
      ratingValue: primary.ratingValue ?? secondary.ratingValue,
      reviewCount: primary.reviewCount ?? secondary.reviewCount,
      // Keep primary data for core fields
      name: primary.name ?? secondary.name,
      url: primary.url ?? secondary.url,
    };
  }

  private sanitizeMetadata(metadata: any): any {
    const decodeHtmlEntities = (text?: string): string | undefined => {
      if (!text) return undefined;
      return text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    };

    const getValidNumber = (primary: any, fallback: any): number => {
      const primaryNum = Number(primary);
      if (typeof primary === 'number' && !isNaN(primaryNum)) return primaryNum;
      
      const fallbackNum = Number(fallback);
      if (typeof fallback === 'number' && !isNaN(fallbackNum)) return fallbackNum;

      return 0;
    };
    
    return {
      ...metadata,
      name: decodeHtmlEntities(metadata.name) || 'Unknown App',
      url: metadata.url || '',
      title: decodeHtmlEntities(metadata.title) || decodeHtmlEntities(metadata.name) || 'App Title',
      subtitle: decodeHtmlEntities(metadata.subtitle) || '',
      description: metadata.description || 'No description available.',
      applicationCategory: metadata.applicationCategory || 'App',
      locale: '',
      icon: metadata.icon || undefined,
      developer: decodeHtmlEntities(metadata.developer || metadata.author) || undefined,
      rating: getValidNumber(metadata.rating, metadata.ratingValue),
      reviews: getValidNumber(metadata.reviews, metadata.reviewCount),
      price: metadata.price || 'Free',
    };
  }
}
