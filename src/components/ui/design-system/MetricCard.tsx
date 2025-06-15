
import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    period: string;
    trend: 'up' | 'down';
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  variant = 'default',
  className
}) => {
  const variantStyles = {
    default: "from-zinc-900 to-zinc-800/50 border-zinc-700/50",
    success: "from-green-900/20 to-zinc-900 border-green-700/30",
    warning: "from-yellow-900/20 to-zinc-900 border-yellow-700/30",
    error: "from-red-900/20 to-zinc-900 border-red-700/30"
  };

  const changeColors = {
    up: "text-green-400 bg-green-500/10",
    down: "text-red-400 bg-red-500/10"
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl bg-gradient-to-br border backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-xl group",
      variantStyles[variant],
      className
    )}>
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-yodel-orange/5 to-yodel-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
            {title}
          </h3>
          {icon && (
            <div className="p-2 rounded-lg bg-yodel-orange/10 text-yodel-orange">
              {icon}
            </div>
          )}
        </div>
        
        {/* Value */}
        <div className="mb-4">
          <div className="text-3xl font-bold text-white mb-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
        </div>
        
        {/* Change Indicator */}
        {change && (
          <div className={cn(
            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
            changeColors[change.trend]
          )}>
            {change.trend === 'up' ? (
              <ArrowUpRight className="w-3 h-3 mr-1" />
            ) : (
              <ArrowDownRight className="w-3 h-3 mr-1" />
            )}
            {Math.abs(change.value)}% vs {change.period}
          </div>
        )}
      </div>
      
      {/* Subtle border glow */}
      <div className="absolute inset-0 rounded-2xl border border-white/5 group-hover:border-white/10 transition-colors duration-300" />
    </div>
  );
};
