
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Star, Download } from 'lucide-react';
import { CharacterCounter } from './CharacterCounter';
import { MetadataField, MetadataScore } from '@/engines/metadata.engine';

interface MetadataPreviewProps {
  metadata: MetadataField;
  score?: MetadataScore;
  appName?: string;
}

export const MetadataPreview: React.FC<MetadataPreviewProps> = React.memo(({
  metadata,
  score,
  appName = 'Your App'
}) => {
  const getScoreColor = React.useCallback((value: number) => {
    if (value >= 80) return 'text-green-400';
    if (value >= 60) return 'text-yellow-400';
    return 'text-red-400';
  }, []);

  const getScoreBadgeColor = React.useCallback((value: number) => {
    if (value >= 80) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (value >= 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  }, []);

  // Memoize character counts to prevent recalculation
  const characterCounts = React.useMemo(() => {
    return {
      title: metadata.title.length,
      subtitle: metadata.subtitle.length,
      keywords: metadata.keywords.length
    };
  }, [metadata.title, metadata.subtitle, metadata.keywords]);

  // Memoize score calculations
  const scoreData = React.useMemo(() => {
    if (!score) return null;
    return {
      overall: Math.round(score.overall),
      title: Math.round(score.title),
      subtitle: Math.round(score.subtitle),
      keywords: Math.round(score.keywords)
    };
  }, [score]);

  return (
    <div className="space-y-6">
      {/* App Store Preview */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-yodel-orange" />
            <span>App Store Preview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
            {/* App Store Search Result Simulation */}
            <div className="flex space-x-3">
              <div className="w-16 h-16 bg-gradient-to-br from-yodel-orange to-orange-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {appName.charAt(0).toUpperCase()}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="space-y-1">
                  <h3 className="text-white font-semibold text-lg leading-tight">
                    {metadata.title || 'App Title'}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-tight">
                    {metadata.subtitle || 'App Subtitle'}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-zinc-500">
                    <span className="flex items-center space-x-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>4.8</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Download className="w-3 h-3" />
                      <span>10K+</span>
                    </span>
                    <span>Free</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <button className="bg-yodel-orange text-white px-6 py-2 rounded-full text-sm font-medium">
                  GET
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Character Limits */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Character Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CharacterCounter
            current={characterCounts.title}
            limit={30}
            label="Title"
          />
          <CharacterCounter
            current={characterCounts.subtitle}
            limit={30}
            label="Subtitle"
          />
          <CharacterCounter
            current={characterCounts.keywords}
            limit={100}
            label="Keywords"
          />
        </CardContent>
      </Card>

      {/* Metadata Score */}
      {scoreData && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Metadata Quality Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-white">Overall Score</span>
                <Badge variant="outline" className={getScoreBadgeColor(scoreData.overall)}>
                  {scoreData.overall}%
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(scoreData.title)}`}>
                    {scoreData.title}%
                  </div>
                  <div className="text-sm text-zinc-400">Title Quality</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(scoreData.subtitle)}`}>
                    {scoreData.subtitle}%
                  </div>
                  <div className="text-sm text-zinc-400">Subtitle Quality</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(scoreData.keywords)}`}>
                    {scoreData.keywords}%
                  </div>
                  <div className="text-sm text-zinc-400">Keyword Quality</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keywords Field Preview */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Keywords Field</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <p className="text-zinc-300 text-sm font-mono break-words">
              {metadata.keywords || 'Keywords will appear here...'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for MetadataPreview
  const metadataEqual = (
    prevProps.metadata.title === nextProps.metadata.title &&
    prevProps.metadata.subtitle === nextProps.metadata.subtitle &&
    prevProps.metadata.keywords === nextProps.metadata.keywords
  );
  
  const scoreEqual = (!prevProps.score && !nextProps.score) || (
    prevProps.score?.overall === nextProps.score?.overall &&
    prevProps.score?.title === nextProps.score?.title &&
    prevProps.score?.subtitle === nextProps.score?.subtitle &&
    prevProps.score?.keywords === nextProps.score?.keywords
  );
  
  return metadataEqual && scoreEqual && prevProps.appName === nextProps.appName;
});

