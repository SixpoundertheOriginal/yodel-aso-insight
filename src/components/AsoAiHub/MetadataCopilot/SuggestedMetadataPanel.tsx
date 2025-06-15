
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Save } from 'lucide-react';
import { MetadataGenerationForm } from './MetadataGenerationForm';
import { MetadataPreview } from './MetadataPreview';
import { useCopilotChat } from '@/hooks/useCopilotChat';
import { metadataEngine } from '@/engines';
import { competitorAnalysisService, exportService } from '@/services';
import { parseKeywordData } from '@/utils/keywordAnalysis';
import { useToast } from '@/hooks/use-toast';
import { ScrapedMetadata, MetadataField, MetadataScore, CompetitorKeywordAnalysis } from '@/types/aso';
import { supabase } from '@/integrations/supabase/client';
import { ExportManager } from '@/components/shared/ExportManager';

interface SuggestedMetadataPanelProps {
  initialData: ScrapedMetadata;
  organizationId: string;
}

export const SuggestedMetadataPanel: React.FC<SuggestedMetadataPanelProps> = ({ initialData, organizationId }) => {
  const [generatedMetadata, setGeneratedMetadata] = useState<MetadataField | null>(null);
  const [metadataScore, setMetadataScore] = useState<MetadataScore | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { sendMessage, isLoading } = useCopilotChat();
  const { toast } = useToast();

  const [competitorKeywords, setCompetitorKeywords] = useState<CompetitorKeywordAnalysis[]>([]);
  const [cleanDescription, setCleanDescription] = useState(initialData.description);
  
  useEffect(() => {
    // Extract competitor data using the new service
    const { competitors, cleanDescription: cleaned } = competitorAnalysisService.extractCompetitorData(
      initialData.description || ''
    );
    
    if (competitors.length > 0) {
      const analysis = competitorAnalysisService.analyzeCompetitorKeywords(competitors);
      setCompetitorKeywords(analysis);
      console.log(`📊 Analyzed competitor keywords:`, analysis);
    }
    
    setCleanDescription(cleaned);
  }, [initialData]);

  const parseAIResponse = (response: string): MetadataField | null => {
    try {
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
  }) => {
    setIsGenerating(true);

    try {
      const keywords = parseKeywordData(formData.keywordData);
      const enhancedKeywords = metadataEngine.filterAndPrioritizeKeywords(keywords);
      
      const competitorInsight = competitorAnalysisService.generateCompetitorInsights(competitorKeywords);
        
      const prompt = `Generate App Store optimized metadata for:

App Name: ${initialData.title}
Current Description Summary: ${cleanDescription?.substring(0, 200)}...
Category: ${initialData.applicationCategory}
Locale: ${initialData.locale}
Target Audience: ${formData.targetAudience || 'General'}
${competitorInsight}
Your Provided Keywords (Prioritized):
${enhancedKeywords.slice(0, 20).map(k => `${k.keyword} (Volume: ${k.volume}, Relevancy: ${k.relevancy})`).join('\n')}

STRICT REQUIREMENTS:
- Title: Maximum 30 characters. Should be catchy and include 1-2 primary keywords.
- Subtitle: Maximum 30 characters. Complementary to title, use different keywords.
- Keywords: Maximum 100 characters total. Comma-separated, no spaces. Do not repeat words from title or subtitle.

Analyze the competitor keywords and your provided keywords to generate a unique and powerful metadata set that stands out.
Format as:
TITLE: [your title]
SUBTITLE: [your subtitle]
KEYWORDS: [keyword1,keyword2,keyword3]`;

      const aiResponse = await sendMessage(prompt, 'metadata-copilot');

      if (aiResponse) {
        const parsed = parseAIResponse(aiResponse);
        if (parsed) {
          setGeneratedMetadata(parsed);
          const score = metadataEngine.calculateMetadataScore(parsed, enhancedKeywords);
          setMetadataScore(score);
          toast({
            title: "Metadata Generated!",
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
          <MetadataGenerationForm 
            onGenerate={handleGenerate}
            isLoading={isGenerating || isLoading || isSaving}
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
              <Button
                variant="default"
                size="sm"
                onClick={saveMetadata}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={isSaving || isLoading}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { /* handleRegenerate */ }}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                disabled={isLoading || isSaving}
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
