
import React, { useState } from 'react';
import useFeaturingValidation from '@/hooks/useFeaturingValidation';
import { FeaturingContent } from '@/types/featuring';
import { ContentEditor } from './ContentEditor';
import { AlignmentMatrix } from './AlignmentMatrix';
import { SubmissionPackager } from './SubmissionPackager';
import { MetricsDashboard } from './MetricsDashboard';
import { Heading2, Body } from '@/components/ui/design-system/Typography';
import { PremiumCard, PremiumCardContent } from '@/components/ui/design-system';

export const FeaturingToolkitCopilot: React.FC = () => {
  const [content, setContent] = useState<FeaturingContent>({
    editorialDescription: '',
    helpfulInfo: '',
  });

  const validationResult = useFeaturingValidation(content);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <Heading2 className="mb-2">Featuring Strategy Toolkit</Heading2>
        <Body className="max-w-3xl mx-auto">
          Create and package compelling Apple App Store featuring submissions with strategic intelligence.
        </Body>
      </div>
      
      <MetricsDashboard />
      
      <PremiumCard variant="glass" intensity="medium">
        <PremiumCardContent>
          <div className="space-y-8">
            <ContentEditor
              content={content}
              setContent={setContent}
              validation={validationResult}
            />
            <AlignmentMatrix foundPhrases={validationResult.editorial.foundPhrases} />
          </div>
        </PremiumCardContent>
      </PremiumCard>
      
      <SubmissionPackager
        content={content}
        isReady={validationResult.isReadyForSubmission}
      />
    </div>
  );
};
