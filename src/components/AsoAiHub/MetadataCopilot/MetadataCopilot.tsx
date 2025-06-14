import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Download, RefreshCw, Sparkles } from 'lucide-react';
import { MetadataGenerationForm } from './MetadataGenerationForm';
import { MetadataPreview } from './MetadataPreview';
import { useCopilotChat } from '@/hooks/useCopilotChat';
import { useAsoAiHub } from '@/context/AsoAiHubContext';
import { metadataEngine, MetadataField, MetadataScore } from '@/utils/metadataEngine';
import { parseKeywordData } from '@/utils/keywordAnalysis';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const MetadataCopilot: React.FC = () => {
  const [generatedMetadata, setGeneratedMetadata] = useState<MetadataField>({
    title: '',
    subtitle: '',
    keywords: ''
  });
  const [metadataScore, setMetadataScore] = useState<MetadataScore | null>(null);
  const [appName, setAppName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [importerUrl, setImporterUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  
  const { sendMessage, isLoading } = useCopilotChat();
  const { addMessage } = useAsoAiHub();
  const { toast } = useToast();

  const handleGenerate = async (formData: {
    locale: string;
    category: string;
    appName: string;
    keywordData: string;
    targetAudience?: string;
  }) => {
    setIsGenerating(true);
    setAppName(formData.appName);

    try {
      // Parse keyword data
      const keywords = parseKeywordData(formData.keywordData);
      const enhancedKeywords = metadataEngine.filterAndPrioritizeKeywords(keywords);
      
      // Create context-aware prompt for the AI
      const prompt = `Generate App Store optimized metadata for:

App Name: ${formData.appName}
Category: ${formData.category}
Locale: ${formData.locale}
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

      // Send to AI
      const aiResponse = await sendMessage(prompt, 'metadata-copilot');

      // The useCopilotChat hook now returns the response
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

  const handleImportAndGenerate = async () => {
    if (!importerUrl) {
        toast({ title: "App Store URL is required.", variant: "destructive" });
        return;
    }
    setIsImporting(true);
    try {
        const { data: scrapedData, error } = await supabase.functions.invoke('app-store-scraper', {
            body: { appStoreUrl: importerUrl }
        });

        if (error || !scrapedData) {
            throw new Error(error?.message || "Failed to scrape App Store page.");
        }

        toast({
            title: "App data imported successfully!",
            description: `Now generating metadata for ${scrapedData.name}.`,
        });

        const urlParts = new URL(importerUrl).pathname.split('/');
        const locale = urlParts[1] || 'us';

        // We can now call handleGenerate with the scraped data
        // For now, we will use a placeholder for keywordData
        const formData = {
            appName: scrapedData.name,
            category: scrapedData.applicationCategory,
            locale: locale,
            keywordData: 'social,video,entertainment,music,photo', // Placeholder
        };

        // Switch to generate tab and trigger generation
        // This is an indirect way, a better way would be to lift state
        // for now, we just log it and ask user to fill the form.
        setAppName(formData.appName);
        toast({
            title: "Next Step: Generate Metadata",
            description: `We've imported "${formData.appName}". Please go to the "Generate" tab, fill in your keywords, and click generate.`,
        });


    } catch(e: any) {
        toast({
            title: "Import Failed",
            description: e.message || "Could not retrieve data from the App Store.",
            variant: "destructive"
        });
    } finally {
        setIsImporting(false);
    }
  };

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

        // Validate and score the metadata
        const validation = metadataEngine.validateMetadata(metadata);
        const score = metadataEngine.calculateMetadataScore(metadata, []); // Can't score without keywords here
        setMetadataScore(score);

        if (validation.isValid) {
          return metadata;
        } else {
          console.warn("Generated metadata has validation issues:", validation.errors);
          // Still return it so user can see it
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

  const handleRegenerate = () => {
    if (appName) {
      // Regenerate with slight variation
      const prompt = `Regenerate App Store metadata for "${appName}" with different keyword combinations but same quality standards. Provide alternative variations.`;
      sendMessage(prompt, 'metadata-copilot');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    });
  };

  const exportMetadata = () => {
    const exportData = {
      title: generatedMetadata.title,
      subtitle: generatedMetadata.subtitle,
      keywords: generatedMetadata.keywords,
      appName,
      generatedAt: new Date().toISOString(),
      score: metadataScore
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appName}-metadata.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <span className="text-2xl">📝</span>
            <span>Metadata Co-Pilot</span>
          </CardTitle>
        </CardHeader>
      </Card>
      
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">Import from App Store</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="app-store-url" className="text-zinc-300">App Store URL</Label>
                <Input
                    id="app-store-url"
                    placeholder="https://apps.apple.com/us/app/tiktok/id835599320"
                    value={importerUrl}
                    onChange={(e) => setImporterUrl(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                />
            </div>
            <Button onClick={handleImportAndGenerate} disabled={isImporting || !importerUrl} className="w-full">
                {isImporting ? 'Importing...' : 'Import App Data'}
                <Sparkles className="w-4 h-4 ml-2" />
            </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
          <TabsTrigger value="generate" className="text-zinc-300 data-[state=active]:text-white">
            Generate
          </TabsTrigger>
          <TabsTrigger value="preview" className="text-zinc-300 data-[state=active]:text-white">
            Preview & Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <MetadataGenerationForm 
            onGenerate={handleGenerate}
            isLoading={isGenerating || isLoading}
          />
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {generatedMetadata.title ? (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">Generated Metadata</h3>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* Metadata Fields */}
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Generated Fields</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-zinc-300">Title</label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(generatedMetadata.title, 'Title')}
                            className="h-6 px-2 text-zinc-400 hover:text-white"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="bg-zinc-800/50 rounded p-3 text-white">
                          {generatedMetadata.title}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-zinc-300">Subtitle</label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(generatedMetadata.subtitle, 'Subtitle')}
                            className="h-6 px-2 text-zinc-400 hover:text-white"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="bg-zinc-800/50 rounded p-3 text-white">
                          {generatedMetadata.subtitle}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-zinc-300">Keywords</label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(generatedMetadata.keywords, 'Keywords')}
                            className="h-6 px-2 text-zinc-400 hover:text-white"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="bg-zinc-800/50 rounded p-3 text-white font-mono text-sm break-words">
                          {generatedMetadata.keywords}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <MetadataPreview 
                    metadata={generatedMetadata}
                    score={metadataScore}
                    appName={appName}
                  />
                </div>
              </div>
            </>
          ) : (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="text-4xl mb-4">📝</div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Metadata Generated</h3>
                  <p className="text-zinc-400">
                    Go to the Generate tab to create optimized metadata for your app.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
