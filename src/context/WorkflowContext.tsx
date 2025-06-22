
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface WorkflowData {
  sourcecopilotId: string;
  targetCopilotId: string;
  data: any;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
}

export interface WorkflowStep {
  id: string;
  name: string;
  copilotId: string;
  requiredInputs: string[];
  outputMapping: Record<string, string>;
  autoTrigger?: boolean;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  icon: string;
}

interface WorkflowContextType {
  activeWorkflow: WorkflowTemplate | null;
  workflowData: Record<string, any>;
  workflowHistory: WorkflowData[];
  availableTemplates: WorkflowTemplate[];
  startWorkflow: (templateId: string) => void;
  completeStep: (stepId: string, data: any) => void;
  transferToCopilot: (targetCopilotId: string, data: any) => void;
  getWorkflowProgress: () => number;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within WorkflowProvider');
  }
  return context;
};

const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'aso-optimization-flow',
    name: 'Complete ASO Optimization',
    description: 'Gap analysis → Metadata optimization → Featuring strategy → Performance tracking',
    icon: '🔄',
    steps: [
      {
        id: 'gap-analysis',
        name: 'Growth Gap Analysis',
        copilotId: 'growth-gap-finder',
        requiredInputs: ['keyword_data'],
        outputMapping: { 'missed_keywords': 'target_keywords', 'competitor_gaps': 'competitive_insights' },
        autoTrigger: false
      },
      {
        id: 'metadata-optimization',
        name: 'Metadata Optimization',
        copilotId: 'metadata-copilot',
        requiredInputs: ['target_keywords', 'competitive_insights'],
        outputMapping: { 'optimized_metadata': 'metadata_set', 'keyword_strategy': 'keywords' },
        autoTrigger: true
      },
      {
        id: 'featuring-strategy',
        name: 'Featuring Strategy',
        copilotId: 'featuring-assistant',
        requiredInputs: ['metadata_set', 'app_insights'],
        outputMapping: { 'featuring_content': 'submission_ready' },
        autoTrigger: true
      },
      {
        id: 'performance-tracking',
        name: 'Performance Dashboard',
        copilotId: 'reporting-strategist',
        requiredInputs: ['metadata_set', 'submission_ready'],
        outputMapping: {},
        autoTrigger: true
      }
    ]
  },
  {
    id: 'competitive-intelligence-flow',
    name: 'Competitive Intelligence Workflow',
    description: 'Growth gap analysis → CPP strategy → Featuring opportunities',
    icon: '🎯',
    steps: [
      {
        id: 'gap-analysis',
        name: 'Competitor Gap Analysis',
        copilotId: 'growth-gap-finder',
        requiredInputs: ['competitor_data'],
        outputMapping: { 'competitor_insights': 'positioning_data' }
      },
      {
        id: 'cpp-strategy',
        name: 'CPP Strategy Development',
        copilotId: 'cpp-strategy-copilot',
        requiredInputs: ['positioning_data'],
        outputMapping: { 'cpp_themes': 'visual_strategy' },
        autoTrigger: true
      },
      {
        id: 'featuring-alignment',
        name: 'Featuring Alignment',
        copilotId: 'featuring-assistant',
        requiredInputs: ['visual_strategy'],
        outputMapping: { 'featuring_strategy': 'editorial_ready' },
        autoTrigger: true
      }
    ]
  }
];

export const WorkflowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowTemplate | null>(null);
  const [workflowData, setWorkflowData] = useState<Record<string, any>>({});
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowData[]>([]);
  const [availableTemplates] = useState<WorkflowTemplate[]>(workflowTemplates);

  const startWorkflow = (templateId: string) => {
    const template = availableTemplates.find(t => t.id === templateId);
    if (template) {
      setActiveWorkflow(template);
      setWorkflowData({});
      console.log(`🔄 [WORKFLOW] Started workflow: ${template.name}`);
    }
  };

  const completeStep = (stepId: string, data: any) => {
    if (!activeWorkflow) return;

    const step = activeWorkflow.steps.find(s => s.id === stepId);
    if (!step) return;

    // Apply output mapping
    const mappedData = { ...workflowData };
    Object.entries(step.outputMapping).forEach(([outputKey, mappedKey]) => {
      if (data[outputKey]) {
        mappedData[mappedKey] = data[outputKey];
      }
    });

    setWorkflowData(mappedData);

    // Add to history
    const historyEntry: WorkflowData = {
      sourcecopilotId: step.copilotId,
      targetCopilotId: getNextStep(stepId)?.copilotId || 'workflow-complete',
      data: mappedData,
      timestamp: new Date(),
      status: 'completed'
    };

    setWorkflowHistory(prev => [...prev, historyEntry]);

    console.log(`✅ [WORKFLOW] Completed step: ${step.name}`, mappedData);

    // Auto-trigger next step if configured
    const nextStep = getNextStep(stepId);
    if (nextStep?.autoTrigger) {
      setTimeout(() => {
        transferToCopilot(nextStep.copilotId, mappedData);
      }, 1000);
    }
  };

  const getNextStep = (currentStepId: string): WorkflowStep | null => {
    if (!activeWorkflow) return null;
    const currentIndex = activeWorkflow.steps.findIndex(s => s.id === currentStepId);
    return activeWorkflow.steps[currentIndex + 1] || null;
  };

  const transferToCopilot = (targetCopilotId: string, data: any) => {
    console.log(`🔄 [WORKFLOW] Transferring to copilot: ${targetCopilotId}`, data);
    // This will be handled by the AsoAiHub context to actually switch copilots
    window.dispatchEvent(new CustomEvent('workflow-transfer', {
      detail: { targetCopilotId, data }
    }));
  };

  const getWorkflowProgress = (): number => {
    if (!activeWorkflow) return 0;
    const completedSteps = workflowHistory.filter(h => h.status === 'completed').length;
    return (completedSteps / activeWorkflow.steps.length) * 100;
  };

  return (
    <WorkflowContext.Provider value={{
      activeWorkflow,
      workflowData,
      workflowHistory,
      availableTemplates,
      startWorkflow,
      completeStep,
      transferToCopilot,
      getWorkflowProgress
    }}>
      {children}
    </WorkflowContext.Provider>
  );
};
