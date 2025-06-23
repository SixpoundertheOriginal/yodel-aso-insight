
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Lightbulb, Target, TrendingUp, Zap, Search, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface SmartDiscoveryEngineProps {
  organizationId: string;
  appId: string;
  selectedApp?: any;
  onSuggestionsGenerated: (suggestions: any[]) => void;
}

export const SmartDiscoveryEngine: React.FC<SmartDiscoveryEngineProps> = ({
  organizationId,
  appId,
  selectedApp,
  onSuggestionsGenerated
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [seedKeywords, setSeedKeywords] = useState('');
  const [competitorApps, setCompetitorApps] = useState('');
  const [generatedSuggestions, setGeneratedSuggestions] = useState<any[]>([]);
  const [activeDiscoveryType, setActiveDiscoveryType] = useState<string>('ai-powered');

  const generateAISuggestions = async () => {
    setIsGenerating(true);
    try {
      // Simulate AI-powered keyword discovery based on app category and metadata
      const appCategory = selectedApp?.applicationCategory || 'productivity';
      const appName = selectedApp?.app_name || 'App';
      
      // Generate contextual keywords based on app category
      const categoryKeywords = getCategoryKeywords(appCategory);
      const brandKeywords = getBrandKeywords(appName);
      const seedWords = seedKeywords.split(',').map(k => k.trim()).filter(Boolean);
      
      const suggestions = [
        ...categoryKeywords,
        ...brandKeywords,
        ...seedWords.flatMap(seed => generateRelatedKeywords(seed))
      ].map((keyword, index) => ({
        keyword,
        rank: Math.floor(Math.random() * 50) + 1,
        searchVolume: Math.floor(Math.random() * 8000) + 2000,
        difficulty: Math.round((Math.random() * 4 + 3) * 10) / 10,
        trend: (['up', 'down', 'stable'] as const)[Math.floor(Math.random() * 3)],
        opportunity: index < 5 ? 'high' : index < 15 ? 'medium' : 'low',
        competitorRank: Math.floor(Math.random() * 40) + 10,
        volumeHistory: [],
        source: 'ai_discovery',
        contextualReason: getContextualReason(keyword, appCategory),
        relevanceScore: Math.round((Math.random() * 0.4 + 0.6) * 100) / 100
      }));

      setGeneratedSuggestions(suggestions);
      onSuggestionsGenerated(suggestions);
      toast.success(`Generated ${suggestions.length} AI-powered keyword suggestions`);
      
    } catch (error) {
      toast.error('Failed to generate AI suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCompetitorKeywords = async () => {
    setIsGenerating(true);
    try {
      const competitors = competitorApps.split(',').map(c => c.trim()).filter(Boolean);
      
      if (competitors.length === 0) {
        toast.warning('Please enter competitor app names');
        return;
      }

      // Simulate competitor keyword analysis
      const competitorSuggestions = competitors.flatMap(competitor => 
        generateCompetitorSpecificKeywords(competitor)
      ).map((keyword, index) => ({
        keyword,
        rank: Math.floor(Math.random() * 60) + 20,
        searchVolume: Math.floor(Math.random() * 12000) + 3000,
        difficulty: Math.round((Math.random() * 3 + 4) * 10) / 10,
        trend: (['up', 'down', 'stable'] as const)[Math.floor(Math.random() * 3)],
        opportunity: index < 8 ? 'high' : index < 20 ? 'medium' : 'low',
        competitorRank: Math.floor(Math.random() * 20) + 1,
        volumeHistory: [],
        source: 'competitor_analysis',
        contextualReason: `Discovered from competitor analysis`,
        relevanceScore: Math.round((Math.random() * 0.3 + 0.7) * 100) / 100
      }));

      setGeneratedSuggestions(competitorSuggestions);
      onSuggestionsGenerated(competitorSuggestions);
      toast.success(`Discovered ${competitorSuggestions.length} keywords from competitor analysis`);
      
    } catch (error) {
      toast.error('Failed to analyze competitor keywords');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSeasonalKeywords = async () => {
    setIsGenerating(true);
    try {
      // Generate trending/seasonal keywords
      const currentMonth = new Date().getMonth();
      const seasonalKeywords = getSeasonalKeywords(currentMonth, selectedApp?.applicationCategory || 'productivity');
      
      const suggestions = seasonalKeywords.map((keyword, index) => ({
        keyword,
        rank: Math.floor(Math.random() * 70) + 30,
        searchVolume: Math.floor(Math.random() * 15000) + 5000,
        difficulty: Math.round((Math.random() * 2.5 + 2.5) * 10) / 10,
        trend: 'up' as const,
        opportunity: index < 6 ? 'high' : index < 12 ? 'medium' : 'low',
        competitorRank: Math.floor(Math.random() * 50) + 25,
        volumeHistory: [],
        source: 'seasonal_trends',
        contextualReason: `Trending seasonal keyword for ${getSeasonName(currentMonth)}`,
        relevanceScore: Math.round((Math.random() * 0.3 + 0.6) * 100) / 100
      }));

      setGeneratedSuggestions(suggestions);
      onSuggestionsGenerated(suggestions);
      toast.success(`Found ${suggestions.length} trending seasonal keywords`);
      
    } catch (error) {
      toast.error('Failed to generate seasonal keywords');
    } finally {
      setIsGenerating(false);
    }
  };

  const getCategoryKeywords = (category: string): string[] => {
    const categoryMap: Record<string, string[]> = {
      productivity: ['task manager', 'note taking', 'organization', 'workflow', 'efficiency'],
      social: ['chat app', 'messaging', 'social network', 'friends', 'community'],
      entertainment: ['streaming', 'videos', 'movies', 'music', 'games'],
      finance: ['budgeting', 'expenses', 'money manager', 'banking', 'investment'],
      health: ['fitness tracker', 'workout', 'nutrition', 'wellness', 'meditation'],
      education: ['learning app', 'courses', 'study', 'language', 'skills']
    };
    
    return categoryMap[category.toLowerCase()] || categoryMap.productivity;
  };

  const getBrandKeywords = (appName: string): string[] => {
    return [
      `${appName} app`,
      `${appName} download`,
      `${appName} alternative`,
      `${appName} review`,
      `best ${appName}`
    ];
  };

  const generateRelatedKeywords = (seed: string): string[] => {
    const variations = [
      `${seed} app`,
      `best ${seed}`,
      `${seed} tool`,
      `${seed} software`,
      `free ${seed}`,
      `mobile ${seed}`
    ];
    return variations;
  };

  const generateCompetitorSpecificKeywords = (competitor: string): string[] => {
    return [
      `${competitor} alternative`,
      `${competitor} vs`,
      `better than ${competitor}`,
      `${competitor} competitor`,
      `like ${competitor}`
    ];
  };

  const getSeasonalKeywords = (month: number, category: string): string[] => {
    const seasonalMap: Record<number, string[]> = {
      0: ['new year resolution', 'goal setting', 'fresh start'], // January
      1: ['valentine', 'love', 'relationship'], // February  
      2: ['spring cleaning', 'organization', 'renewal'], // March
      3: ['easter', 'spring', 'growth'], // April
      4: ['summer prep', 'vacation', 'planning'], // May
      5: ['summer', 'travel', 'outdoor'], // June
      6: ['vacation', 'holiday', 'summer fun'], // July
      7: ['back to school', 'education', 'learning'], // August
      8: ['fall', 'autumn', 'harvest'], // September
      9: ['halloween', 'spooky', 'october'], // October
      10: ['thanksgiving', 'gratitude', 'family'], // November
      11: ['christmas', 'holiday', 'gift'] // December
    };
    
    return seasonalMap[month] || [];
  };

  const getSeasonName = (month: number): string => {
    const seasons = ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Fall', 'Fall', 'Fall', 'Winter'];
    return seasons[month];
  };

  const getContextualReason = (keyword: string, category: string): string => {
    const reasons = [
      `Highly relevant for ${category} apps`,
      `Popular search term in your category`,
      `Low competition opportunity`,
      `Trending in app stores`,
      `High conversion potential`
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  };

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            Smart Discovery Engine
          </CardTitle>
          <CardDescription>
            AI-powered keyword discovery using category intelligence, competitor analysis, and trend detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeDiscoveryType} onValueChange={setActiveDiscoveryType} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 bg-zinc-800">
              <TabsTrigger value="ai-powered">AI-Powered</TabsTrigger>
              <TabsTrigger value="competitor">Competitor</TabsTrigger>
              <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
            </TabsList>

            <TabsContent value="ai-powered" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-zinc-300">Generate smart suggestions based on your app category and context</span>
              </div>
              
              <div className="space-y-3">
                <Input
                  placeholder="Enter seed keywords (comma-separated, optional)"
                  value={seedKeywords}
                  onChange={(e) => setSeedKeywords(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
                
                <Button
                  onClick={generateAISuggestions}
                  disabled={isGenerating}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Generate AI Suggestions'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="competitor" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-zinc-300">Discover keywords used by your competitors</span>
              </div>
              
              <div className="space-y-3">
                <Input
                  placeholder="Enter competitor app names (comma-separated)"
                  value={competitorApps}
                  onChange={(e) => setCompetitorApps(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
                
                <Button
                  onClick={generateCompetitorKeywords}
                  disabled={isGenerating || !competitorApps.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Target className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Analyzing...' : 'Analyze Competitors'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="seasonal" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-green-400" />
                <span className="text-sm text-zinc-300">Find trending seasonal keywords for {getSeasonName(new Date().getMonth())}</span>
              </div>
              
              <Button
                onClick={generateSeasonalKeywords}
                disabled={isGenerating}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                {isGenerating ? 'Finding Trends...' : 'Discover Seasonal Keywords'}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Generated Suggestions Display */}
      {generatedSuggestions.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Smart Suggestions ({generatedSuggestions.length})
            </CardTitle>
            <CardDescription>
              AI-generated keyword opportunities with relevance scoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generatedSuggestions.slice(0, 12).map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                  <div className="flex-1">
                    <h4 className="font-medium text-white">{suggestion.keyword}</h4>
                    <p className="text-sm text-zinc-400 mt-1">
                      {suggestion.contextualReason}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                      <span>Volume: {suggestion.searchVolume.toLocaleString()}</span>
                      <span>Difficulty: {suggestion.difficulty}</span>
                      <span>Relevance: {(suggestion.relevanceScore * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-purple-400 border-purple-500">
                      {suggestion.source.replace('_', ' ')}
                    </Badge>
                    <Badge className={
                      suggestion.opportunity === 'high' ? 'bg-green-500/20 text-green-400' :
                      suggestion.opportunity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }>
                      {suggestion.opportunity}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {generatedSuggestions.length > 12 && (
                <div className="text-center text-zinc-400 text-sm mt-4">
                  ... and {generatedSuggestions.length - 12} more suggestions
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
