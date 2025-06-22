
import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type GenerationType = 'complete' | 'title' | 'subtitle' | 'keywords';

interface GenerationTypeSelectorProps {
  value: GenerationType;
  onChange: (value: GenerationType) => void;
  disabled?: boolean;
}

export const GenerationTypeSelector: React.FC<GenerationTypeSelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const options = [
    {
      value: 'complete' as GenerationType,
      label: 'Complete Package',
      description: 'Generate optimized title, subtitle, and keywords'
    },
    {
      value: 'title' as GenerationType,
      label: 'Title Only',
      description: 'Focus on title optimization (30 chars max)'
    },
    {
      value: 'subtitle' as GenerationType,
      label: 'Subtitle Only',
      description: 'Generate compelling subtitle (30 chars max)'
    },
    {
      value: 'keywords' as GenerationType,
      label: 'Keywords Only',
      description: 'Optimize keyword string (100 chars max)'
    }
  ];

  return (
    <div className="space-y-3">
      <Label className="text-zinc-300 font-medium">Generation Type</Label>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        className="space-y-3"
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-start space-x-3">
            <RadioGroupItem
              value={option.value}
              id={option.value}
              className="mt-1 border-zinc-600 text-yodel-orange"
              disabled={disabled}
            />
            <div className="flex-1">
              <Label
                htmlFor={option.value}
                className={`text-sm font-medium cursor-pointer ${
                  disabled ? 'text-zinc-500' : 'text-zinc-200'
                }`}
              >
                {option.label}
              </Label>
              <p className={`text-xs mt-1 ${
                disabled ? 'text-zinc-600' : 'text-zinc-400'
              }`}>
                {option.description}
              </p>
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};
