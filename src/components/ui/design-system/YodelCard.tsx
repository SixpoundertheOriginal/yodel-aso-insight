
import React from 'react';
import { cn } from '@/lib/utils';

interface YodelCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const YodelCard: React.FC<YodelCardProps> = ({
  variant = 'default',
  padding = 'md',
  children,
  className,
  ...props
}) => {
  const baseClasses = "rounded-xl transition-all duration-200";
  
  const variants = {
    default: "bg-zinc-900 border border-zinc-800",
    elevated: "bg-zinc-900 border border-zinc-800 shadow-lg hover:shadow-xl",
    outlined: "bg-transparent border-2 border-zinc-700 hover:border-zinc-600",
    glass: "bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 shadow-xl"
  };

  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8"
  };

  return (
    <div
      className={cn(
        baseClasses,
        variants[variant],
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface YodelCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const YodelCardHeader: React.FC<YodelCardHeaderProps> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn("mb-4", className)} {...props}>
    {children}
  </div>
);

interface YodelCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const YodelCardContent: React.FC<YodelCardContentProps> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn("", className)} {...props}>
    {children}
  </div>
);

interface YodelCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const YodelCardFooter: React.FC<YodelCardFooterProps> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn("mt-6 pt-4 border-t border-zinc-800", className)} {...props}>
    {children}
  </div>
);
