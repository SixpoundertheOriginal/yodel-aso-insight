
import React from 'react';
import { cn } from '@/lib/utils';

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
}

export const Heading1: React.FC<TypographyProps> = ({ children, className }) => (
  <h1 className={cn("text-4xl font-bold text-white leading-tight tracking-tight", className)}>
    {children}
  </h1>
);

export const Heading2: React.FC<TypographyProps> = ({ children, className }) => (
  <h2 className={cn("text-3xl font-semibold text-white leading-tight", className)}>
    {children}
  </h2>
);

export const Heading3: React.FC<TypographyProps> = ({ children, className }) => (
  <h3 className={cn("text-2xl font-semibold text-white leading-snug", className)}>
    {children}
  </h3>
);

export const Heading4: React.FC<TypographyProps> = ({ children, className }) => (
  <h4 className={cn("text-xl font-medium text-white leading-snug", className)}>
    {children}
  </h4>
);

export const Body: React.FC<TypographyProps> = ({ children, className }) => (
  <p className={cn("text-base text-zinc-300 leading-relaxed", className)}>
    {children}
  </p>
);

export const BodyLarge: React.FC<TypographyProps> = ({ children, className }) => (
  <p className={cn("text-lg text-zinc-300 leading-relaxed", className)}>
    {children}
  </p>
);

export const BodySmall: React.FC<TypographyProps> = ({ children, className }) => (
  <p className={cn("text-sm text-zinc-400 leading-normal", className)}>
    {children}
  </p>
);

export const Caption: React.FC<TypographyProps> = ({ children, className }) => (
  <span className={cn("text-xs text-zinc-500 leading-normal", className)}>
    {children}
  </span>
);

export const Label: React.FC<TypographyProps & React.ComponentPropsWithoutRef<'label'>> = ({ children, className, ...props }) => (
  <label {...props} className={cn("text-sm font-medium text-zinc-300 leading-normal", className)}>
    {children}
  </label>
);
