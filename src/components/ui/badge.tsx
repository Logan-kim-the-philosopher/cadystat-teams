import * as React from 'react';
import { cn } from '../../lib/utils';

const badgeVariants = {
  default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
  secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'text-foreground',
  muted: 'border-transparent bg-muted text-muted-foreground',
  blue: 'border-transparent bg-blue-50 text-blue-700',
  amber: 'border-transparent bg-amber-50 text-amber-700',
  red: 'border-transparent bg-red-50 text-red-700',
  green: 'border-transparent bg-emerald-50 text-emerald-700'
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof badgeVariants;
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-ring',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
