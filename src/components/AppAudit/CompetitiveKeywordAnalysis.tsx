
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Target, AlertTriangle } from 'lucide-react';

interface CompetitorData {
  appName: string;
  keywords: string[];
  avgRank: number;
  visibility: number;
}

interface CompetitiveKeywordAnalysisProps {
  competitorData: CompetitorData[];
  userKeywords: string[];
  isLoading?: boolean;
}

export const CompetitiveKeywordAnalysis: React.FC<CompetitiveKeywordAnalysisProps> = ({
  competitorData,
  userKeywords,
  isLoading = false
}) => {
  // Generate mock competitor data for now
  const mockCompetitors = [
    { appName: 'Competitor A', keywords: ['productivity', 'task management', 'organization'], avgRank: 15, visibility: 75 },
    { appName: 'Competitor B', keywords: ['workflow', 'team collaboration', 'project planning'], avgRank: 22, visibility: 68 },
    { appName: 'Competitor C', keywords: ['business app', 'efficiency', 'remote work'], avgRank: 18, visibility: 72 }
  ];

  const competitors = competitorData.length > 0 ? competitorData : mockCompetitors;

  // Analyze keyword gaps
  const allCompetitorKeywords = competitors.flatMap(c => c.keywords);
  const keywordGaps = allCompetitorKeywords.filter(keyword => 
    !userKeywords.some(userKeyword => 
      userKeyword.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  const opportunities = allCompetitorKeywords.filter(keyword => {
    const frequency = competitors.filter(c => c.keywords.includes(keyword)).length;
    return frequency >= 2 && frequency <= competitors.length * 0.7;
  });

  if (isLoading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-yodel-orange border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-zinc-400">Analyzing competitive landscape...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Competitive Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-zinc-400">Competitors Tracked</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {competitors.length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <span className="text-sm text-zinc-400">Keyword Gaps</span>
            </div>
            <div className="text-2xl font-bold text-orange-400">
              {keywordGaps.length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-sm text-zinc-400">Opportunities</span>
            </div>
            <div className="text-2xl font-bold text-green-400">
              {opportunities.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Competitive Analysis Tabs */}
      <Tabs defaultValue="gaps" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-zinc-900 border-zinc-800">
          <TabsTrigger value="gaps">Keyword Gaps</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="competitors">Competitor Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="gaps" className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Missing Keywords</CardTitle>
              <p className="text-zinc-400 text-sm">
                Keywords your competitors rank for but you don't target
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {keywordGaps.slice(0, 20).map((keyword, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <span className="text-white">{keyword}</span>
                    <Badge variant="outline" className="text-orange-400 border-orange-500">
                      Gap
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">High-Opportunity Keywords</CardTitle>
              <p className="text-zinc-400 text-sm">
                Keywords with moderate competition and good potential
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {opportunities.slice(0, 15).map((keyword, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <span className="text-white">{keyword}</span>
                    <Badge variant="outline" className="text-green-400 border-green-500">
                      Opportunity
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-4">
          <div className="grid gap-4">
            {competitors.map((competitor, index) => (
              <Card key={index} className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">{competitor.appName}</CardTitle>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-zinc-400">
                        Avg Rank: <span className="text-white">{competitor.avgRank}</span>
                      </div>
                      <div className="text-sm text-zinc-400">
                        Visibility: <span className="text-white">{competitor.visibility}%</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {competitor.keywords.map((keyword, kidx) => (
                      <Badge key={kidx} variant="secondary" className="bg-zinc-800 text-zinc-300">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
