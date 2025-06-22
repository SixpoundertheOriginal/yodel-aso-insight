
import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Lightbulb, ChevronDown, Wand2 } from 'lucide-react';
import { APPLE_ALIGNED_PHRASES } from '@/types/featuring';

interface SmartEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
  label: string;
  mode: 'raw' | 'apple' | 'brand';
  onModeChange: (mode: 'raw' | 'apple' | 'brand') => void;
}

const hooks = [
  "Discover the #1 app that's changing how people...",
  "Join millions who have transformed their...",
  "The breakthrough app that Apple editors love...",
  "From the creators of [previous success]..."
];

const closers = [
  "Download now and see why Apple featured us.",
  "Experience the difference that made us Apple's choice.",
  "Join the revolution. Download today.",
  "Ready to transform your [category]? Start now."
];

const differentiators = [
  "First-ever real-time collaboration",
  "Exclusive partnership with industry leaders",
  "Patent-pending technology",
  "Award-winning design team"
];

export const SmartEditor: React.FC<SmartEditorProps> = ({
  value,
  onChange,
  placeholder,
  maxLength,
  label,
  mode,
  onModeChange
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedPhrases, setHighlightedPhrases] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Find Apple-aligned phrases in the text
    const found = APPLE_ALIGNED_PHRASES.filter(phrase => 
      value.toLowerCase().includes(phrase.toLowerCase())
    );
    setHighlightedPhrases(found);
  }, [value]);

  const insertSuggestion = (suggestion: string) => {
    const currentValue = value;
    const newValue = currentValue + (currentValue ? ' ' : '') + suggestion;
    onChange(newValue);
    setShowSuggestions(false);
  };

  const applyMode = (newMode: 'raw' | 'apple' | 'brand') => {
    onModeChange(newMode);
    // Mode-specific transformations would happen here
    if (newMode === 'apple') {
      // Apply Apple's editorial tone
      console.log('Applying Apple tone transformation...');
    } else if (newMode === 'brand') {
      // Apply brand voice
      console.log('Applying brand voice transformation...');
    }
  };

  const remainingChars = maxLength - value.length;
  const isOverLimit = remainingChars < 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white">{label}</label>
        <div className="flex items-center space-x-2">
          {/* Mode Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center space-x-1">
                <Wand2 className="w-3 h-3" />
                <span className="capitalize">{mode}</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
              <DropdownMenuItem onClick={() => applyMode('raw')} className="text-zinc-300">
                Raw Text
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyMode('apple')} className="text-zinc-300">
                Apple Copy Tone
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyMode('brand')} className="text-zinc-300">
                Brand Voice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Character Counter */}
          <span className={`text-xs ${isOverLimit ? 'text-red-400' : 'text-zinc-400'}`}>
            {remainingChars} chars remaining
          </span>
        </div>
      </div>

      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`min-h-[120px] bg-zinc-800 border-zinc-700 text-white resize-none ${
            isOverLimit ? 'border-red-500' : ''
          }`}
          maxLength={maxLength + 100} // Allow slight overage for UX
        />
        
        {/* Live Suggestions Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="absolute top-2 right-2 text-zinc-400 hover:text-white"
        >
          <Lightbulb className="w-4 h-4" />
        </Button>
      </div>

      {/* Apple-Aligned Phrases Highlight */}
      {highlightedPhrases.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-zinc-400">Apple-aligned phrases:</span>
          {highlightedPhrases.map((phrase, index) => (
            <Badge key={index} variant="outline" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
              {phrase}
            </Badge>
          ))}
        </div>
      )}

      {/* Live Suggestions Dropdown */}
      {showSuggestions && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-4 space-y-3">
            <div>
              <h4 className="text-sm font-medium text-white mb-2">Hook Templates</h4>
              <div className="space-y-1">
                {hooks.map((hook, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onClick={() => insertSuggestion(hook)}
                    className="w-full text-left justify-start text-xs text-zinc-300 hover:text-white"
                  >
                    {hook}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white mb-2">Closer Templates</h4>
              <div className="space-y-1">
                {closers.map((closer, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onClick={() => insertSuggestion(closer)}
                    className="w-full text-left justify-start text-xs text-zinc-300 hover:text-white"
                  >
                    {closer}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white mb-2">Differentiator Templates</h4>
              <div className="space-y-1">
                {differentiators.map((diff, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onClick={() => insertSuggestion(diff)}
                    className="w-full text-left justify-start text-xs text-zinc-300 hover:text-white"
                  >
                    {diff}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
