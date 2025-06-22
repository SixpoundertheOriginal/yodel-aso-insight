import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Save, Sparkles, Edit3, Users } from 'lucide-react';
import { MetadataGenerationForm } from './MetadataGenerationForm';
import { MetadataPreview } from './MetadataPreview';
import { CompetitiveInsightsPanel } from './CompetitiveInsightsPanel';
import { KeywordGapAnalyzer } from './KeywordGapAnalyzer';
import { MarketPositionWidget } from './MarketPositionWidget';
import { useCopilotChat } from '@/hooks/useCopilotChat';
import { metadataEngine } from '@/engines';
import { competitorAnalysisService, competitiveIntelligenceService, exportService } from '@/services';
import { parseKeywordData } from '@/utils/keywordAnalysis';
import { useToast } from '@/hooks/use-toast';
import { ScrapedMetadata, MetadataField, MetadataScore, CompetitorKeywordAnalysis, KeywordData } from '@/types/aso';
import { supabase } from '@/integrations/supabase/client';
import { ExportManager } from '@/components/shared/ExportManager';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GenerationType } from './GenerationTypeSelector';

interface SuggestedMetadataPanelProps {
  initialData: ScrapedMetadata;
  organizationId: string;
  onEditResults?: () => void;
  onGenerationSuccess?: (metadata: MetadataField) => void;
}

