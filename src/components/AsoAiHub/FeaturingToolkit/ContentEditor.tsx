
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/design-system/Typography';
import { FeaturingContent, EDITORIAL_CHAR_LIMIT, HELPFUL_INFO_CHAR_LIMIT, FeaturingValidationResult } from '@/types/featuring';
import { cn } from '@/lib/utils';

interface ContentEditorProps {
  content: FeaturingContent;
  setContent: (content: FeaturingContent) => void;
  validation: FeaturingValidationResult;
}

export const ContentEditor: React.FC<ContentEditorProps> = ({ content, setContent, validation }) => {

  const handleContentChange = (field: keyof FeaturingContent, value: string) => {
    setContent({ ...content, [field]: value });
  };
  
  const getCharCountColor = (count: number, limit: number) => {
    if (count > limit) return 'text-red-400';
    if (count > limit * 0.9) return 'text-yellow-400';
    return 'text-zinc-400';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Editorial Description */}
      <div>
        <Label htmlFor="editorialDescription">Editorial Description</Label>
        <Textarea
          id="editorialDescription"
          value={content.editorialDescription}
          onChange={(e) => handleContentChange('editorialDescription', e.target.value)}
          placeholder="Craft a compelling story about your app..."
          className="min-h-[250px] bg-zinc-900 border-zinc-700 text-white"
        />
        <div className="text-right text-sm mt-2">
          <span className={cn(getCharCountColor(validation.editorial.charCount, EDITORIAL_CHAR_LIMIT))}>
            {validation.editorial.charCount}
          </span>
          <span className="text-zinc-500"> / {EDITORIAL_CHAR_LIMIT} characters</span>
        </div>
      </div>

      {/* Helpful Info for Apple Review */}
      <div>
        <Label htmlFor="helpfulInfo">Helpful Info for Apple Review</Label>
        <Textarea
          id="helpfulInfo"
          value={content.helpfulInfo}
          onChange={(e) => handleContentChange('helpfulInfo', e.target.value)}
          placeholder="Provide context for the reviewer..."
          className="min-h-[250px] bg-zinc-900 border-zinc-700 text-white"
        />
        <div className="text-right text-sm mt-2">
          <span className={cn(getCharCountColor(validation.helpfulInfo.charCount, HELPFUL_INFO_CHAR_LIMIT))}>
            {validation.helpfulInfo.charCount}
          </span>
          <span className="text-zinc-500"> / {HELPFUL_INFO_CHAR_LIMIT} characters</span>
        </div>
      </div>
    </div>
  );
};
