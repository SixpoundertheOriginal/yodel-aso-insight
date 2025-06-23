
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, TrendingUp, FileText, Users, Zap } from 'lucide-react';
import { AppImporter } from '@/components/shared/AsoShared/AppImporter';
import { AppHeader } from '@/components/shared/AsoShared/AppHeader';
import { MetadataWorkspace } from '@/components/AsoAiHub/MetadataCopilot/MetadataWorkspace';
import { KeywordClustersPanel } from '@/components/KeywordIntelligence/KeywordClustersPanel';
import { RankDistributionChart } from '@/components/KeywordIntelligence/RankDistributionChart';
import { KeywordTrendsTable } from '@/components/KeywordIntelligence/KeywordTrendsTable';
import { CompetitiveKeywordAnalysis } from '@/components/AppAudit/CompetitiveKeywordAnalysis';
import { useUnifiedAsoAnalysis } from '@/hooks/useUnifiedAsoAnalysis';
import { toast } from 'sonner';

interface AsoIntelligenceHubProps {
  organizationId: string;
  initialTab?: string;
}

export const AsoIntelligenceHub: React.FC<AsoIntelligenceHubProps> = ({ 
  organizationId, 
  initialTab = 'overview' 
}) => {
  const {
    importedApp,
    activeTab,
    isLoading,
    hasData,
    auditData,
    keywordData,
    clusters,
    rankDistribution,
    handleAppImport,
    setActiveTab,
    resetAnalysis,
    refreshAnalysis,
    generateReport
  } = useUnifiedAsoAnalysis({ organizationId });

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, setActiveTab]);

  const handleExportReport = async () => {
    if (!importedApp) return;
    
    try {
      const report = await generateReport();
      const reportData = JSON.stringify(report, null, 2);
      const blob = new Blob([reportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${importedApp.name}-aso-analysis.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('ASO analysis report downloaded');
    } catch (error) {
      toast.error('Failed to generate report');
    }
  };

  if (!importedApp) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Brain className="h-12 w-12 text-yodel-orange" />
            <h1 className="text-4xl font-bold text-white">ASO Intelligence Hub</h1>
            <Badge variant="outline" className="text-yodel-orange border-yodel-orange">
              Unified Analysis
            </Badge>
          </div>
          <p className="text-zinc-400 text-lg max-w-4xl mx-auto leading-relaxed">
            Comprehensive App Store Optimization analysis combining metadata optimization, 
            keyword intelligence, and competitive insights in one unified platform.
          </p>
        </div>

        {/* Import Section */}
        <AppImporter 
          onImportSuccess={handleAppImport}
          organizationId={organizationId}
        />

        {/* Feature Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-zinc-900/30 border-zinc-800">
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Metadata Optimization</h3>
              <p className="text-zinc-400 text-sm">
                AI-powered title, subtitle, and keyword optimization with real-time scoring.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900/30 border-zinc-800">
            <CardContent className="p-6 text-center">
              <Target className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Keyword Intelligence</h3>
              <p className="text-zinc-400 text-sm">
                Discover high-opportunity keywords, track rankings, and analyze search trends.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900/30 border-zinc-800">
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Competitive Analysis</h3>
              <p className="text-zinc-400 text-sm">
                Monitor competitors, identify keyword gaps, and track market opportunities.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* App Header */}
      <AppHeader
        app={importedApp}
        onRefresh={refreshAnalysis}
        onExport={handleExportReport}
        onBack={resetAnalysis}
        isRefreshing={isLoading}
      />

      {/* Audit Score Overview */}
      {auditData && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-yodel-orange" />
                <span className="text-sm text-zinc-400">Overall Score</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {auditData.overallScore}/100
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {auditData.overallScore >= 80 ? 'Excellent' : 
                 auditData.overallScore >= 60 ? 'Good' : 
                 auditData.overallScore >= 40 ? 'Fair' : 'Needs Work'}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-400" />
                <span className="text-sm text-zinc-400">Metadata</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {auditData.metadataScore}/100
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-zinc-400">Keywords</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {auditData.keywordScore}/100
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-zinc-400">Competitive</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {auditData.competitorScore}/100
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yodel-orange" />
                <span className="text-sm text-zinc-400">Opportunities</span>
              </div>
              <div className="text-2xl font-bold text-yodel-orange">
                {auditData.opportunityCount}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 bg-zinc-900 border-zinc-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="recommendations">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankDistributionChart 
              data={rankDistribution} 
              isLoading={isLoading}
            />
            <KeywordClustersPanel
              clusters={clusters || []}
              isLoading={isLoading}
              detailed={true}
            />
          </div>
        </TabsContent>

        <TabsContent value="metadata" className="space-y-6">
          <MetadataWorkspace 
            initialData={importedApp} 
            organizationId={organizationId}
          />
        </TabsContent>

        <TabsContent value="keywords" className="space-y-6">
          <KeywordTrendsTable
            trends={auditData?.keywordTrends || []}
            isLoading={isLoading}
            onTimeframeChange={() => {}}
            selectedTimeframe={30}
          />
        </TabsContent>

        <TabsContent value="competitors" className="space-y-6">
          <CompetitiveKeywordAnalysis
            competitorData={auditData?.competitorAnalysis || []}
            userKeywords={auditData?.currentKeywords || []}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Priority Recommendations</CardTitle>
              <CardDescription>
                AI-powered optimization suggestions based on comprehensive analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditData?.recommendations?.map((rec, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 bg-zinc-800/50 rounded-lg mb-3">
                  <Badge className={`mt-1 ${
                    rec.priority === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                    'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  }`}>
                    {rec.priority}
                  </Badge>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-white">{rec.title}</h4>
                      <Badge variant="outline" className="text-zinc-400 border-zinc-600">
                        {rec.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-400 mt-1">{rec.description}</p>
                    {'impact' in rec && (
                      <div className="mt-2">
                        <div className="text-xs text-zinc-500">Expected Impact: {rec.impact}%</div>
                        <div className="w-full bg-zinc-700 rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-yodel-orange h-1.5 rounded-full" 
                            style={{ width: `${rec.impact}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
