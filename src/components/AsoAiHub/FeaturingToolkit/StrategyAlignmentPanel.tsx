
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, TrendingUp } from 'lucide-react';

interface StrategyAlignment {
  humanCentered: boolean;
  platformInnovation: boolean;
  creativeUtility: boolean;
  educationalImpact: boolean;
  uniqueDifferentiation: boolean;
}

interface StrategyAlignmentPanelProps {
  alignment: StrategyAlignment;
  onAlignmentChange: (alignment: StrategyAlignment) => void;
  content: string;
}

const pillars = [
  {
    key: 'humanCentered' as keyof StrategyAlignment,
    title: 'Human-Centered Storytelling',
    description: 'Focus on user stories, emotional connection, and relatable experiences',
    icon: '👥',
    suggestions: [
      'Share real user success stories',
      'Highlight emotional transformation',
      'Use inclusive, accessible language'
    ]
  },
  {
    key: 'platformInnovation' as keyof StrategyAlignment,
    title: 'Platform Innovation',
    description: 'Leverage unique iOS/Apple ecosystem features and capabilities',
    icon: '🚀',
    suggestions: [
      'Showcase iOS-specific features',
      'Highlight Apple Watch integration',
      'Demonstrate Shortcuts support'
    ]
  },
  {
    key: 'creativeUtility' as keyof StrategyAlignment,
    title: 'Creative Utility',
    description: 'Demonstrate practical value and creative problem-solving',
    icon: '🎨',
    suggestions: [
      'Show before/after examples',
      'Highlight workflow improvements',
      'Demonstrate creative output'
    ]
  },
  {
    key: 'educationalImpact' as keyof StrategyAlignment,
    title: 'Educational Impact',
    description: 'Emphasize learning, growth, and skill development',
    icon: '📚',
    suggestions: [
      'Highlight learning pathways',
      'Show skill progression',
      'Mention educational partnerships'
    ]
  },
  {
    key: 'uniqueDifferentiation' as keyof StrategyAlignment,
    title: 'Unique Differentiation',
    description: 'What makes your app genuinely different from competitors',
    icon: '⭐',
    suggestions: [
      'Patent-pending technology',
      'Exclusive content partnerships',
      'First-to-market innovation'
    ]
  }
];

export const StrategyAlignmentPanel: React.FC<StrategyAlignmentPanelProps> = ({
  alignment,
  onAlignmentChange,
  content
}) => {
  const [showSuggestions, setShowSuggestions] = useState<string | null>(null);

  const handlePillarChange = (pillar: keyof StrategyAlignment, checked: boolean) => {
    onAlignmentChange({
      ...alignment,
      [pillar]: checked
    });
  };

  // Calculate alignment score
  const activeCount = Object.values(alignment).filter(Boolean).length;
  const alignmentScore = (activeCount / 5) * 100;

  // Generate editorial themes based on content
  const editorialThemes = content.toLowerCase().includes('learn') ? ['Learning'] : [];
  if (content.toLowerCase().includes('creat')) editorialThemes.push('Creativity');
  if (content.toLowerCase().includes('innovat')) editorialThemes.push('Innovation');
  if (content.toLowerCase().includes('connect')) editorialThemes.push('Connection');

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-yodel-orange" />
          <span>Strategy Alignment</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alignment Score */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-300">Strategic Alignment Score</span>
            <span className="text-sm font-bold text-yodel-orange">{Math.round(alignmentScore)}%</span>
          </div>
          <Progress value={alignmentScore} className="h-2" />
          <p className="text-xs text-zinc-400">
            {alignmentScore < 60 
              ? 'Consider strengthening alignment with Apple\'s editorial pillars'
              : alignmentScore < 80
              ? 'Good alignment - a few more pillars could boost featuring chances'
              : 'Excellent alignment with Apple\'s editorial preferences'
            }
          </p>
        </div>

        {/* Apple's 5 Editorial Pillars */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-white">Apple's Editorial Pillars</h3>
          {pillars.map((pillar) => (
            <div key={pillar.key} className="space-y-2">
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={alignment[pillar.key]}
                  onCheckedChange={(checked) => handlePillarChange(pillar.key, !!checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{pillar.icon}</span>
                    <h4 className="text-sm font-medium text-white">{pillar.title}</h4>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{pillar.description}</p>
                  
                  {alignment[pillar.key] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSuggestions(
                        showSuggestions === pillar.key ? null : pillar.key
                      )}
                      className="mt-2 p-0 h-auto text-xs text-yodel-orange hover:text-yodel-orange/80"
                    >
                      <Lightbulb className="w-3 h-3 mr-1" />
                      {showSuggestions === pillar.key ? 'Hide' : 'Show'} Suggestions
                    </Button>
                  )}
                  
                  {showSuggestions === pillar.key && (
                    <div className="mt-2 space-y-1">
                      {pillar.suggestions.map((suggestion, index) => (
                        <div key={index} className="text-xs text-zinc-300 bg-zinc-800/50 p-2 rounded">
                          • {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Editorial Themes Tag Cloud */}
        {editorialThemes.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">Editorial Themes Detected</h3>
            <div className="flex flex-wrap gap-1">
              {editorialThemes.map((theme, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                  {theme}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
