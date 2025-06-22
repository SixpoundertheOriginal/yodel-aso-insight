
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, TrendingUp, FileText, RefreshCw, Download, AlertTriangle } from 'lucide-react';
import { MetadataImporter } from '../AsoAiHub/MetadataCopilot/MetadataImporter';
import { MetadataWorkspace } from '../AsoAiHub/MetadataCopilot/MetadataWorkspace';
import { KeywordClustersPanel } from '../KeywordIntelligence/KeywordClustersPanel';
import { RankDistributionChart } from '../KeywordIntelligence/RankDistributionChart';
import { KeywordTrendsTable } from '../KeywordIntelligence/KeywordTrendsTable';
import { CompetitiveKeywordAnalysis } from './CompetitiveKeywordAnalysis';
import { useAppAuditHub } from '@/hooks/useAppAuditHub';
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
  } = useAppAuditHub({
    organizationId,
    appId: importedMetadata?.appId,
    enabled: !!importedMetadata
  });

  const handleMetadataImport = (metadata: ScrapedMetadata, orgId: string) => {
    console.log('🎯 [APP-AUDIT] App imported:', metadata.name);
    setImportedMetadata(metadata);
    setActiveTab('overview');
    toast.success(`Started audit for ${metadata.name}`);
  };

  const handleExportReport = async () => {
    if (!importedMetadata) return;
    
    try {
      const report = await generateAuditReport();
      // Trigger download logic here
      toast.success('Audit report generated successfully');
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
          {importedMetadata.iconUrl && (
            <img 
              src={importedMetadata.iconUrl} 
              alt={importedMetadata.name}
              className="w-16 h-16 rounded-xl"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{importedMetadata.name}</h1>
            <p className="text-zinc-400">
              {importedMetadata.category} • {importedMetadata.locale}
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

      {/* Audit Score Overview */}
      {auditData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-yodel-orange" />
                <span className="text-sm text-zinc-400">Overall Score</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {auditData.overallScore}/100
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-400" />
                <span className="text-sm text-zinc-400">Metadata Score</span>
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
                <span className="text-sm text-zinc-400">Keyword Score</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {auditData.keywordScore}/100
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-zinc-400">Opportunities</span>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {auditData.opportunityCount}
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
            />
          </div>
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
            </CardHeader>
            <CardContent>
              {auditData?.recommendations?.map((rec, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 bg-zinc-800/50 rounded-lg mb-3">
                  <Badge className={`mt-1 ${
                    rec.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                    rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {rec.priority}
                  </Badge>
                  <div className="flex-1">
                    <h4 className="font-medium text-white">{rec.title}</h4>
                    <p className="text-sm text-zinc-400 mt-1">{rec.description}</p>
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
