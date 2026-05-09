'use client';

import { ArrowDownLeft, ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react';
import { Section } from '@/components/ui/section';
import { cn } from '@/lib/utils';

type RowProps = {
  label: string;
  amount: number | null;
  pct: number | null;
  fmt: (v: number) => string;
  hint?: string;
};

function ReturnRow({ label, amount, pct, fmt, hint }: RowProps) {
  const empty = amount === null || pct === null;
  const positive = !empty && (pct as number) >= 0;
  return (
    <div className="flex items-baseline justify-between">
      <div className="flex flex-col">
        <span className="text-xs text-fg-subtle">{label}</span>
        {hint ? <span className="text-[10px] text-fg-subtle">{hint}</span> : null}
      </div>
      <div className="text-right">
        {empty ? (
          <span className="text-sm text-fg-subtle">—</span>
        ) : (
          <>
            <div
              className={cn(
                'flex items-center justify-end gap-1 text-sm font-medium tabular-nums',
                positive ? 'text-success' : 'text-danger',
              )}
            >
              {positive ? (
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              ) : (
                <ArrowDownRight className="h-3 w-3" aria-hidden />
              )}
              <span>
                {positive ? '+' : ''}
                {fmt(amount as number)}
              </span>
            </div>
            <div
              className={cn(
                'text-xs tabular-nums',
                positive ? 'text-success/80' : 'text-danger/80',
              )}
            >
              {positive ? '+' : ''}
              {(pct as number).toFixed(2)}%
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export type YearCardProps = {
  year: string;
  /** 年末总资产（市值 + 现金） */
  totalAtYearEnd: number;
  /** 含入金的总增长（金额 / 百分比），首年为 null */
  totalGrowthAmount: number | null;
  totalGrowthPct: number | null;
  /** 不含本年入金的纯投资回报（金额 / 百分比），首年为 null */
  netReturnAmount: number | null;
  netReturnPct: number | null;
  /** 本年新增入金净额（可正可负） */
  netDeposits: number;
  fmt: (v: number) => string;
  onClick?: () => void;
};

export function YearCard({
  year,
  totalAtYearEnd,
  totalGrowthAmount,
  totalGrowthPct,
  netReturnAmount,
  netReturnPct,
  netDeposits,
  fmt,
  onClick,
}: YearCardProps) {
  const isFirstYear = totalGrowthPct === null;

  return (
    <Section
      className={cn(
        'group relative cursor-pointer p-4 transition-all duration-[var(--motion-base)] ease-[cubic-bezier(0.16,1,0.3,1)]',
        'hover:shadow-md hover:-translate-y-0.5 hover:border-border-default',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
      )}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* 头部：年份 + 首年标记 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/10 text-brand">
            <Wallet className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-fg">{year} 年</span>
        </div>
        {isFirstYear ? (
          <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[10px] text-fg-subtle">
            首年
          </span>
        ) : null}
      </div>

      {/* 主数值：年末总资产 */}
      <div className="mb-4">
        <div className="text-xs text-fg-subtle">年末总资产</div>
        <div className="mt-1 text-2xl font-semibold text-fg tabular-nums">
          {fmt(totalAtYearEnd)}
        </div>
      </div>

      {/* 两个收益指标 */}
      <div className="space-y-2">
        <ReturnRow
          label="总增长"
          hint="含入金"
          amount={totalGrowthAmount}
          pct={totalGrowthPct}
          fmt={fmt}
        />
        <ReturnRow
          label="纯收益"
          hint="扣除本年入金"
          amount={netReturnAmount}
          pct={netReturnPct}
          fmt={fmt}
        />
      </div>

      {/* 底部：年内入金 */}
      {netDeposits !== 0 ? (
        <div className="mt-3 flex items-center gap-1 border-t border-border-subtle pt-2 text-xs text-fg-muted">
          {netDeposits > 0 ? (
            <ArrowDownLeft className="h-3 w-3 text-info" aria-hidden />
          ) : (
            <ArrowUpRight className="h-3 w-3 text-warning" aria-hidden />
          )}
          <span>本年{netDeposits > 0 ? '入金' : '取出'}</span>
          <span className="ml-auto tabular-nums">{fmt(Math.abs(netDeposits))}</span>
        </div>
      ) : null}
    </Section>
  );
}
