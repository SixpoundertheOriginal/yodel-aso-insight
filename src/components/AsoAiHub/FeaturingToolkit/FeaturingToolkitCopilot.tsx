
import React, { useState } from 'react';
import { FeaturingContent } from '@/types/featuring';
import { FeaturingNav } from './FeaturingNav';
import { SmartEditor } from './SmartEditor';
import { StrategyAlignmentPanel } from './StrategyAlignmentPanel';
import { ValueImpactTracker } from './ValueImpactTracker';
import { EnhancedExportPanel } from './EnhancedExportPanel';
import { MetricsDashboard } from './MetricsDashboard';
import useFeaturingValidation from '@/hooks/useFeaturingValidation';

interface StrategyAlignment {
  humanCentered: boolean;
  platformInnovation: boolean;
  creativeUtility: boolean;
  educationalImpact: boolean;
  uniqueDifferentiation: boolean;
}

interface Metrics {
  conversionLift: number;
  retentionIncrease: number;
  engagementBoost: number;
}

interface Differentiator {
  id: string;
  text: string;
  type: 'exclusive' | 'first' | 'award' | 'partnership';
}

export const FeaturingToolkitCopilot: React.FC = () => {
  const [activeTab, setActiveTab] = useState('editor');
  const [content, setContent] = useState<FeaturingContent>({
    editorialDescription: '',
    helpfulInfo: '',
  });
  const [editorMode, setEditorMode] = useState<'raw' | 'apple' | 'brand'>('raw');
  const [alignment, setAlignment] = useState<StrategyAlignment>({
    humanCentered: false,
    platformInnovation: false,
    creativeUtility: false,
    educationalImpact: false,
    uniqueDifferentiation: false,
  });
  const [metrics, setMetrics] = useState<Metrics>({
    conversionLift: 0,
    retentionIncrease: 0,
    engagementBoost: 0,
  });
  const [differentiators, setDifferentiators] = useState<Differentiator[]>([]);

  const validationResult = useFeaturingValidation(content);

  const handleSave = () => {
    console.log('Saving featuring project...', { content, alignment, metrics, differentiators });
    // Implement save logic
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⭐</div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Welcome to Featuring Strategy Toolkit
              </h2>
              <p className="text-zinc-400 max-w-2xl mx-auto">
                Create compelling Apple App Store featuring submissions with strategic intelligence. 
                Follow our proven workflow to maximize your chances of editorial featuring.
              </p>
            </div>
            <MetricsDashboard />
          </div>
        );

      case 'editor':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <SmartEditor
                value={content.editorialDescription}
                onChange={(value) => setContent(prev => ({ ...prev, editorialDescription: value }))}
                placeholder="Craft your editorial description that tells Apple's editors why your app deserves featuring..."
                maxLength={1000}
                label="Editorial Description"
                mode={editorMode}
                onModeChange={setEditorMode}
              />
              
              <SmartEditor
                value={content.helpfulInfo}
                onChange={(value) => setContent(prev => ({ ...prev, helpfulInfo: value }))}
                placeholder="Provide helpful context for Apple's review team..."
                maxLength={500}
                label="Helpful Info for Apple Review Team"
                mode={editorMode}
                onModeChange={setEditorMode}
              />
            </div>
            
            <div className="space-y-4">
              <StrategyAlignmentPanel
                alignment={alignment}
                onAlignmentChange={setAlignment}
                content={content.editorialDescription + ' ' + content.helpfulInfo}
              />
            </div>
          </div>
        );

      case 'strategy':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StrategyAlignmentPanel
              alignment={alignment}
              onAlignmentChange={setAlignment}
              content={content.editorialDescription + ' ' + content.helpfulInfo}
            />
            <div className="space-y-4">
              <ValueImpactTracker
                metrics={metrics}
                differentiators={differentiators}
                onMetricsChange={setMetrics}
                onDifferentiatorsChange={setDifferentiators}
              />
            </div>
          </div>
        );

      case 'submission':
        return (
          <div className="space-y-6">
            <div className="bg-zinc-800/50 p-6 rounded-lg border border-zinc-700">
              <h3 className="text-xl font-bold text-white mb-4">Submission Checklist</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    checked={validationResult.editorial.isValid}
                    readOnly
                    className="text-yodel-orange" 
                  />
                  <span className={validationResult.editorial.isValid ? 'text-green-400' : 'text-red-400'}>
                    Editorial description complete and within character limit
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    checked={validationResult.helpfulInfo.isValid}
                    readOnly
                    className="text-yodel-orange" 
                  />
                  <span className={validationResult.helpfulInfo.isValid ? 'text-green-400' : 'text-red-400'}>
                    Helpful info provided for review team
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    checked={Object.values(alignment).some(Boolean)}
                    readOnly
                    className="text-yodel-orange" 
                  />
                  <span className={Object.values(alignment).some(Boolean) ? 'text-green-400' : 'text-red-400'}>
                    Strategic alignment with Apple's editorial pillars
                  </span>
                </div>
              </div>
            </div>
            
            <EnhancedExportPanel
              content={content}
              isReady={validationResult.isReadyForSubmission}
            />
          </div>
        );

      case 'export':
        return (
          <div className="space-y-6">
            <EnhancedExportPanel
              content={content}
              isReady={validationResult.isReadyForSubmission}
            />
          </div>
        );

      default:
        return <div>Tab content not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <FeaturingNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        projectName="Untitled Featuring Project"
        onSave={handleSave}
      />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {renderTabContent()}
      </div>
    </div>
  );
};
