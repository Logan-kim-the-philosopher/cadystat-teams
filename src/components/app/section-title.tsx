import * as React from 'react';
import { cn } from '../../lib/utils';

export interface SectionTitleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
}

export function SectionTitle({ className, eyebrow, title, description, children, ...props }: SectionTitleProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)} {...props}>
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">{eyebrow}</p> : null}
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
