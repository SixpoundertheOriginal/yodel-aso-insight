import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';
import { MetadataGenerationForm } from './MetadataGenerationForm';
import { MetadataPreview } from './MetadataPreview';
import { useCopilotChat } from '@/hooks/useCopilotChat';
import { metadataEngine, MetadataField, MetadataScore } from '@/utils/metadataEngine';
import { parseKeywordData } from '@/utils/keywordAnalysis';
import { useToast } from '@/hooks/use-toast';
import { ScrapedMetadata } from './MetadataWorkspace';

interface SuggestedMetadataPanelProps {
  initialData: ScrapedMetadata;
}

export const SuggestedMetadataPanel: React.FC<SuggestedMetadataPanelProps> = ({ initialData }) => {
  const [generatedMetadata, setGeneratedMetadata] = useState<MetadataField | null>(null);
  const [metadataScore, setMetadataScore] = useState<MetadataScore | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { sendMessage, isLoading } = useCopilotChat();
  const { toast } = useToast();
  
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
        if (validation.isValid) {
          return metadata;
        } else {
          console.warn("Generated metadata has validation issues:", validation.errors);
          return metadata;
        }
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
      
      const prompt = `Generate App Store optimized metadata for:

App Name: ${initialData.title}
Category: ${initialData.applicationCategory}
Locale: ${initialData.locale}
Target Audience: ${formData.targetAudience || 'General'}

STRICT REQUIREMENTS:
- Title: Maximum 30 characters, include 1-2 primary keywords
- Subtitle: Maximum 30 characters, complementary keywords, no overlap with title
- Keywords: Maximum 100 characters, comma-separated, no spaces, no repetition from title/subtitle

Top Keywords Available:
${enhancedKeywords.slice(0, 20).map(k => `${k.keyword} (Volume: ${k.volume}, Relevancy: ${k.relevancy})`).join('\n')}

Generate natural, readable metadata that maximizes keyword coverage while staying within character limits. Format as:
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

  const exportMetadata = () => {
    if (!generatedMetadata) return;
    const exportData = {
      ...generatedMetadata,
      appName: initialData.name,
      generatedAt: new Date().toISOString(),
      score: metadataScore
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${initialData.name}-metadata.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
            <MetadataGenerationForm 
              onGenerate={(data) => handleGenerate({ keywordData: data.keywordData, targetAudience: data.targetAudience })}
              isLoading={isGenerating || isLoading}
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
                variant="outline"
                size="sm"
                onClick={() => { /* handleRegenerate */ }}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                disabled={isLoading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportMetadata}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
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
