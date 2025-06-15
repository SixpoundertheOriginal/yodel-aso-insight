
export interface AnalysisInput {
  targetApp: any;
  competitors: any[];
  analysisType: 'basic' | 'competitive-intelligence' | 'deep-analysis';
}

export interface AnalysisResult {
  success: boolean;
  data?: {
    competitorAnalysis: any[];
    marketPosition: string;
    screenshotsProcessed: number;
  };
  error?: string;
}

export class ScreenshotAnalysisService {
  private openAIApiKey: string;

  constructor() {
    this.openAIApiKey = Deno.env.get('OPENAI_API_KEY') || '';
  }

  async analyze(input: AnalysisInput): Promise<AnalysisResult> {
    if (!this.openAIApiKey) {
      return {
        success: false,
        error: 'AI analysis unavailable: OpenAI API key not configured'
      };
    }

    try {
      const competitorAnalysis = await this.analyzeCompetitorScreenshots(
        input.competitors,
        input.analysisType
      );

      const marketPosition = this.determineMarketPosition(competitorAnalysis);

      return {
        success: true,
        data: {
          competitorAnalysis,
          marketPosition,
          screenshotsProcessed: competitorAnalysis.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Screenshot analysis failed: ${error.message}`
      };
    }
  }

  private async analyzeCompetitorScreenshots(competitors: any[], analysisType: string): Promise<any[]> {
    const analysisPromises: Promise<any>[] = [];
    
    // Analyze first 3 screenshots for each of the top 3 competitors
    for (const competitor of competitors.slice(0, 3)) {
      const screenshots = competitor.screenshotUrls || [];
      
      for (const screenshotUrl of screenshots.slice(0, 3)) {
        analysisPromises.push(
          this.analyzeScreenshotWithAI(screenshotUrl, competitor.trackName, analysisType)
        );
      }
    }

    // Process in batches to respect rate limits
    const batchSize = 5;
    const results: any[] = [];
    
    for (let i = 0; i < analysisPromises.length; i += batchSize) {
      const batch = analysisPromises.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      }
      
      // Rate limiting: wait between batches
      if (i + batchSize < analysisPromises.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  private async analyzeScreenshotWithAI(screenshotUrl: string, appName: string, analysisType: string): Promise<any> {
    try {
      const prompt = this.getAnalysisPrompt(analysisType);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: screenshotUrl } }
              ]
            }
          ],
          max_tokens: 300,
          temperature: 0.3
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`OpenAI API Error: ${errorBody}`);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const analysis = data.choices[0].message.content;

      return {
        appName,
        url: screenshotUrl,
        analysis,
        analysisType,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error analyzing screenshot for ${appName}:`, error);
      return {
        appName,
        url: screenshotUrl,
        analysis: `Analysis failed: ${error.message}`,
        analysisType,
        timestamp: new Date().toISOString()
      };
    }
  }

  private getAnalysisPrompt(analysisType: string): string {
    switch (analysisType) {
      case 'competitive-intelligence':
        return `Analyze this app screenshot for competitive intelligence. Focus on:
1. Key features and functionality visible
2. User interface design patterns and visual hierarchy
3. Value propositions being communicated
4. Target audience indicators
5. Unique selling points or differentiators
6. User experience flow suggestions
Provide insights in a structured, actionable format.`;
      
      case 'deep-analysis':
        return `Perform a deep analysis of this app screenshot including:
1. Detailed feature breakdown and functionality mapping
2. UI/UX design patterns and accessibility considerations
3. Content strategy and messaging analysis
4. Technical implementation indicators
5. Conversion optimization opportunities
6. Competitive positioning insights
Provide comprehensive, strategic insights.`;
      
      default:
        return `Analyze this app screenshot for its key features, user flow, primary value proposition, and overall visual theme. Provide a concise summary focused on competitive positioning and user experience insights.`;
    }
  }

  private determineMarketPosition(analyses: any[]): string {
    if (analyses.length === 0) return 'unknown';
    
    // Simple market positioning based on analysis patterns
    const patterns = analyses.map(a => a.analysis.toLowerCase());
    const commonThemes = this.extractCommonThemes(patterns);
    
    if (commonThemes.includes('premium') || commonThemes.includes('professional')) {
      return 'premium';
    } else if (commonThemes.includes('simple') || commonThemes.includes('minimalist')) {
      return 'minimalist';
    } else if (commonThemes.includes('feature-rich') || commonThemes.includes('comprehensive')) {
      return 'feature-rich';
    } else {
      return 'mainstream';
    }
  }

  private extractCommonThemes(analyses: string[]): string[] {
    const keywords = ['premium', 'professional', 'simple', 'minimalist', 'feature-rich', 'comprehensive', 'intuitive', 'modern'];
    return keywords.filter(keyword => 
      analyses.some(analysis => analysis.includes(keyword))
    );
  }
}
