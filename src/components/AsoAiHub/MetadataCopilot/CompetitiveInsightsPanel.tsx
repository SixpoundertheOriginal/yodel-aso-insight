
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Users, Target, AlertCircle } from 'lucide-react';
import { CompetitorData, CompetitorKeywordAnalysis } from '@/types/aso';
import { competitorAnalysisService } from '@/services';

interface CompetitiveInsightsPanelProps {
  competitors: CompetitorData[];
  targetKeywords: string[];
  onKeywordSelect?: (keyword: string) => void;
  isLoading?: boolean;
}

export const CompetitiveInsightsPanel: React.FC<CompetitiveInsightsPanelProps> = ({
  competitors,
  targetKeywords,
  onKeywordSelect,
  isLoading = false
}) => {
  const [keywordAnalysis, setKeywordAnalysis] = useState<CompetitorKeywordAnalysis[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<{
    gaps: string[];
    opportunities: string[];
    oversaturated: string[];
  }>({ gaps: [], opportunities: [], oversaturated: [] });

  useEffect(() => {
    if (competitors.length > 0) {
      const analysis = competitorAnalysisService.analyzeCompetitorKeywords(competitors);
      setKeywordAnalysis(analysis);
      
      // Generate gap analysis
      const competitorKeywords = analysis.map(item => item.keyword);
      const gaps = competitorKeywords.filter(keyword => 
        !targetKeywords.some(target => target.toLowerCase().includes(keyword.toLowerCase()))
      );
      
      const opportunities = analysis
        .filter(item => item.percentage >= 60 && item.percentage <= 80)
        .map(item => item.keyword);
      
      const oversaturated = analysis
        .filter(item => item.percentage > 80)
        .map(item => item.keyword);

      setGapAnalysis({ gaps: gaps.slice(0, 10), opportunities, oversaturated });
    }
  }, [competitors, targetKeywords]);

  if (isLoading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-500" />
            Analyzing Competition...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={66} className="w-full" />
            <p className="text-zinc-400 text-sm">Discovering competitive intelligence...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (competitors.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-zinc-500" />
            No Competitive Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-400 text-sm">
            Enable competitor discovery during import to unlock competitive intelligence features.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Market Overview */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-500" />
            Market Landscape ({competitors.length} competitors)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{keywordAnalysis.length}</div>
              <div className="text-xs text-zinc-400">Unique Keywords</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{gapAnalysis.opportunities.length}</div>
              <div className="text-xs text-zinc-400">Opportunities</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keyword Gaps */}
      {gapAnalysis.gaps.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2 text-green-500" />
              Keyword Gaps ({gapAnalysis.gaps.length})
            </CardTitle>
            <p className="text-sm text-zinc-400">Keywords your competitors use but you don't</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {gapAnalysis.gaps.slice(0, 8).map((keyword) => (
                <Button
                  key={keyword}
                  variant="outline"
                  size="sm"
                  onClick={() => onKeywordSelect?.(keyword)}
                  className="border-green-700 text-green-300 hover:bg-green-700/20"
                >
                  {keyword}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opportunities */}
      {gapAnalysis.opportunities.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-orange-500" />
              High-Opportunity Keywords
            </CardTitle>
            <p className="text-sm text-zinc-400">Moderately competitive with good potential</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {gapAnalysis.opportunities.slice(0, 6).map((keyword) => (
                <Button
                  key={keyword}
                  variant="outline"
                  size="sm"
                  onClick={() => onKeywordSelect?.(keyword)}
                  className="border-orange-700 text-orange-300 hover:bg-orange-700/20"
                >
                  {keyword}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Oversaturated Warning */}
      {gapAnalysis.oversaturated.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
              Oversaturated Terms
            </CardTitle>
            <p className="text-sm text-zinc-400">Highly competitive - consider alternatives</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {gapAnalysis.oversaturated.slice(0, 6).map((keyword) => (
                <Badge
                  key={keyword}
                  variant="outline"
                  className="border-red-700 text-red-300"
                >
                  {keyword}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Competitors Preview */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm">Top Competitors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {competitors.slice(0, 3).map((competitor, index) => (
              <div key={competitor.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-white truncate max-w-[200px]">
                    {competitor.title || competitor.name}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  #{index + 1}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
