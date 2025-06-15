
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Upload } from 'lucide-react';

interface DataImporterProps {
  title: string;
  description?: string;
  placeholder: string;
  onImport: (input: string) => void;
  isLoading?: boolean;
  acceptFileTypes?: string[];
  icon?: React.ReactNode;
}

export const DataImporter: React.FC<DataImporterProps> = ({
  title,
  description,
  placeholder,
  onImport,
  isLoading = false,
  acceptFileTypes = [],
  icon = <Sparkles className="w-4 h-4" />
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (input.trim()) {
      onImport(input.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white text-lg flex items-center space-x-2">
          {icon}
          <span>{title}</span>
        </CardTitle>
        {description && (
          <p className="text-zinc-400 text-sm">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="data-input" className="text-zinc-300">Input</Label>
          <Input
            id="data-input"
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="bg-zinc-800 border-zinc-700 text-white"
            disabled={isLoading}
          />
        </div>

        {acceptFileTypes.length > 0 && (
          <div className="border-2 border-dashed border-zinc-700 rounded-lg p-4 text-center">
            <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
            <p className="text-zinc-400 text-sm">
              Or drag and drop files here
            </p>
            <p className="text-zinc-500 text-xs mt-1">
              Supported: {acceptFileTypes.join(', ')}
            </p>
          </div>
        )}

        <Button 
          onClick={handleSubmit} 
          disabled={isLoading || !input.trim()} 
          className="w-full"
        >
          {isLoading ? 'Processing...' : 'Import Data'}
          {icon}
        </Button>
      </CardContent>
    </Card>
  );
};
