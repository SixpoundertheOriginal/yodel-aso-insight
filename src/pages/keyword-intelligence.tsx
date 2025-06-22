
import React, { useState } from 'react';
import MainLayout from '@/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, TrendingUp, Target, Crown, AlertCircle } from 'lucide-react';
import { MetadataImporter } from '@/components/AsoAiHub/MetadataCopilot/MetadataImporter';
import { keywordRankingService } from '@/services/keyword-ranking.service';
import { ScrapedMetadata } from '@/types/aso';
import { useToast } from '@/hooks/use-toast';

const KeywordIntelligencePage: React.FC = () => {
  const [selectedApp, setSelectedApp] = useState<ScrapedMetadata | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [keywordRankings, setKeywordRankings] = useState<any[]>([]);
  const { toast } = useToast();

  const handleAppImport = async (appData: ScrapedMetadata, organizationId: string) => {
    setSelectedApp(appData);
    setIsAnalyzing(true);
    
    try {
      console.log('🎯 [KEYWORD-INTELLIGENCE] Starting keyword analysis for:', appData.name);
      
      // Use the keyword ranking service for actual analysis
      const rankings = await keywordRankingService.getAppKeywordRankings(appData, {
        organizationId,
        maxKeywords: 20,
        includeCompetitors: true,
        debugMode: process.env.NODE_ENV === 'development'
      });
      
      setKeywordRankings(rankings);
      setIsAnalyzing(false);
      
      toast({
        title: "Analysis Complete",
        description: `Found ${rankings.length} keyword rankings for ${appData.name}`,
      });
    } catch (error) {
      console.error('❌ [KEYWORD-INTELLIGENCE] Analysis failed:', error);
      setIsAnalyzing(false);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze keyword rankings. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getRankingBadgeColor = (position: number) => {
    if (position <= 3) return 'bg-green-600 text-white';
    if (position <= 10) return 'bg-yellow-600 text-white';
    if (position <= 20) return 'bg-orange-600 text-white';
    return 'bg-gray-600 text-white';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'down': return <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />;
      default: return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Keyword Intelligence</h1>
            <p className="text-zinc-400 mt-2">
              Discover which keywords your app and competitors rank for in the App Store
            </p>
          </div>
          <Badge variant="outline" className="border-purple-600 text-purple-400">
            <Crown className="w-3 h-3 mr-1" />
            ASO Intelligence
          </Badge>
        </div>

        {/* App Importer */}
        {!selectedApp && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="w-5 h-5 mr-2 text-purple-500" />
                Select App to Analyze
              </CardTitle>
              <p className="text-sm text-zinc-400">
                Enter an app name, URL, or keywords to discover keyword rankings
              </p>
            </CardHeader>
            <CardContent>
              <MetadataImporter
                onImportSuccess={handleAppImport}
              />
            </CardContent>
          </Card>
        )}

        {/* Analysis Results */}
        {selectedApp && (
          <div className="space-y-6">
            {/* App Overview */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {selectedApp.icon && (
                      <img 
                        src={selectedApp.icon} 
                        alt={selectedApp.name}
                        className="w-12 h-12 rounded-lg"
                      />
                    )}
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedApp.name}</h2>
                      <p className="text-zinc-400">{selectedApp.developer}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedApp(null)}
                    className="border-zinc-700"
                  >
                    Analyze Different App
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Loading State */}
            {isAnalyzing && (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="py-8">
                  <div className="text-center space-y-4">
                    <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                    <div>
                      <h3 className="text-lg font-medium text-white">Analyzing Keyword Rankings</h3>
                      <p className="text-zinc-400">
                        Discovering which keywords {selectedApp.name} ranks for...
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Keyword Rankings */}
            {!isAnalyzing && keywordRankings.length > 0 && (
              <Tabs defaultValue="rankings" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 bg-zinc-800">
                  <TabsTrigger value="rankings">Top Rankings</TabsTrigger>
                  <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                  <TabsTrigger value="competitive">Competitive</TabsTrigger>
                </TabsList>

                <TabsContent value="rankings">
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Target className="w-5 h-5 mr-2 text-green-500" />
                        Top Keyword Rankings
                      </CardTitle>
                      <p className="text-sm text-zinc-400">
                        Keywords where {selectedApp.name} appears in search results
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {keywordRankings.map((ranking, index) => (
                          <div key={index} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                            <div className="flex items-center space-x-4">
                              <Badge className={getRankingBadgeColor(ranking.position)}>
                                #{ranking.position}
                              </Badge>
                              <div>
                                <span className="text-white font-medium">{ranking.keyword}</span>
                                <div className="text-xs text-zinc-400">
                                  Search Volume: {ranking.volume}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getTrendIcon(ranking.trend)}
                              <span className="text-xs text-zinc-400 capitalize">
                                {ranking.trend}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="opportunities">
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-orange-500" />
                        Keyword Opportunities
                      </CardTitle>
                      <p className="text-sm text-zinc-400">
                        Keywords with potential for improvement
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <AlertCircle className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
                        <p className="text-zinc-400">
                          Opportunity analysis will be available in the next update
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="competitive">
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Crown className="w-5 h-5 mr-2 text-purple-500" />
                        Competitive Analysis
                      </CardTitle>
                      <p className="text-sm text-zinc-400">
                        Compare rankings with competitors
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <AlertCircle className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
                        <p className="text-zinc-400">
                          Competitive analysis will be available in the next update
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default KeywordIntelligencePage;
