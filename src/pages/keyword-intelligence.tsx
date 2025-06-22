
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
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAppImport = async (appData: ScrapedMetadata, organizationId: string) => {
    setSelectedApp(appData);
    setIsAnalyzing(true);
    setAnalysisError(null);
    setKeywordRankings([]);
    
    try {
      console.log('🎯 [KEYWORD-INTELLIGENCE] Starting keyword analysis for:', appData.name);
      
      // Use the keyword ranking service for actual analysis
      const rankings = await keywordRankingService.getAppKeywordRankings(appData, {
        organizationId,
        maxKeywords: 5, // Reduced to prevent overloading
        includeCompetitors: false, // Simplified for now
        debugMode: process.env.NODE_ENV === 'development'
      });
      
      setKeywordRankings(rankings);
      setIsAnalyzing(false);
      
      const actualCount = rankings.filter(r => r.confidence === 'actual').length;
      const estimatedCount = rankings.length - actualCount;
      
      toast({
        title: "Analysis Complete",
        description: `Found ${actualCount} actual and ${estimatedCount} estimated keyword rankings`,
      });
    } catch (error) {
      console.error('❌ [KEYWORD-INTELLIGENCE] Analysis failed:', error);
      setIsAnalyzing(false);
      setAnalysisError(error.message || 'Analysis failed');
      toast({
        title: "Analysis Failed",
        description: "Could not analyze keyword rankings. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getRankingBadgeColor = (ranking: any) => {
    const { position, confidence } = ranking;
    
    // Different styling for estimated vs actual rankings
    if (confidence === 'estimated') {
      if (position <= 10) return 'bg-blue-600 text-white border border-blue-400';
      if (position <= 30) return 'bg-blue-500 text-white border border-blue-300';
      return 'bg-blue-400 text-white border border-blue-200';
    }
    
    // Actual rankings
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
              Discover which keywords your app ranks for in the App Store
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
                    onClick={() => {
                      setSelectedApp(null);
                      setKeywordRankings([]);
                      setAnalysisError(null);
                    }}
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
                        Extracting keywords from {selectedApp.name} and checking rankings...
                      </p>
                      <p className="text-xs text-zinc-500 mt-2">
                        This may take a moment. We'll provide estimated rankings if searches fail.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error State */}
            {analysisError && !isAnalyzing && (
              <Card className="bg-zinc-900/50 border-zinc-800 border-red-600/50">
                <CardContent className="py-6">
                  <div className="text-center space-y-4">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                    <div>
                      <h3 className="text-lg font-medium text-red-400">Analysis Error</h3>
                      <p className="text-zinc-400">{analysisError}</p>
                      <Button
                        variant="outline"
                        onClick={() => handleAppImport(selectedApp, 'default')}
                        className="mt-4 border-red-600 text-red-400 hover:bg-red-600/10"
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Keyword Rankings */}
            {!isAnalyzing && keywordRankings.length > 0 && (
              <Tabs defaultValue="rankings" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 bg-zinc-800">
                  <TabsTrigger value="rankings">Keyword Rankings</TabsTrigger>
                  <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                  <TabsTrigger value="competitive">Competitive</TabsTrigger>
                </TabsList>

                <TabsContent value="rankings">
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Target className="w-5 h-5 mr-2 text-green-500" />
                        Keyword Rankings for {selectedApp.name}
                      </CardTitle>
                      <p className="text-sm text-zinc-400">
                        Keywords where {selectedApp.name} appears in search results. 
                        Blue badges indicate estimated rankings.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {keywordRankings.map((ranking, index) => (
                          <div key={index} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                            <div className="flex items-center space-x-4">
                              <Badge className={getRankingBadgeColor(ranking)}>
                                #{ranking.position}
                                {ranking.confidence === 'estimated' && (
                                  <span className="ml-1 text-xs">~</span>
                                )}
                              </Badge>
                              <div>
                                <span className="text-white font-medium">{ranking.keyword}</span>
                                <div className="text-xs text-zinc-400">
                                  Volume: {ranking.volume} • {ranking.confidence === 'estimated' ? 'Estimated' : 'Actual'}
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
                      
                      {keywordRankings.some(r => r.confidence === 'estimated') && (
                        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                          <p className="text-xs text-blue-300">
                            <span className="font-medium">Note:</span> Some rankings are estimated due to search limitations. 
                            Estimated rankings (marked with ~) are based on keyword analysis and may not reflect actual App Store positions.
                          </p>
                        </div>
                      )}
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
                        <TrendingUp className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
                        <p className="text-zinc-400">
                          Opportunity analysis coming soon. Focus on improving rankings for keywords with positions 11-30.
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
                        <Crown className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
                        <p className="text-zinc-400">
                          Competitive analysis coming soon. We'll show how your keywords compare against similar apps.
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
