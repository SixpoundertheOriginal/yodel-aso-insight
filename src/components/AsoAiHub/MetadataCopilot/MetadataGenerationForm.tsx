
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText } from 'lucide-react';
import { GenerationTypeSelector, GenerationType } from './GenerationTypeSelector';

interface MetadataGenerationFormProps {
  onGenerate: (data: {
    keywordData: string;
    targetAudience?: string;
    generationType: GenerationType;
  }) => void;
  isLoading?: boolean;
  appName: string;
  category: string;
  locale: string;
}

const localesList = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'de-DE', label: 'German' },
    { value: 'fr-FR', label: 'French' },
    { value: 'es-ES', label: 'Spanish' },
    { value: 'it-IT', label: 'Italian' },
    { value: 'ja-JP', label: 'Japanese' },
    { value: 'ko-KR', label: 'Korean' }
];

const findLocaleLabel = (value: string) => localesList.find(l => l.value === value)?.label || value;

export const MetadataGenerationForm: React.FC<MetadataGenerationFormProps> = ({
  onGenerate,
  isLoading = false,
  appName,
  category,
  locale
}) => {
  const [formData, setFormData] = useState({
    keywordData: '',
    targetAudience: '',
    generationType: 'complete' as GenerationType
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.keywordData) {
      onGenerate(formData);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFormData(prev => ({ ...prev, keywordData: content }));
      };
      reader.readAsText(file);
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <FileText className="w-5 h-5 text-yodel-orange" />
          <span>AI Metadata Generation</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Generation Type Selector */}
          <GenerationTypeSelector
            value={formData.generationType}
            onChange={(value) => setFormData(prev => ({ ...prev, generationType: value }))}
            disabled={isLoading}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="locale" className="text-zinc-300">Target Locale</Label>
              <Input
                id="locale"
                value={findLocaleLabel(locale)}
                readOnly
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-zinc-300">App Category</Label>
              <Input
                id="category"
                value={category}
                readOnly
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appName" className="text-zinc-300">App Name</Label>
            <Input
              id="appName"
              value={appName}
              readOnly
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAudience" className="text-zinc-300">Target Audience (Optional)</Label>
            <Input
              id="targetAudience"
              value={formData.targetAudience}
              onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
              placeholder="e.g., Parents with children 3-8"
              className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywordData" className="text-zinc-300">Keyword Data</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload CSV/TSV
                </Button>
                <span className="text-sm text-zinc-400">or paste data below</span>
              </div>
              
              <input
                id="file-upload"
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <Textarea
                id="keywordData"
                value={formData.keywordData}
                onChange={(e) => setFormData(prev => ({ ...prev, keywordData: e.target.value }))}
                placeholder="Paste your keyword data here (tab-separated format)..."
                className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400 min-h-32"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-yodel-orange hover:bg-yodel-orange/90 text-white"
            disabled={isLoading || !formData.keywordData}
          >
            {isLoading ? `Generating ${formData.generationType === 'complete' ? 'Complete Package' : formData.generationType}...` : `Generate ${formData.generationType === 'complete' ? 'Complete Package' : formData.generationType}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
