
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { CompetitorKeywordAnalysis } from '@/types/aso';

interface KeywordGapAnalyzerProps {
  competitorAnalysis: CompetitorKeywordAnalysis[];
  userKeywords: string[];
  onKeywordAdd?: (keyword: string) => void;
  onKeywordRemove?: (keyword: string) => void;
}

export const KeywordGapAnalyzer: React.FC<KeywordGapAnalyzerProps> = ({
  competitorAnalysis,
  userKeywords,
  onKeywordAdd,
  onKeywordRemove
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredAnalysis, setFilteredAnalysis] = useState<CompetitorKeywordAnalysis[]>([]);

  useEffect(() => {
    if (searchTerm) {
      setFilteredAnalysis(
        competitorAnalysis.filter(item =>
          item.keyword.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredAnalysis(competitorAnalysis);
    }
  }, [searchTerm, competitorAnalysis]);

  const getKeywordCategory = (item: CompetitorKeywordAnalysis) => {
    const userHasKeyword = userKeywords.some(uk => 
      uk.toLowerCase().includes(item.keyword.toLowerCase())
    );
    
    if (userHasKeyword) return 'using';
    if (item.percentage > 80) return 'oversaturated';
    if (item.percentage >= 60) return 'opportunity';
    if (item.percentage >= 40) return 'moderate';
    return 'gap';
  };

  const getCategoryKeywords = (category: string) => {
    return filteredAnalysis.filter(item => getKeywordCategory(item) === category);
  };

  const getVariantProps = (category: string) => {
    switch (category) {
      case 'using':
        return { variant: 'default' as const, className: 'bg-blue-600 hover:bg-blue-700' };
      case 'opportunity':
        return { variant: 'outline' as const, className: 'border-green-600 text-green-400 hover:bg-green-600/20' };
      case 'gap':
        return { variant: 'outline' as const, className: 'border-orange-600 text-orange-400 hover:bg-orange-600/20' };
      case 'oversaturated':
        return { variant: 'outline' as const, className: 'border-red-600 text-red-400 hover:bg-red-600/20' };
      default:
        return { variant: 'outline' as const, className: 'border-zinc-600 text-zinc-400 hover:bg-zinc-600/20' };
    }
  };

  const KeywordList: React.FC<{ keywords: CompetitorKeywordAnalysis[]; category: string }> = ({ keywords, category }) => (
    <div className="space-y-2">
      {keywords.length === 0 ? (
        <p className="text-zinc-500 text-sm text-center py-4">No keywords in this category</p>
      ) : (
        <div className="grid gap-2">
          {keywords.map((item) => {
            const props = getVariantProps(category);
            const isUsing = category === 'using';
            
            return (
              <div key={item.keyword} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center space-x-3 flex-1">
                  <Badge {...props}>
                    {item.keyword}
                  </Badge>
                  <div className="text-xs text-zinc-400">
                    {item.percentage}% of competitors • {item.frequency} apps
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {!isUsing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onKeywordAdd?.(item.keyword)}
                      className="h-8 px-2 text-green-400 hover:text-green-300 hover:bg-green-600/20"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  )}
                  {isUsing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onKeywordRemove?.(item.keyword)}
                      className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-600/20"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Search className="w-5 h-5 mr-2 text-purple-500" />
          Keyword Gap Analysis
        </CardTitle>
        <div className="flex space-x-2">
          <Input
            placeholder="Search keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="gaps" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-zinc-800">
            <TabsTrigger value="gaps" className="text-xs">
              <Target className="w-3 h-3 mr-1" />
              Gaps ({getCategoryKeywords('gap').length})
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              Opportunities ({getCategoryKeywords('opportunity').length})
            </TabsTrigger>
            <TabsTrigger value="oversaturated" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Saturated ({getCategoryKeywords('oversaturated').length})
            </TabsTrigger>
            <TabsTrigger value="using" className="text-xs">
              Using ({getCategoryKeywords('using').length})
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-4">
            <TabsContent value="gaps">
              <div className="space-y-2">
                <p className="text-sm text-zinc-400 mb-3">
                  Keywords your competitors use but you don't target yet
                </p>
                <KeywordList keywords={getCategoryKeywords('gap')} category="gap" />
              </div>
            </TabsContent>
            
            <TabsContent value="opportunities">
              <div className="space-y-2">
                <p className="text-sm text-zinc-400 mb-3">
                  Moderately competitive keywords with good potential
                </p>
                <KeywordList keywords={getCategoryKeywords('opportunity')} category="opportunity" />
              </div>
            </TabsContent>
            
            <TabsContent value="oversaturated">
              <div className="space-y-2">
                <p className="text-sm text-zinc-400 mb-3">
                  Highly competitive terms - consider long-tail alternatives
                </p>
                <KeywordList keywords={getCategoryKeywords('oversaturated')} category="oversaturated" />
              </div>
            </TabsContent>
            
            <TabsContent value="using">
              <div className="space-y-2">
                <p className="text-sm text-zinc-400 mb-3">
                  Keywords you're already targeting
                </p>
                <KeywordList keywords={getCategoryKeywords('using')} category="using" />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};
