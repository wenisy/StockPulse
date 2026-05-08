'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from './animated-number';

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  format,
  prefix,
  suffix,
  className,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  icon?: LucideIcon;
  delta?: number;
  deltaLabel?: string;
  format?: (n: number) => string;
  prefix?: string;
  suffix?: string;
  className?: string;
  tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'info' | 'brand';
}) {
  const toneBadgeClass =
    tone === 'success'
      ? 'bg-success/10 text-success'
      : tone === 'danger'
        ? 'bg-danger/10 text-danger'
        : tone === 'warning'
          ? 'bg-warning/15 text-warning'
          : tone === 'info'
            ? 'bg-info/10 text-info'
            : tone === 'brand'
              ? 'bg-brand/10 text-brand'
              : 'bg-bg-subtle text-fg-muted';

  const deltaIsUp = delta !== undefined && delta >= 0;
  const deltaColor = delta === undefined
    ? ''
    : deltaIsUp
      ? 'text-success'
      : 'text-danger';

  return (
    <div
      data-slot="stat-card"
      className={cn(
        'group relative rounded-xl border border-border-subtle bg-bg-elevated p-4 md:p-5 shadow-sm',
        'transition-all duration-[var(--motion-base)] ease-[cubic-bezier(0.16,1,0.3,1)]',
        'hover:shadow-md hover:-translate-y-0.5 hover:border-border-default',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
          {label}
        </span>
        {Icon ? (
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              toneBadgeClass,
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
      </div>

      <div className="mt-3 text-2xl font-semibold text-fg md:text-3xl">
        <AnimatedNumber
          value={value}
          format={format}
          prefix={prefix}
          suffix={suffix}
        />
      </div>

      {delta !== undefined ? (
        <div className={cn('mt-2 flex items-center gap-1 text-xs', deltaColor)}>
          {deltaIsUp ? (
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
          )}
          <span className="font-medium tabular-nums">
            {deltaIsUp ? '+' : ''}
            {delta.toFixed(2)}%
          </span>
          {deltaLabel ? <span className="text-fg-subtle">{deltaLabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
