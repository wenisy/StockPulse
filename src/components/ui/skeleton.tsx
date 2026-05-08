'use client';

import { cn } from '@/lib/utils';

export function Skeleton({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-bg-subtle', className)}
      {...rest}
    />
  );
}