export const SuggestedMetadataPanel: React.FC<SuggestedMetadataPanelProps> = ({ 
  initialData, 
  organizationId, 
  onEditResults,
  onGenerationSuccess 
}) => {
  const [generatedMetadata, setGeneratedMetadata] = useState<MetadataField | null>(null);
  const [metadataScore, setMetadataScore] = useState<MetadataScore | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { sendMessage, isLoading: isChatLoading } = useCopilotChat();
  const { toast } = useToast();

  // Enhanced competitive intelligence state
  const [competitorKeywords, setCompetitorKeywords] = useState<CompetitorKeywordAnalysis[]>([]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [cleanDescription, setCleanDescription] = useState(initialData.description);
  const [activeTab, setActiveTab] = useState('generation');
  
  const [seedKeywords, setSeedKeywords] = useState<string[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);

  // Enhanced competitive intelligence initialization
  useEffect(() => {
    // Extract competitors from initial data
    const extractedCompetitors = (initialData as any).competitors || [];
    setCompetitors(extractedCompetitors);
    
    if (extractedCompetitors.length > 0) {
      const analysis = competitorAnalysisService.analyzeCompetitorKeywords(extractedCompetitors);
      setCompetitorKeywords(analysis);
      console.log('🎯 [SUGGESTED-METADATA] Competitive analysis loaded:', {
        competitors: extractedCompetitors.length,
        keywords: analysis.length
      });
    }

    setCleanDescription(initialData.description);
    
    // Generate enhanced seed keywords with competitive context
    if (initialData?.appId && !seedKeywords.length && !isSeeding) {
      generateEnhancedSeedKeywords();
    }
  }, [initialData]);

  // Enhanced seed keyword generation with competitive intelligence
  const generateEnhancedSeedKeywords = async () => {
    setIsSeeding(true);
    
    // Create competitive context
    const competitiveContext = competitiveIntelligenceService.generateCompetitiveContext(
      competitors,
      [],
      initialData
    );
    
    const competitivePromptContext = competitiveIntelligenceService.createCompetitivePromptContext(
      competitiveContext
    );

    const prompt = `Based on the following app details and competitive intelligence, generate a concise, comma-separated list of 15-20 highly relevant seed keywords for App Store Optimization. Focus on terms a user would search for, considering competitive opportunities.

App Name: ${initialData.title}
Description Summary: ${cleanDescription?.substring(0, 250)}...
Category: ${initialData.applicationCategory}
Locale: ${initialData.locale}

${competitivePromptContext}

FOCUS ON: Keywords with competitive opportunities, differentiation potential, and moderate competition levels. Avoid oversaturated terms.

Do not use formatting, just return a single line of comma-separated keywords. Example: keyword1,keyword2,keyword3`;

    try {
      const aiResponse = await sendMessage(prompt, 'metadata-copilot-seeder');
      if (aiResponse) {
        const keywords = aiResponse.split(',').map(k => k.trim()).filter(Boolean);
        setSeedKeywords(keywords);
        toast({
          title: "Enhanced Keywords Suggested!",
          description: `AI has generated ${keywords.length} competitive-aware seed keywords.`,
        });
      }
    } catch (e) {
      toast({ title: "Could not generate seed keywords.", variant: "destructive" });
    } finally {
      setIsSeeding(false);
    }
  };

  // ... keep existing parseAIResponse method
  const parseAIResponse = (response: string, generationType: GenerationType): MetadataField | null => {
    try {
      if (generationType !== 'complete') {
        const cleanResponse = response.trim();
        const currentMetadata = generatedMetadata || { title: '', subtitle: '', keywords: '' };
        
        return {
          ...currentMetadata,
          [generationType === 'title' ? 'title' : 
           generationType === 'subtitle' ? 'subtitle' : 'keywords']: cleanResponse
        };
      }

      const titleMatch = response.match(/TITLE:\s*(.+)/);
      const subtitleMatch = response.match(/SUBTITLE:\s*(.+)/);
      const keywordsMatch = response.match(/KEYWORDS:\s*(.+)/);

      if (titleMatch && subtitleMatch && keywordsMatch) {
        const metadata = {
          title: titleMatch[1].trim(),
          subtitle: subtitleMatch[1].trim(),
          keywords: keywordsMatch[1].trim()
        };

        const validation = metadataEngine.validateMetadata(metadata);
        if (!validation.isValid) {
          console.warn("Generated metadata has validation issues:", validation.issues);
        }
        
        return metadata;
      }
      
      toast({
        title: "Parsing Error",
        description: "Could not parse the response from the AI. Please try regenerating.",
        variant: "destructive"
      });
      return null;
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return null;
    }
  };

  // Enhanced metadata generation with competitive intelligence
  const handleGenerate = async (formData: {
    keywordData: string;
    targetAudience?: string;
    generationType: GenerationType;
  }) => {
    setIsGenerating(true);

    try {
      const userKeywords = parseKeywordData(formData.keywordData);
      
      // Combine user keywords with selected competitive keywords
      const allSelectedKeywords = [...selectedKeywords, ...seedKeywords];
      const seedKeywordObjects: KeywordData[] = allSelectedKeywords.map(k => ({
        keyword: k,
        relevancy: 50
      }));

      const combinedKeywords = [...userKeywords, ...seedKeywordObjects];
      const uniqueKeywords = Array.from(new Map(combinedKeywords.map(item => [item.keyword, item])).values());
      const enhancedKeywords = metadataEngine.filterAndPrioritizeKeywords(uniqueKeywords);
      
      // Create enhanced competitive context
      const competitiveContext = competitiveIntelligenceService.generateCompetitiveContext(
        competitors,
        enhancedKeywords.map(k => k.keyword),
        initialData
      );
      
      const competitivePromptContext = competitiveIntelligenceService.createCompetitivePromptContext(
        competitiveContext,
        formData.targetAudience
      );

      let prompt = '';

      if (formData.generationType === 'complete') {
        prompt = `Generate App Store optimized metadata with competitive intelligence for:

App Name: ${initialData.title}
Current Description Summary: ${cleanDescription?.substring(0, 200)}...
Category: ${initialData.applicationCategory}
Locale: ${initialData.locale}
Target Audience: ${formData.targetAudience || 'General'}

${competitivePromptContext}

Your Provided & AI-Suggested Keywords (Prioritized):
${enhancedKeywords.slice(0, 20).map(k => `${k.keyword} (Volume: ${k.volume}, Relevancy: ${k.relevancy})`).join('\n')}

STRICT REQUIREMENTS:
- Title: Maximum 30 characters. Should be catchy and include 1-2 primary keywords that differentiate from competitors.
- Subtitle: Maximum 30 characters. Complementary to title, use different keywords that address competitive gaps.
- Keywords: Maximum 100 characters total. Comma-separated, no spaces. Prioritize opportunity keywords over oversaturated ones.

STRATEGIC FOCUS: Use competitive intelligence to create differentiated positioning while targeting underserved keyword opportunities.

Format as:
TITLE: [your title]
SUBTITLE: [your subtitle]
KEYWORDS: [keyword1,keyword2,keyword3]`;
      } else {
        const fieldName = formData.generationType;
        const charLimit = fieldName === 'title' || fieldName === 'subtitle' ? '30' : '100';
        const requirements = fieldName === 'keywords' ? 'Comma-separated, no spaces, focus on opportunity keywords' : 'Catchy, competitive differentiation';
        
        prompt = `Generate an optimized ${fieldName} for this App Store listing with competitive awareness:

App Name: ${initialData.title}
Category: ${initialData.applicationCategory}
Target Audience: ${formData.targetAudience || 'General'}

${competitivePromptContext}

Top Keywords: ${enhancedKeywords.slice(0, 10).map(k => k.keyword).join(', ')}

Requirements:
- Maximum ${charLimit} characters
- ${requirements}
- App Store optimized for discoverability and competitive differentiation

Respond with ONLY the ${fieldName}, no formatting or labels.`;
      }

      const aiResponse = await sendMessage(prompt, 'metadata-copilot');

      if (aiResponse) {
        const parsed = parseAIResponse(aiResponse, formData.generationType);
        if (parsed) {
          setGeneratedMetadata(parsed);
          const score = metadataEngine.calculateMetadataScore(parsed, enhancedKeywords);
          setMetadataScore(score);
          
          if (onGenerationSuccess) {
            onGenerationSuccess(parsed);
          }
          
          toast({
            title: `${formData.generationType === 'complete' ? 'Competitive Package' : formData.generationType} Generated!`,
            description: competitors.length > 0 
              ? `Preview your new competitive-aware metadata below.`
              : "Preview your new metadata below.",
          });
        } else {
          throw new Error("Failed to parse AI response.");
        }
      } else {
        throw new Error("No response from AI.");
      }

    } catch (error) {
      console.error('Error generating metadata:', error);
      toast({
        title: "Generation Error",
        description: "Failed to generate metadata. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // ... keep existing saveMetadata method
  const saveMetadata = async () => {
    if (!generatedMetadata) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('metadata_versions')
        .insert({
          app_store_id: initialData.appId,
          organization_id: organizationId,
          created_by: user?.id || null,
          title: generatedMetadata.title,
          subtitle: generatedMetadata.subtitle,
          keywords: generatedMetadata.keywords,
          score: metadataScore as any,
          notes: competitors.length > 0 
            ? `Generated by Metadata Co-Pilot with competitive intelligence (${competitors.length} competitors analyzed).`
            : 'Generated by Metadata Co-Pilot.'
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Metadata Saved!",
        description: "Your new metadata version has been saved to your project.",
      });

    } catch (error: any) {
      console.error('Error saving metadata:', error);
      toast({
        title: "Save Error",
        description: error.message || "Failed to save metadata. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Enhanced keyword selection handler
  const handleKeywordSelect = (keyword: string) => {
    if (!selectedKeywords.includes(keyword)) {
      setSelectedKeywords(prev => [...prev, keyword]);
      toast({
        title: "Keyword Added",
        description: `"${keyword}" added to your keyword list.`,
      });
    }
  };

  const handleKeywordRemove = (keyword: string) => {
    setSelectedKeywords(prev => prev.filter(k => k !== keyword));
    setSeedKeywords(prev => prev.filter(k => k !== keyword));
  };
  
  return (
    <div className="space-y-6">
      {/* Enhanced Competitive Intelligence Integration */}
      {competitors.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-zinc-800">
            <TabsTrigger value="generation">
              <Sparkles className="w-4 h-4 mr-2" />
              Generation
            </TabsTrigger>
            <TabsTrigger value="intelligence">
              <Users className="w-4 h-4 mr-2" />
              Intelligence ({competitors.length})
            </TabsTrigger>
            <TabsTrigger value="gaps">
              Gap Analysis
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="intelligence" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CompetitiveInsightsPanel
                competitors={competitors}
                targetKeywords={[...seedKeywords, ...selectedKeywords]}
                onKeywordSelect={handleKeywordSelect}
                isLoading={false}
              />
              <MarketPositionWidget
                competitors={competitors}
                currentApp={{
                  name: initialData.name,
                  category: initialData.applicationCategory,
                  rating: initialData.rating
                }}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="gaps" className="space-y-4">
            <KeywordGapAnalyzer
              competitorAnalysis={competitorKeywords}
              userKeywords={[...seedKeywords, ...selectedKeywords]}
              onKeywordAdd={handleKeywordSelect}
              onKeywordRemove={handleKeywordRemove}
            />
          </TabsContent>
          
          <TabsContent value="generation">
            {/* Original generation interface with competitive enhancements */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-6">
                {/* Enhanced AI Suggested Keywords Section */}
                <div className="mb-6">
                  <CardTitle className="text-lg mb-3 flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-yodel-orange" />
                    <span>
                      {competitors.length > 0 ? 'Competitive-Aware Keywords' : 'AI Suggested Keywords'}
                    </span>
                    {competitors.length > 0 && (
                      <Badge variant="outline" className="ml-2 border-blue-600 text-blue-400">
                        {competitors.length} competitors analyzed
                      </Badge>
                    )}
                  </CardTitle>
                  {isSeeding ? (
                    <div className="text-zinc-400">
                      {competitors.length > 0 
                        ? 'Generating competitive-aware keyword ideas...' 
                        : 'Generating keyword ideas...'
                      }
                    </div>
                  ) : seedKeywords.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {seedKeywords.map((keyword) => (
                          <Badge 
                            key={keyword} 
                            variant="outline" 
                            className="bg-zinc-800 border-zinc-700 text-zinc-300 cursor-pointer hover:bg-zinc-700"
                            onClick={() => handleKeywordSelect(keyword)}
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                      {selectedKeywords.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-zinc-300">Selected Keywords:</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedKeywords.map((keyword) => (
                              <Badge 
                                key={keyword} 
                                className="bg-green-600 text-white cursor-pointer hover:bg-green-700"
                                onClick={() => handleKeywordRemove(keyword)}
                              >
                                {keyword} ×
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-zinc-500">Could not generate keywords. Please add your own below.</div>
                  )}
                  <p className="text-xs text-zinc-500 mt-2">
                    {competitors.length > 0 
                      ? 'These suggestions consider competitive gaps and opportunities from your market analysis.'
                      : 'Use these suggestions to inspire the keyword research you enter below.'
                    }
                  </p>
                </div>
              
                <MetadataGenerationForm 
                  onGenerate={handleGenerate}
                  isLoading={isGenerating || isChatLoading || isSaving || isSeeding}
                  appName={initialData.name}
                  category={initialData.applicationCategory}
                  locale={initialData.locale}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Fallback for no competitive data */}
      {competitors.length === 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            {/* Original interface for non-competitive mode */}
            <div className="mb-6">
              <CardTitle className="text-lg mb-3 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-yodel-orange" />
                <span>AI Suggested Keywords</span>
              </CardTitle>
              {/* ... keep existing seed keywords logic */}
              {isSeeding ? (
                <div className="text-zinc-400">Generating keyword ideas...</div>
              ) : seedKeywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {seedKeywords.map((keyword) => (
                    <Badge key={keyword} variant="outline" className="bg-zinc-800 border-zinc-700 text-zinc-300">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-zinc-500">Could not generate keywords. Please add your own below.</div>
              )}
              <p className="text-xs text-zinc-500 mt-2">
                Use these suggestions to inspire the keyword research you enter below.
              </p>
            </div>
          
            <MetadataGenerationForm 
              onGenerate={handleGenerate}
              isLoading={isGenerating || isChatLoading || isSaving || isSeeding}
              appName={initialData.name}
              category={initialData.applicationCategory}
              locale={initialData.locale}
            />
          </CardContent>
        </Card>
      )}

      {/* Generated Metadata Results */}
      {generatedMetadata && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">
              {competitors.length > 0 ? 'Competitive-Aware Metadata' : 'Suggested Metadata'}
            </h3>
            <div className="flex space-x-2">
              {onEditResults && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEditResults}
                  className="border-yodel-orange text-yodel-orange hover:bg-yodel-orange/10"
                  disabled={isGenerating || isChatLoading || isSaving}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Results
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={saveMetadata}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={isSaving || isGenerating || isChatLoading}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { /* handleRegenerate */ }}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                disabled={isGenerating || isChatLoading || isSaving}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
              <ExportManager
                data={{
                  ...generatedMetadata,
                  appName: initialData.name,
                  score: metadataScore,
                  competitiveIntelligence: competitors.length > 0 ? {
                    competitorsAnalyzed: competitors.length,
                    keywordGaps: competitorKeywords.slice(0, 10).map(k => k.keyword),
                    opportunities: competitorKeywords.filter(k => k.percentage >= 40 && k.percentage <= 70).slice(0, 5).map(k => k.keyword)
                  } : undefined
                }}
                filename={`${initialData.name}-metadata${competitors.length > 0 ? '-competitive' : ''}`}
                formats={['json']}
                includeMetadata={true}
                additionalMetadata={{
                  appId: initialData.appId,
                  organizationId,
                  competitiveAnalysis: competitors.length > 0
                }}
              />
            </div>
          </div>
          <MetadataPreview 
            metadata={generatedMetadata}
            score={metadataScore}
            appName={initialData.name}
          />
        </div>
      )}
    </div>
  );
};
