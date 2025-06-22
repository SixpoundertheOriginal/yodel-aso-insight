
import React from 'react';
import { Button } from '@/components/ui/button';
import { Wand2, Edit3 } from 'lucide-react';

export type WorkspaceMode = 'ai-generation' | 'manual-editor';

interface ModeToggleProps {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  disabled?: boolean;
}

export const ModeToggle: React.FC<ModeToggleProps> = ({
  mode,
  onModeChange,
  disabled = false
}) => {
  return (
    <div className="flex items-center space-x-1 bg-zinc-800 rounded-lg p-1">
      <Button
        variant={mode === 'ai-generation' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('ai-generation')}
        disabled={disabled}
        className={`flex items-center space-x-2 ${
          mode === 'ai-generation' 
            ? 'bg-yodel-orange hover:bg-yodel-orange/90 text-white' 
            : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
        }`}
      >
        <Wand2 className="w-4 h-4" />
        <span>AI Generation</span>
      </Button>
      
      <Button
        variant={mode === 'manual-editor' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('manual-editor')}
        disabled={disabled}
        className={`flex items-center space-x-2 ${
          mode === 'manual-editor' 
            ? 'bg-yodel-orange hover:bg-yodel-orange/90 text-white' 
            : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
        }`}
      >
        <Edit3 className="w-4 h-4" />
        <span>Manual Editor</span>
      </Button>
    </div>
  );
};
