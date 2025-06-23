
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, TrendingUp, FileText, RefreshCw, Download, AlertTriangle, Users } from 'lucide-react';
import { MetadataImporter } from '../AsoAiHub/MetadataCopilot/MetadataImporter';
import { MetadataWorkspace } from '../AsoAiHub/MetadataCopilot/MetadataWorkspace';
import { KeywordClustersPanel } from '../KeywordIntelligence/KeywordClustersPanel';
import { RankDistributionChart } from '../KeywordIntelligence/RankDistributionChart';
import { KeywordTrendsTable } from '../KeywordIntelligence/KeywordTrendsTable';
import { CompetitiveKeywordAnalysis } from './CompetitiveKeywordAnalysis';
import { useEnhancedAppAudit } from '@/hooks/useEnhancedAppAudit';
import { ScrapedMetadata } from '@/types/aso';
import { toast } from 'sonner';

interface AppAuditHubProps {
  organizationId: string;
}

export const AppAuditHub: React.FC<AppAuditHubProps> = ({ organizationId }) => {
  const [importedMetadata, setImportedMetadata] = useState<ScrapedMetadata | null>(null);
  const [activeTab, setActiveTab] = useState('import');

  const {
    auditData,
    isLoading,
    isRefreshing,
    lastUpdated,
    refreshAudit,
    generateAuditReport
  } = useEnhancedAppAudit({
    organizationId,
    appId: importedMetadata?.appId,
    metadata: importedMetadata,
    enabled: !!importedMetadata
  });

  const handleMetadataImport = (metadata: ScrapedMetadata, orgId: string) => {
    console.log('🎯 [APP-AUDIT] App imported:', metadata.name);
    setImportedMetadata(metadata);
    setActiveTab('overview');
    toast.success(`Started comprehensive audit for ${metadata.name}`);
  };

  const handleExportReport = async () => {
    if (!importedMetadata) return;
    
    try {
      const report = await generateAuditReport();
      // Create downloadable report
      const reportData = JSON.stringify(report, null, 2);
      const blob = new Blob([reportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${importedMetadata.name}-audit-report.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Audit report downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate audit report');
    }
  };

  const handleRefresh = async () => {
    await refreshAudit();
    toast.success('Audit data refreshed');
  };

  if (!importedMetadata) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">App Audit Hub</h1>
          <p className="text-zinc-400 text-lg max-w-3xl mx-auto">
            Comprehensive ASO analysis combining metadata optimization and keyword intelligence. 
            Import your app to get started with competitor analysis, keyword gaps, and optimization recommendations.
          </p>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Brain className="h-6 w-6 text-yodel-orange" />
              <span>Import App for Audit</span>
            </CardTitle>
            <CardDescription>
              Enter your app's App Store URL to begin comprehensive ASO analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetadataImporter onImportSuccess={handleMetadataImport} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-zinc-900/30 border-zinc-800">
            <CardContent className="p-6 text-center">
              <Target className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Keyword Analysis</h3>
              <p className="text-zinc-400 text-sm">
                Discover ranking opportunities, analyze competitor keywords, and identify gaps in your strategy.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/30 border-zinc-800">
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Metadata Optimization</h3>
              <p className="text-zinc-400 text-sm">
                Optimize your app title, subtitle, and keywords with AI-powered suggestions and competitor insights.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/30 border-zinc-800">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Competitive Intelligence</h3>
              <p className="text-zinc-400 text-sm">
                Track competitor performance, monitor metadata changes, and stay ahead of market trends.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with App Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {importedMetadata.icon && (
            <img 
              src={importedMetadata.icon} 
              alt={importedMetadata.name}
              className="w-16 h-16 rounded-xl"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{importedMetadata.name}</h1>
            <p className="text-zinc-400">
              {importedMetadata.applicationCategory} • {importedMetadata.locale}
              {lastUpdated && (
                <span className="ml-2 text-zinc-500 text-sm">
                  • Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            onClick={handleExportReport}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Enhanced Audit Score Overview */}
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
              <div className="text-xs text-zinc-500 mt-1">
                Title, Subtitle, Keywords
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
              <div className="text-xs text-zinc-500 mt-1">
                Rankings & Visibility
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
              <div className="text-xs text-zinc-500 mt-1">
                Market Position
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
                {auditData.opportunityCount}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Action Items
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Audit Tabs */}
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
              data={auditData?.rankDistribution} 
              isLoading={isLoading}
            />
            <KeywordClustersPanel
              clusters={auditData?.keywordClusters || []}
              isLoading={isLoading}
              detailed={true}
            />
          </div>
          
          {/* Enhanced Audit Summary */}
          {auditData?.metadataAnalysis && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Audit Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-zinc-800/50 rounded-lg">
                    <h4 className="font-medium text-white mb-2">Character Usage</h4>
                    <div className="text-2xl font-bold text-blue-400">
                      {auditData.metadataAnalysis.scores.breakdown.characterUsage}%
                    </div>
                    <p className="text-sm text-zinc-400">Title & Subtitle efficiency</p>
                  </div>
                  <div className="p-4 bg-zinc-800/50 rounded-lg">
                    <h4 className="font-medium text-white mb-2">Keyword Density</h4>
                    <div className="text-2xl font-bold text-green-400">
                      {auditData.metadataAnalysis.scores.breakdown.keywordDensity}%
                    </div>
                    <p className="text-sm text-zinc-400">Optimization level</p>
                  </div>
                  <div className="p-4 bg-zinc-800/50 rounded-lg">
                    <h4 className="font-medium text-white mb-2">Uniqueness</h4>
                    <div className="text-2xl font-bold text-purple-400">
                      {auditData.metadataAnalysis.scores.breakdown.uniqueness}%
                    </div>
                    <p className="text-sm text-zinc-400">vs Competitors</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metadata" className="space-y-6">
          <MetadataWorkspace 
            initialData={importedMetadata} 
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
              <CardTitle className="text-white flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yodel-orange" />
                <span>Priority Recommendations</span>
              </CardTitle>
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
