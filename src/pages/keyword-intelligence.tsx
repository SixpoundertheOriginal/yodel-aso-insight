
import React, { useState } from 'react';
import MainLayout from '@/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, TrendingUp, Target, Crown, AlertCircle, CheckCircle, BarChart3, Lightbulb } from 'lucide-react';
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
      console.log('🎯 [KEYWORD-INTELLIGENCE] Starting smart keyword analysis for:', appData.name);
      
      // Use the enhanced keyword ranking service
      const rankings = await keywordRankingService.getAppKeywordRankings(appData, {
        organizationId,
        maxKeywords: 15,
        includeCompetitors: false,
        debugMode: process.env.NODE_ENV === 'development'
      });
      
      setKeywordRankings(rankings);
      setIsAnalyzing(false);
      
      const actualCount = rankings.filter(r => r.confidence === 'actual').length;
      const estimatedCount = rankings.length - actualCount;
      
      toast({
        title: "Smart Analysis Complete",
        description: `Generated ${actualCount} verified and ${estimatedCount} intelligent keyword predictions`,
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

  // Group rankings by position ranges
  const groupedRankings = {
    topRankings: keywordRankings.filter(r => r.position <= 3),
    mediumRankings: keywordRankings.filter(r => r.position > 3 && r.position <= 10),
    longTailRankings: keywordRankings.filter(r => r.position > 10)
  };

  const getStatusIcon = (ranking: any) => {
    if (ranking.confidence === 'actual') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <BarChart3 className="w-4 h-4 text-blue-500" />;
  };

  const getStatusBadge = (ranking: any) => {
    if (ranking.confidence === 'actual') {
      return <Badge className="bg-green-600 text-white">Verified</Badge>;
    }
    return <Badge variant="outline" className="border-blue-600 text-blue-400">Predicted</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-600 text-white">High Impact</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-600 text-white">Medium Impact</Badge>;
      case 'low':
        return <Badge className="bg-gray-600 text-white">Long-tail</Badge>;
      default:
        return null;
    }
  };

  const renderRankingTable = (rankings: any[], title: string, description: string, colorClass: string) => {
    if (rankings.length === 0) return null;

    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className={`text-lg ${colorClass}`}>{title}</CardTitle>
          <p className="text-sm text-zinc-400">{description}</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((ranking, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(ranking)}
                      <span className="font-medium text-white">{ranking.keyword}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${
                      ranking.position <= 3 ? 'bg-green-600' :
                      ranking.position <= 10 ? 'bg-yellow-600' : 'bg-gray-600'
                    } text-white`}>
                      #{ranking.position}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm ${
                      ranking.volume === 'High' ? 'text-green-400' :
                      ranking.volume === 'Medium' ? 'text-yellow-400' : 'text-gray-400'
                    }`}>
                      {ranking.volume}
                    </span>
                  </TableCell>
                  <TableCell>
                    {ranking.priority && getPriorityBadge(ranking.priority)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(ranking)}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-zinc-400">
                      {ranking.reason || 'Natural search term'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Smart Keyword Intelligence</h1>
            <p className="text-zinc-400 mt-2">
              AI-powered keyword analysis with natural search terms and competitive insights
            </p>
          </div>
          <Badge variant="outline" className="border-purple-600 text-purple-400">
            <Crown className="w-3 h-3 mr-1" />
            Enhanced Intelligence
          </Badge>
        </div>

        {/* App Importer */}
        {!selectedApp && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="w-5 h-5 mr-2 text-purple-500" />
                Select App for Smart Analysis
              </CardTitle>
              <p className="text-sm text-zinc-400">
                Get intelligent keyword predictions based on semantic analysis and category intelligence
              </p>
            </CardHeader>
            <CardContent>
              <MetadataImporter onImportSuccess={handleAppImport} />
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
                      <Badge variant="outline" className="mt-1">
                        {selectedApp.applicationCategory || 'App'}
                      </Badge>
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
                      <h3 className="text-lg font-medium text-white">Smart Keyword Analysis</h3>
                      <p className="text-zinc-400">
                        Using AI to generate natural, searchable keywords for {selectedApp.name}...
                      </p>
                      <p className="text-xs text-zinc-500 mt-2">
                        Analyzing category patterns, semantic meaning, and search intent
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

            {/* Smart Keyword Results */}
            {!isAnalyzing && keywordRankings.length > 0 && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-green-900/20 border-green-600/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-400">Top 1-3 Rankings</p>
                          <p className="text-2xl font-bold text-white">{groupedRankings.topRankings.length}</p>
                        </div>
                        <Target className="w-8 h-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-yellow-900/20 border-yellow-600/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-yellow-400">Top 4-10 Rankings</p>
                          <p className="text-2xl font-bold text-white">{groupedRankings.mediumRankings.length}</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-yellow-500" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-blue-900/20 border-blue-600/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-400">Verified Rankings</p>
                          <p className="text-2xl font-bold text-white">
                            {keywordRankings.filter(r => r.confidence === 'actual').length}
                          </p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-purple-900/20 border-purple-600/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-purple-400">AI Predictions</p>
                          <p className="text-2xl font-bold text-white">
                            {keywordRankings.filter(r => r.confidence === 'estimated').length}
                          </p>
                        </div>
                        <Lightbulb className="w-8 h-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Grouped Ranking Tables */}
                <div className="space-y-6">
                  {renderRankingTable(
                    groupedRankings.topRankings,
                    "🏆 Top 1-3 Rankings (High Impact)",
                    "Keywords driving significant traffic and visibility",
                    "text-green-400"
                  )}
                  
                  {renderRankingTable(
                    groupedRankings.mediumRankings,
                    "🎯 Top 4-10 Rankings (Medium Impact)",
                    "Good optimization targets with solid search volume",
                    "text-yellow-400"
                  )}
                  
                  {renderRankingTable(
                    groupedRankings.longTailRankings,
                    "📊 Top 11+ Rankings (Long-tail)",
                    "Niche targeting opportunities and specific search terms",
                    "text-gray-400"
                  )}
                </div>

                {/* Intelligence Note */}
                <Card className="bg-purple-900/20 border-purple-600/30">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Lightbulb className="w-5 h-5 text-purple-400 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-purple-300">Smart Keyword Intelligence</h4>
                        <p className="text-sm text-purple-200 mt-1">
                          These keywords were generated using AI semantic analysis, category intelligence, and natural search patterns. 
                          <span className="text-green-400"> Verified rankings</span> come from actual App Store searches, while 
                          <span className="text-blue-400"> predicted rankings</span> use intelligent estimation based on app characteristics.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default KeywordIntelligencePage;
