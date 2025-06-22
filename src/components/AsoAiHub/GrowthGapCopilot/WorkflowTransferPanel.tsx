
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Zap, Target, Star } from 'lucide-react';
import { useWorkflow } from '@/context/WorkflowContext';
import { useAsoAiHub } from '@/context/AsoAiHubContext';

interface WorkflowTransferPanelProps {
  analysisResults?: any;
  onTransfer: (targetCopilot: string, data: any) => void;
}

export const WorkflowTransferPanel: React.FC<WorkflowTransferPanelProps> = ({
  analysisResults,
  onTransfer
}) => {
  const { activeWorkflow, completeStep, transferToCopilot } = useWorkflow();
  const { setActiveCopilot } = useAsoAiHub();

  const transferOptions = [
    {
      id: 'metadata-copilot',
      name: 'Metadata Optimization',
      description: 'Use gap analysis to create optimized metadata',
      icon: '📝',
      color: 'bg-blue-500',
      dataMapping: {
        missed_keywords: analysisResults?.missedKeywords || [],
        competitor_insights: analysisResults?.competitorGaps || [],
        priority_terms: analysisResults?.highImpactKeywords || []
      }
    },
    {
      id: 'featuring-assistant',
      name: 'Featuring Strategy',
      description: 'Create featuring content based on opportunity gaps',
      icon: '⭐',
      color: 'bg-purple-500',
      dataMapping: {
        positioning_insights: analysisResults?.positioningOpportunities || [],
        competitive_advantages: analysisResults?.uniqueStrengths || []
      }
    },
    {
      id: 'cpp-strategy-copilot',
      name: 'CPP Strategy',
      description: 'Design Custom Product Pages targeting missed opportunities',
      icon: '🎯',
      color: 'bg-green-500',
      dataMapping: {
        target_segments: analysisResults?.audienceGaps || [],
        conversion_opportunities: analysisResults?.conversionGaps || []
      }
    }
  ];

  const handleTransfer = (option: typeof transferOptions[0]) => {
    console.log(`🔄 [TRANSFER] Sending data to ${option.name}:`, option.dataMapping);
    
    // Complete workflow step if active
    if (activeWorkflow) {
      completeStep('gap-analysis', option.dataMapping);
    }
    
    // Transfer to target copilot
    transferToCopilot(option.id, option.dataMapping);
    onTransfer(option.id, option.dataMapping);
    
    // Switch to target copilot
    setTimeout(() => {
      setActiveCopilot(option.id);
    }, 500);
  };

  if (!analysisResults) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="text-center py-6">
          <Target className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-zinc-400 text-sm">
            Complete an analysis to unlock workflow automation
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Zap className="w-5 h-5 text-yodel-orange" />
          <span>Continue Workflow</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-zinc-400 text-sm">
          Take your gap analysis results to the next step in your ASO optimization workflow.
        </p>

        {activeWorkflow && (
          <div className="bg-yodel-orange/10 border border-yodel-orange/20 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{activeWorkflow.icon}</span>
              <div>
                <p className="text-yodel-orange font-medium text-sm">{activeWorkflow.name}</p>
                <p className="text-yodel-orange/80 text-xs">Active workflow detected</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {transferOptions.map((option) => (
            <div key={option.id} className="border border-zinc-700 rounded-lg p-3 hover:border-zinc-600 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 ${option.color} rounded-lg flex items-center justify-center text-white`}>
                    <span className="text-sm">{option.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-sm">{option.name}</h3>
                    <p className="text-zinc-400 text-xs">{option.description}</p>
                  </div>
                </div>
                <Button
                  onClick={() => handleTransfer(option)}
                  size="sm"
                  className="bg-yodel-orange hover:bg-yodel-orange/90"
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              
              {Object.keys(option.dataMapping).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.keys(option.dataMapping).map((key, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {key.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-xs text-zinc-500 text-center">
          💡 Transfers will automatically populate relevant fields in the target copilot
        </div>
      </CardContent>
    </Card>
  );
};
