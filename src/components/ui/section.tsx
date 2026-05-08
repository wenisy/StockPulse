'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Section({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="section"
      className={cn(
        'rounded-xl border bg-bg-elevated shadow-sm transition-colors',
        'border-border-subtle',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
