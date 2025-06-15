
import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { PremiumCard, PremiumCardHeader, PremiumCardContent } from '@/components/ui/design-system/PremiumCard';
import { Heading4, BodySmall } from '@/components/ui/design-system/Typography';
import { APPLE_ALIGNED_PHRASES } from '@/types/featuring';

interface AlignmentMatrixProps {
  foundPhrases: string[];
}

export const AlignmentMatrix: React.FC<AlignmentMatrixProps> = ({ foundPhrases }) => {
  return (
    <PremiumCard variant="elevated" intensity="medium">
      <PremiumCardHeader>
        <Heading4>Strategic Alignment Matrix</Heading4>
        <BodySmall>Mapping your submission to Apple's editorial values.</BodySmall>
      </PremiumCardHeader>
      <PremiumCardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {APPLE_ALIGNED_PHRASES.map(phrase => {
            const isFound = foundPhrases.map(p => p.toLowerCase()).includes(phrase.toLowerCase());
            return (
              <div key={phrase} className="flex items-center space-x-2">
                {isFound ? (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                )}
                <span className={`text-sm ${isFound ? 'text-white' : 'text-zinc-400'}`}>
                  {phrase}
                </span>
              </div>
            );
          })}
        </div>
      </PremiumCardContent>
    </PremiumCard>
  );
};
