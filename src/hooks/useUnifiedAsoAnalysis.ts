
import { useState, useCallback, useMemo } from 'react';
import { useEnhancedAppAudit } from './useEnhancedAppAudit';
import { useKeywordIntelligenceManager } from './useKeywordIntelligenceManager';
import { useCopilotChat } from './useCopilotChat';
import { ScrapedMetadata } from '@/types/aso';
import { toast } from 'sonner';

interface UseUnifiedAsoAnalysisProps {
  organizationId: string;
}

interface UnifiedAnalysisState {
  importedApp: ScrapedMetadata | null;
  activeTab: string;
  isAnalyzing: boolean;
}

export const useUnifiedAsoAnalysis = ({
  organizationId
}: UseUnifiedAsoAnalysisProps) => {
  const [state, setState] = useState<UnifiedAnalysisState>({
    importedApp: null,
    activeTab: 'overview',
    isAnalyzing: false
  });

  // Enhanced app audit hook
  const auditAnalysis = useEnhancedAppAudit({
    organizationId,
    appId: state.importedApp?.appId,
    metadata: state.importedApp,
    enabled: !!state.importedApp
  });

  // Keyword intelligence manager
  const keywordIntelligence = useKeywordIntelligenceManager({
    organizationId,
    targetAppId: state.importedApp?.appId
  });

  // AI chat capabilities
  const { sendMessage } = useCopilotChat();

  // Handle app import
  const handleAppImport = useCallback((metadata: ScrapedMetadata, orgId: string) => {
    console.log('🎯 [UNIFIED-ASO] App imported:', metadata.name);
    
    setState(prev => ({
      ...prev,
      importedApp: metadata,
      activeTab: 'overview',
      isAnalyzing: true
    }));

    toast.success(`Started comprehensive analysis for ${metadata.name}`);
    
    // Stop analyzing once initial data loads
    setTimeout(() => {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }, 3000);
  }, []);

  // Handle tab changes
  const setActiveTab = useCallback((tab: string) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  // Reset analysis
  const resetAnalysis = useCallback(() => {
    setState({
      importedApp: null,
      activeTab: 'overview',
      isAnalyzing: false
    });
    
    console.log('🔄 [UNIFIED-ASO] Analysis reset');
  }, []);

  // Refresh all data
  const refreshAnalysis = useCallback(async () => {
    if (!state.importedApp) return;
    
    setState(prev => ({ ...prev, isAnalyzing: true }));
    
    try {
      await Promise.all([
        auditAnalysis.refreshAudit(),
        keywordIntelligence.refreshAllData()
      ]);
      
      toast.success('Analysis refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh analysis');
    } finally {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  }, [state.importedApp, auditAnalysis.refreshAudit, keywordIntelligence.refreshAllData]);

  // Generate comprehensive report
  const generateReport = useCallback(async () => {
    if (!state.importedApp) throw new Error('No app imported');
    
    const auditReport = await auditAnalysis.generateAuditReport();
    
    return {
      ...auditReport,
      keywordIntelligence: {
        totalKeywords: keywordIntelligence.keywordData.length,
        clusters: keywordIntelligence.clusters.length,
        stats: keywordIntelligence.stats
      }
    };
  }, [state.importedApp, auditAnalysis.generateAuditReport, keywordIntelligence]);

  // AI assistance
  const askAI = useCallback(async (question: string) => {
    if (!state.importedApp) return;
    
    const context = `App: ${state.importedApp.name}
Category: ${state.importedApp.applicationCategory}
Current analysis: ${auditAnalysis.auditData ? JSON.stringify(auditAnalysis.auditData, null, 2) : 'Loading...'}`;
    
    const response = await sendMessage(`${context}\n\nQuestion: ${question}`, 'unified-aso-analysis');
    return response;
  }, [state.importedApp, auditAnalysis.auditData, sendMessage]);

  // Combined loading state
  const isLoading = useMemo(() => {
    return state.isAnalyzing || 
           auditAnalysis.isLoading || 
           keywordIntelligence.isLoading;
  }, [state.isAnalyzing, auditAnalysis.isLoading, keywordIntelligence.isLoading]);

  // Combined data availability
  const hasData = useMemo(() => {
    return !!state.importedApp && 
           (!!auditAnalysis.auditData || !!keywordIntelligence.keywordData.length);
  }, [state.importedApp, auditAnalysis.auditData, keywordIntelligence.keywordData]);

  return {
    // State
    importedApp: state.importedApp,
    activeTab: state.activeTab,
    isLoading,
    hasData,
    
    // Data
    auditData: auditAnalysis.auditData,
    keywordData: keywordIntelligence.keywordData,
    clusters: keywordIntelligence.clusters,
    rankDistribution: keywordIntelligence.rankDistribution,
    
    // Actions
    handleAppImport,
    setActiveTab,
    resetAnalysis,
    refreshAnalysis,
    generateReport,
    askAI,
    
    // Individual analysis access
    auditAnalysis,
    keywordIntelligence
  };
};
