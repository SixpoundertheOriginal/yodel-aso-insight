
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Workflow, 
  Play, 
  CheckCircle, 
  ArrowRight, 
  Clock,
  Zap
} from 'lucide-react';
import { useWorkflow } from '@/context/WorkflowContext';
import { useAsoAiHub } from '@/context/AsoAiHubContext';

export const WorkflowManager: React.FC = () => {
  const { 
    activeWorkflow, 
    availableTemplates, 
    workflowHistory, 
    startWorkflow, 
    getWorkflowProgress 
  } = useWorkflow();
  
  const { setActiveCopilot } = useAsoAiHub();
  const [showTemplates, setShowTemplates] = useState(!activeWorkflow);

  const handleStartWorkflow = (templateId: string) => {
    startWorkflow(templateId);
    setShowTemplates(false);
    
    // Start with the first step
    const template = availableTemplates.find(t => t.id === templateId);
    if (template?.steps[0]) {
      setActiveCopilot(template.steps[0].copilotId);
    }
  };

  const handleStepClick = (copilotId: string) => {
    setActiveCopilot(copilotId);
  };

  if (showTemplates || !activeWorkflow) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Workflow className="w-5 h-5 text-yodel-orange" />
            <span>ASO Workflow Templates</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-zinc-400 text-sm">
            Choose a workflow template to automate your ASO process with intelligent copilot integration.
          </p>
          
          {availableTemplates.map((template) => (
            <div key={template.id} className="border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{template.icon}</span>
                  <div>
                    <h3 className="text-white font-medium">{template.name}</h3>
                    <p className="text-zinc-400 text-sm">{template.description}</p>
                  </div>
                </div>
                <Button
                  onClick={() => handleStartWorkflow(template.id)}
                  className="bg-yodel-orange hover:bg-yodel-orange/90"
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Start
                </Button>
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-zinc-500">
                <Badge variant="outline" className="text-zinc-400 border-zinc-600">
                  {template.steps.length} steps
                </Badge>
                <span>•</span>
                <span>Auto-optimized workflow</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const progress = getWorkflowProgress();
  const completedSteps = workflowHistory.filter(h => h.status === 'completed').length;

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center space-x-2">
            <span className="text-2xl">{activeWorkflow.icon}</span>
            <div>
              <span>{activeWorkflow.name}</span>
              <p className="text-sm text-zinc-400 font-normal">{activeWorkflow.description}</p>
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTemplates(true)}
            className="text-zinc-400 hover:text-white"
          >
            Change Workflow
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-300">Workflow Progress</span>
            <span className="text-sm font-bold text-yodel-orange">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-zinc-400">
            {completedSteps} of {activeWorkflow.steps.length} steps completed
          </p>
        </div>

        {/* Workflow Steps */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white">Workflow Steps</h3>
          {activeWorkflow.steps.map((step, index) => {
            const isCompleted = workflowHistory.some(h => h.sourcecopilotId === step.copilotId && h.status === 'completed');
            const isCurrent = index === completedSteps;
            const isUpcoming = index > completedSteps;

            return (
              <div key={step.id} className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isCompleted 
                    ? 'bg-green-500 text-white' 
                    : isCurrent 
                    ? 'bg-yodel-orange text-white' 
                    : 'bg-zinc-700 text-zinc-400'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={isCurrent ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleStepClick(step.copilotId)}
                      className={`justify-start p-2 h-auto ${
                        isCurrent ? 'bg-yodel-orange hover:bg-yodel-orange/90' : ''
                      }`}
                    >
                      <span className="font-medium">{step.name}</span>
                    </Button>
                    
                    {step.autoTrigger && (
                      <Badge variant="outline" className="text-xs">
                        <Zap className="w-3 h-3 mr-1" />
                        Auto
                      </Badge>
                    )}
                  </div>
                  
                  {step.requiredInputs.length > 0 && (
                    <p className="text-xs text-zinc-500 mt-1">
                      Requires: {step.requiredInputs.join(', ')}
                    </p>
                  )}
                </div>
                
                {index < activeWorkflow.steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-zinc-600" />
                )}
              </div>
            );
          })}
        </div>

        {/* Recent Activity */}
        {workflowHistory.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">Recent Activity</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {workflowHistory.slice(-3).reverse().map((entry, index) => (
                <div key={index} className="flex items-center space-x-2 text-xs">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-zinc-300">
                    Completed step in {entry.sourcecopilotId}
                  </span>
                  <span className="text-zinc-500">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
