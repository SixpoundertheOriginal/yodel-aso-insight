
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CppStrategyData, CppTheme } from '@/types/cpp';
import { Download, Eye, Lightbulb, Target, Palette } from 'lucide-react';
import { cppStrategyService } from '@/services/cpp-strategy.service';
import { useToast } from '@/hooks/use-toast';

interface CppStrategyWorkspaceProps {
  strategyData: CppStrategyData;
  organizationId: string;
}

export const CppStrategyWorkspace: React.FC<CppStrategyWorkspaceProps> = ({ 
  strategyData, 
  organizationId 
}) => {
  const [selectedTheme, setSelectedTheme] = useState<CppTheme | null>(null);
  const { toast } = useToast();

  const handleExport = (format: 'json' | 'csv' | 'notion') => {
    try {
      const exportData = cppStrategyService.exportStrategy(strategyData, format);
      const blob = new Blob([exportData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cpp-strategy-${strategyData.originalApp.name.toLowerCase().replace(/\s+/g, '-')}.${format === 'notion' ? 'md' : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Strategy Exported',
        description: `CPP strategy exported as ${format.toUpperCase()} file.`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export CPP strategy. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateVariations = (theme: CppTheme) => {
    const variations = cppStrategyService.generateThemeVariations(theme);
    toast({
      title: 'Theme Variations Generated',
      description: `Generated ${variations.length} variations for A/B testing.`,
    });
    // In a real implementation, you would add these to the workspace
    console.log('Generated variations:', variations);
  };

  return (
    <div className="space-y-6">
      {/* App Overview */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Analysis Overview: {strategyData.originalApp.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-zinc-800/50 p-3 rounded">
              <div className="text-zinc-400">Screenshots Analyzed</div>
              <div className="text-white font-semibold">{strategyData.originalApp.screenshots.length}</div>
            </div>
            <div className="bg-zinc-800/50 p-3 rounded">
              <div className="text-zinc-400">CPP Themes Generated</div>
              <div className="text-white font-semibold">{strategyData.suggestedThemes.length}</div>
            </div>
            <div className="bg-zinc-800/50 p-3 rounded">
              <div className="text-zinc-400">Primary Theme</div>
              <div className="text-white font-semibold">{strategyData.recommendations.primaryTheme}</div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
              <Download className="w-4 h-4 mr-1" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
              <Download className="w-4 h-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('notion')}>
              <Download className="w-4 h-4 mr-1" />
              Notion
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CPP Themes */}
      <Tabs defaultValue="themes" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-zinc-800">
          <TabsTrigger value="themes" className="data-[state=active]:bg-yodel-orange">
            CPP Themes
          </TabsTrigger>
          <TabsTrigger value="screenshots" className="data-[state=active]:bg-yodel-orange">
            Screenshot Analysis
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="data-[state=active]:bg-yodel-orange">
            Recommendations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="themes" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {strategyData.suggestedThemes.map((theme, index) => (
              <Card key={theme.id} className="bg-zinc-900/50 border-zinc-800 hover:border-yodel-orange/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      {theme.name}
                      {index === 0 && <Badge variant="secondary">Recommended</Badge>}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleGenerateVariations(theme)}
                    >
                      <Palette className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                  <p className="text-zinc-400 italic">"{theme.tagline}"</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-300">Target Audience</h4>
                    <p className="text-zinc-400 text-sm">{theme.targetAudience}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-300">Value Hook</h4>
                    <p className="text-zinc-400 text-sm">{theme.valueHook}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-300">Search Terms</h4>
                    <div className="flex flex-wrap gap-1">
                      {theme.searchTerms.map((term, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {term}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-300">Visual Style</h4>
                    <p className="text-zinc-400 text-sm capitalize">{theme.visualStyle.mood} mood</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="screenshots" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {strategyData.originalApp.screenshots.map((screenshot, index) => (
              <Card key={index} className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Screenshot {screenshot.index + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <h4 className="text-zinc-300 font-semibold">Key Features</h4>
                    <ul className="text-zinc-400 text-xs space-y-1">
                      {screenshot.analysis.features.map((feature, idx) => (
                        <li key={idx}>• {feature}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-zinc-300 font-semibold">User Flow</h4>
                    <p className="text-zinc-400 text-xs">{screenshot.analysis.userFlow}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-zinc-300 font-semibold">Value Proposition</h4>
                    <p className="text-zinc-400 text-xs">{screenshot.analysis.valueProposition}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Strategic Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-zinc-300 font-semibold mb-2">Primary CPP Theme</h4>
                <Badge variant="secondary" className="mb-2">{strategyData.recommendations.primaryTheme}</Badge>
                <p className="text-zinc-400 text-sm">
                  This theme showed the strongest alignment with your app's core value propositions and user journey.
                </p>
              </div>
              
              <div>
                <h4 className="text-zinc-300 font-semibold mb-2">Alternative Themes for A/B Testing</h4>
                <div className="space-y-2">
                  {strategyData.recommendations.alternativeThemes.map((theme, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="outline">{theme}</Badge>
                      <span className="text-zinc-400 text-sm">
                        Test against primary to optimize conversion
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-zinc-300 font-semibold mb-2">Key Differentiators</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {strategyData.recommendations.keyDifferentiators.map((diff, index) => (
                    <div key={index} className="bg-zinc-800/50 p-2 rounded text-sm">
                      <span className="text-zinc-300">• {diff}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
