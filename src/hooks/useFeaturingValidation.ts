
import { useState, useEffect } from 'react';
import { 
  FeaturingContent, 
  FeaturingValidationResult,
  APPLE_ALIGNED_PHRASES,
  EDITORIAL_CHAR_LIMIT,
  HELPFUL_INFO_CHAR_LIMIT
} from '@/types/featuring';

const useFeaturingValidation = (content: FeaturingContent) => {
  const [validationResult, setValidationResult] = useState<FeaturingValidationResult>({
    editorial: {
      charCount: 0,
      isValid: false,
      foundPhrases: [],
    },
    helpfulInfo: {
      charCount: 0,
      isValid: false,
    },
    isReadyForSubmission: false,
  });

  useEffect(() => {
    // Editorial validation
    const editorialCharCount = content.editorialDescription.length;
    const foundPhrases = APPLE_ALIGNED_PHRASES.filter(phrase => 
      new RegExp(`\\b${phrase}\\b`, 'i').test(content.editorialDescription)
    );
    const isEditorialValid = editorialCharCount > 0 && editorialCharCount <= EDITORIAL_CHAR_LIMIT && foundPhrases.length > 0;

    // Helpful Info validation
    const helpfulInfoCharCount = content.helpfulInfo.length;
    const isHelpfulInfoValid = helpfulInfoCharCount > 0 && helpfulInfoCharCount <= HELPFUL_INFO_CHAR_LIMIT;

    setValidationResult({
      editorial: {
        charCount: editorialCharCount,
        isValid: isEditorialValid,
        foundPhrases,
      },
      helpfulInfo: {
        charCount: helpfulInfoCharCount,
        isValid: isHelpfulInfoValid,
      },
      isReadyForSubmission: isEditorialValid && isHelpfulInfoValid,
    });

  }, [content]);

  return validationResult;
};

export default useFeaturingValidation;
