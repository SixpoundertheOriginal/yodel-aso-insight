import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Save, Sparkles, Edit3 } from 'lucide-react';
import { MetadataGenerationForm } from './MetadataGenerationForm';
import { MetadataPreview } from './MetadataPreview';
import { useCopilotChat } from '@/hooks/useCopilotChat';
import { metadataEngine } from '@/engines';
import { competitorAnalysisService, exportService } from '@/services';
import { parseKeywordData } from '@/utils/keywordAnalysis';
import { useToast } from '@/hooks/use-toast';
import { ScrapedMetadata, MetadataField, MetadataScore, CompetitorKeywordAnalysis, KeywordData } from '@/types/aso';
import { supabase } from '@/integrations/supabase/client';
import { ExportManager } from '@/components/shared/ExportManager';
import { Badge } from '@/components/ui/badge';
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

  const [competitorKeywords, setCompetitorKeywords] = useState<CompetitorKeywordAnalysis[]>([]);
  const [cleanDescription, setCleanDescription] = useState(initialData.description);
  
  const [seedKeywords, setSeedKeywords] = useState<string[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);

  const generateSeedKeywords = async () => {
    setIsSeeding(true);
    const competitorInsight = competitorAnalysisService.generateCompetitorInsights(competitorKeywords);
    const prompt = `Based on the following app details, generate a concise, comma-separated list of 15-20 highly relevant seed keywords for App Store Optimization. Focus on terms a user would search for.

App Name: ${initialData.title}
Description Summary: ${cleanDescription?.substring(0, 250)}...
Category: ${initialData.applicationCategory}
Locale: ${initialData.locale}
${competitorInsight}

Do not use formatting, just return a single line of comma-separated keywords. Example: keyword1,keyword2,keyword3`;

    try {
      const aiResponse = await sendMessage(prompt, 'metadata-copilot-seeder');
      if (aiResponse) {
        const keywords = aiResponse.split(',').map(k => k.trim()).filter(Boolean);
        setSeedKeywords(keywords);
         toast({
          title: "Keywords Suggested!",
          description: "AI has generated seed keywords to get you started.",
        });
      }
    } catch (e) {
      toast({ title: "Could not generate seed keywords.", variant: "destructive" });
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    // Set clean description from initial data
    setCleanDescription(initialData.description);
    
    // Only run seed keyword generation if we don't already have keywords and aren't currently seeding
    if (initialData?.appId && !seedKeywords.length && !isSeeding) {
      generateSeedKeywords();
    }
  }, [initialData?.appId, initialData?.description]);

  const parseAIResponse = (response: string, generationType: GenerationType): MetadataField | null => {
    try {
      // For single field generation, return simpler parsing
      if (generationType !== 'complete') {
        const cleanResponse = response.trim();
        const currentMetadata = generatedMetadata || { title: '', subtitle: '', keywords: '' };
        
        return {
          ...currentMetadata,
          [generationType === 'title' ? 'title' : 
           generationType === 'subtitle' ? 'subtitle' : 'keywords']: cleanResponse
        };
      }

      // Complete package parsing (existing logic)
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
          console.warn("Generated metadata has validation issues:", validation.errors);
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

  const handleGenerate = async (formData: {
    keywordData: string;
    targetAudience?: string;
    generationType: GenerationType;
  }) => {
    setIsGenerating(true);

    try {
      const userKeywords = parseKeywordData(formData.keywordData);
      
      const seedKeywordObjects: KeywordData[] = seedKeywords.map(k => ({
        keyword: k,
        relevancy: 50
      }));

      const combinedKeywords = [...userKeywords, ...seedKeywordObjects];
      const uniqueKeywords = Array.from(new Map(combinedKeywords.map(item => [item.keyword, item])).values());
      const enhancedKeywords = metadataEngine.filterAndPrioritizeKeywords(uniqueKeywords);
      const competitorInsight = competitorAnalysisService.generateCompetitorInsights(competitorKeywords);

      let prompt = '';

      if (formData.generationType === 'complete') {
        prompt = `Generate App Store optimized metadata for:

App Name: ${initialData.title}
Current Description Summary: ${cleanDescription?.substring(0, 200)}...
Category: ${initialData.applicationCategory}
Locale: ${initialData.locale}
Target Audience: ${formData.targetAudience || 'General'}
${competitorInsight}
Your Provided & AI-Suggested Keywords (Prioritized):
${enhancedKeywords.slice(0, 20).map(k => `${k.keyword} (Volume: ${k.volume}, Relevancy: ${k.relevancy})`).join('\n')}

STRICT REQUIREMENTS:
- Title: Maximum 30 characters. Should be catchy and include 1-2 primary keywords.
- Subtitle: Maximum 30 characters. Complementary to title, use different keywords.
- Keywords: Maximum 100 characters total. Comma-separated, no spaces. Do not repeat words from title or subtitle.

Format as:
TITLE: [your title]
SUBTITLE: [your subtitle]
KEYWORDS: [keyword1,keyword2,keyword3]`;
      } else {
        const fieldName = formData.generationType;
        const charLimit = fieldName === 'title' || fieldName === 'subtitle' ? '30' : '100';
        const requirements = fieldName === 'keywords' ? 'Comma-separated, no spaces' : 'Catchy and compelling';
        
        prompt = `Generate an optimized ${fieldName} for this App Store listing:

App Name: ${initialData.title}
Category: ${initialData.applicationCategory}
Target Audience: ${formData.targetAudience || 'General'}
Top Keywords: ${enhancedKeywords.slice(0, 10).map(k => k.keyword).join(', ')}

Requirements:
- Maximum ${charLimit} characters
- ${requirements}
- App Store optimized for discoverability

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
            title: `${formData.generationType === 'complete' ? 'Complete Package' : formData.generationType} Generated!`,
            description: "Preview your new metadata below.",
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
          notes: 'Generated by Metadata Co-Pilot.'
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
  
  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          {/* AI Suggested Keywords Section */}
          <div className="mb-6">
             <CardTitle className="text-lg mb-3 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-yodel-orange" />
              <span>AI Suggested Keywords</span>
            </CardTitle>
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

      {generatedMetadata && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">Suggested Metadata</h3>
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
                  score: metadataScore
                }}
                filename={`${initialData.name}-metadata`}
                formats={['json']}
                includeMetadata={true}
                additionalMetadata={{
                  appId: initialData.appId,
                  organizationId
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
