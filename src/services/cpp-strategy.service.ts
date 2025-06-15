
import { supabase } from '@/integrations/supabase/client';
import { ScrapedMetadata, CppConfig, CppStrategyData, CppTheme } from '@/types/aso';

class CppStrategyService {
  private cache = new Map<string, { data: CppStrategyData; timestamp: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Generate CPP strategy from App Store URL with screenshot analysis
   */
  async generateCppStrategy(appStoreUrl: string, config: CppConfig): Promise<CppStrategyData> {
    const cacheKey = `${config.organizationId}-${appStoreUrl}-cpp`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('📦 [CPP-CACHE] Using cached strategy for:', appStoreUrl);
      return cached.data;
    }

    console.log('🚀 [CPP-STRATEGY] Starting CPP analysis for:', appStoreUrl);

    try {
      // Call enhanced app-store-scraper with CPP analysis
      const { data: responseData, error: invokeError } = await supabase.functions.invoke('app-store-scraper', {
        body: { 
          appStoreUrl, 
          organizationId: config.organizationId,
          analyzeCpp: true,
          includeScreenshotAnalysis: config.includeScreenshotAnalysis !== false,
          generateThemes: config.generateThemes !== false,
          includeCompetitorAnalysis: config.includeCompetitorAnalysis
        },
      });

      if (invokeError) {
        console.error('❌ [CPP-STRATEGY] Function invocation error:', invokeError);
        throw new Error(`CPP analysis service unavailable: ${invokeError.message}`);
      }

      if (responseData.error) {
        console.error('❌ [CPP-STRATEGY] Analysis error:', responseData.error);
        throw new Error(responseData.error);
      }

      // Transform the enhanced metadata into CPP strategy
      const cppStrategy = this.transformToCppStrategy(responseData);
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: cppStrategy,
        timestamp: Date.now()
      });

      console.log('✅ [CPP-STRATEGY] Analysis complete:', cppStrategy.suggestedThemes.length, 'themes generated');
      return cppStrategy;

    } catch (error) {
      console.error('❌ [CPP-STRATEGY] Generation failed:', error);
      throw error;
    }
  }

  /**
   * Transform enhanced metadata into CPP strategy data
   */
  private transformToCppStrategy(metadata: ScrapedMetadata): CppStrategyData {
    return {
      originalApp: {
        name: metadata.name,
        screenshots: metadata.screenshotAnalysis || []
      },
      suggestedThemes: metadata.suggestedCppThemes || [],
      competitorInsights: metadata.competitorScreenshots,
      recommendations: {
        primaryTheme: metadata.suggestedCppThemes?.[0]?.name || 'Feature Showcase',
        alternativeThemes: metadata.suggestedCppThemes?.slice(1, 3).map(t => t.name) || [],
        keyDifferentiators: this.extractKeyDifferentiators(metadata)
      }
    };
  }

  /**
   * Extract key differentiators from screenshot analysis
   */
  private extractKeyDifferentiators(metadata: ScrapedMetadata): string[] {
    const features = new Set<string>();
    
    metadata.screenshotAnalysis?.forEach(screenshot => {
      screenshot.analysis.features.forEach(feature => features.add(feature));
    });
    
    return Array.from(features).slice(0, 5);
  }

  /**
   * Generate theme variations for A/B testing
   */
  generateThemeVariations(baseTheme: CppTheme): CppTheme[] {
    const variations: CppTheme[] = [];
    
    // Mood variations
    const moodVariations = ['professional', 'playful', 'minimalist', 'bold'];
    moodVariations.forEach((mood, index) => {
      if (mood !== baseTheme.visualStyle.mood) {
        variations.push({
          ...baseTheme,
          id: `${baseTheme.id}-${mood}`,
          name: `${baseTheme.name} (${mood})`,
          visualStyle: {
            ...baseTheme.visualStyle,
            mood
          }
        });
      }
    });
    
    return variations.slice(0, 2); // Return top 2 variations
  }

  /**
   * Export CPP strategy to different formats
   */
  exportStrategy(strategy: CppStrategyData, format: 'json' | 'csv' | 'notion'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(strategy, null, 2);
      case 'csv':
        return this.convertToCsv(strategy);
      case 'notion':
        return this.convertToNotionMarkdown(strategy);
      default:
        return JSON.stringify(strategy, null, 2);
    }
  }

  private convertToCsv(strategy: CppStrategyData): string {
    const headers = ['Theme Name', 'Tagline', 'Target Audience', 'Value Hook', 'Search Terms'];
    const rows = strategy.suggestedThemes.map(theme => [
      theme.name,
      theme.tagline,
      theme.targetAudience,
      theme.valueHook,
      theme.searchTerms.join('; ')
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private convertToNotionMarkdown(strategy: CppStrategyData): string {
    let markdown = `# CPP Strategy for ${strategy.originalApp.name}\n\n`;
    
    markdown += `## Recommended Themes\n\n`;
    strategy.suggestedThemes.forEach((theme, index) => {
      markdown += `### ${index + 1}. ${theme.name}\n`;
      markdown += `- **Tagline**: ${theme.tagline}\n`;
      markdown += `- **Target Audience**: ${theme.targetAudience}\n`;
      markdown += `- **Value Hook**: ${theme.valueHook}\n`;  
      markdown += `- **Search Terms**: ${theme.searchTerms.join(', ')}\n\n`;
    });
    
    return markdown;
  }

  /**
   * Clear cache
   */
  clearCache(organizationId?: string): void {
    if (organizationId) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(organizationId));
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }
}

export const cppStrategyService = new CppStrategyService();
