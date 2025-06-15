
import { supabase } from '@/integrations/supabase/client';
import { ScrapedMetadata, CppConfig, CppStrategyData, CppTheme } from '@/types/aso';
import { securityService } from './security.service';
import { SecurityContext } from '@/types/security';

class CppStrategyService {
  private cache = new Map<string, { data: CppStrategyData; timestamp: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Generate CPP strategy from App Store URL or search term with enterprise security
   */
  async generateCppStrategy(searchTerm: string, config: CppConfig, securityContext: SecurityContext): Promise<CppStrategyData> {
    // Security validation
    const isUrl = searchTerm.startsWith('http');
    let sanitizedSearchTerm = searchTerm;

    if (isUrl) {
        const urlValidation = securityService.validateAppStoreUrl(searchTerm);
        if (!urlValidation.success) {
            throw new Error(`URL validation failed: ${urlValidation.errors?.[0]?.message}`);
        }
        sanitizedSearchTerm = urlValidation.data!;
    } else {
        sanitizedSearchTerm = securityService.sanitizeInput(searchTerm);
    }
    
    // Rate limiting check
    const rateLimitCheck = await securityService.checkRateLimit(config.organizationId, 'cpp-analysis');
    if (!rateLimitCheck.success) {
      throw new Error(`Rate limit exceeded: ${rateLimitCheck.errors?.[0]?.message}`);
    }

    // Organization context validation
    const orgValidation = await securityService.validateOrganizationContext(config.organizationId, securityContext.userId);
    if (!orgValidation.success) {
      throw new Error(`Organization access denied: ${orgValidation.errors?.[0]?.message}`);
    }

    // Audit logging
    const auditResult = await securityService.logAuditEntry({
      organizationId: config.organizationId,
      userId: securityContext.userId,
      action: 'cpp-analysis-started',
      resourceType: 'cpp-analysis',
      details: {
        searchTerm: sanitizedSearchTerm,
        config: {
          includeScreenshotAnalysis: config.includeScreenshotAnalysis,
          generateThemes: config.generateThemes,
          includeCompetitorAnalysis: config.includeCompetitorAnalysis
        }
      },
      ipAddress: securityContext.ipAddress,
      userAgent: securityContext.userAgent
    });

    const cacheKey = `${config.organizationId}-${sanitizedSearchTerm}-cpp`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('📦 [CPP-CACHE] Using cached strategy for:', sanitizedSearchTerm);
      return cached.data;
    }

    console.log('🚀 [CPP-STRATEGY] Starting secure CPP analysis for:', sanitizedSearchTerm);

    try {
      // Call enhanced app-store-scraper with CPP analysis
      const { data: responseData, error: invokeError } = await supabase.functions.invoke('app-store-scraper', {
        body: { 
          searchTerm: sanitizedSearchTerm, 
          organizationId: config.organizationId,
          analyzeCpp: true,
          includeScreenshotAnalysis: config.includeScreenshotAnalysis !== false,
          generateThemes: config.generateThemes !== false,
          includeCompetitorAnalysis: config.includeCompetitorAnalysis,
          securityContext
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
      
      // Cache the result with organization isolation
      this.cache.set(cacheKey, {
        data: cppStrategy,
        timestamp: Date.now()
      });

      // Success audit log
      await securityService.logAuditEntry({
        organizationId: config.organizationId,
        userId: securityContext.userId,
        action: 'cpp-analysis-completed',
        resourceType: 'cpp-analysis',
        details: {
          searchTerm: sanitizedSearchTerm,
          themesGenerated: cppStrategy.suggestedThemes.length,
          screenshotsAnalyzed: cppStrategy.originalApp.screenshots.length
        },
        ipAddress: securityContext.ipAddress,
        userAgent: securityContext.userAgent
      });

      console.log('✅ [CPP-STRATEGY] Analysis complete:', cppStrategy.suggestedThemes.length, 'themes generated');
      return cppStrategy;

    } catch (error) {
      // Error audit log
      await securityService.logAuditEntry({
        organizationId: config.organizationId,
        userId: securityContext.userId,
        action: 'cpp-analysis-failed',
        resourceType: 'cpp-analysis',
        details: {
          searchTerm: sanitizedSearchTerm,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        ipAddress: securityContext.ipAddress,
        userAgent: securityContext.userAgent
      });

      console.error('❌ [CPP-STRATEGY] Generation failed:', error);
      throw error;
    }
  }

  /**
   * Transform enhanced metadata into CPP strategy data with security validation
   */
  private transformToCppStrategy(metadata: ScrapedMetadata): CppStrategyData {
    // Sanitize all text inputs
    const sanitizedName = securityService.sanitizeInput(metadata.name || 'Unknown App');
    
    return {
      originalApp: {
        name: sanitizedName,
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
   * Extract key differentiators from screenshot analysis with input sanitization
   */
  private extractKeyDifferentiators(metadata: ScrapedMetadata): string[] {
    const features = new Set<string>();
    
    metadata.screenshotAnalysis?.forEach(screenshot => {
      screenshot.analysis.features.forEach(feature => {
        const sanitizedFeature = securityService.sanitizeInput(feature);
        if (sanitizedFeature.length > 0) {
          features.add(sanitizedFeature);
        }
      });
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
   * Clear cache with organization isolation
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
