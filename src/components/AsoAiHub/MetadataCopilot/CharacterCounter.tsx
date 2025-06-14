
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface CharacterCounterProps {
  current: number;
  limit: number;
  label: string;
  className?: string;
}

export const CharacterCounter: React.FC<CharacterCounterProps> = ({
  current,
  limit,
  label,
  className = ''
}) => {
  const percentage = (current / limit) * 100;
  const isWarning = percentage > 80;
  const isError = percentage > 100;

  const getColorClass = () => {
    if (isError) return 'text-red-400';
    if (isWarning) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getProgressColor = () => {
    if (isError) return 'bg-red-500';
    if (isWarning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <span className="text-sm text-zinc-300">{label}</span>
        <span className={`text-sm font-medium ${getColorClass()}`}>
          {current}/{limit}
        </span>
      </div>
      
      <div className="relative">
        <Progress 
          value={Math.min(percentage, 100)} 
          className="h-2 bg-zinc-700"
        />
        <div 
          className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      {isError && (
        <p className="text-xs text-red-400">
          Exceeds limit by {current - limit} character{current - limit > 1 ? 's' : ''}
        </p>
      )}
      {isWarning && !isError && (
        <p className="text-xs text-yellow-400">
          Close to limit ({limit - current} remaining)
        </p>
      )}
    </div>
  );
};
