
import React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, ArrowRight } from 'lucide-react';
import { YodelButton } from './YodelButton';

interface HeroSectionProps {
  title: string;
  subtitle: string;
  description?: string;
  primaryAction?: {
    text: string;
    onClick: () => void;
  };
  secondaryAction?: {
    text: string;
    onClick: () => void;
  };
  className?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  subtitle,
  description,
  primaryAction,
  secondaryAction,
  className
}) => {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-800/50 to-zinc-900 border border-zinc-700/50",
      className
    )}>
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-yodel-orange/5 via-transparent to-yodel-blue/5" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-yodel-orange/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-yodel-blue/10 rounded-full blur-3xl" />
      
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      
      {/* Content */}
      <div className="relative px-8 py-16 sm:px-12 sm:py-20 lg:px-16 lg:py-24 text-center">
        {/* Sparkle Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-yodel-orange/20 to-yodel-orange/10 border border-yodel-orange/20 backdrop-blur-sm">
          <Sparkles className="w-8 h-8 text-yodel-orange" />
        </div>
        
        {/* Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
          <span className="bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
            {title}
          </span>
        </h1>
        
        {/* Subtitle */}
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-yodel-orange mb-6 leading-relaxed">
          {subtitle}
        </h2>
        
        {/* Description */}
        {description && (
          <p className="text-lg text-zinc-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            {description}
          </p>
        )}
        
        {/* Actions */}
        {(primaryAction || secondaryAction) && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {primaryAction && (
              <YodelButton
                onClick={primaryAction.onClick}
                size="lg"
                rightIcon={<ArrowRight className="w-5 h-5" />}
                className="min-w-[200px] shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                {primaryAction.text}
              </YodelButton>
            )}
            
            {secondaryAction && (
              <YodelButton
                variant="outline"
                onClick={secondaryAction.onClick}
                size="lg"
                className="min-w-[200px] border-zinc-600 text-zinc-300 hover:text-white hover:border-zinc-500"
              >
                {secondaryAction.text}
              </YodelButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
