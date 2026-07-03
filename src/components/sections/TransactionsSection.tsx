'use client';

import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Coins, ListFilter, Inbox, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Section } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { CashTransactionForm } from './CashTransactionForm';
import { cn } from '@/lib/utils';
import { usePortfolio } from '@/components/shell/PortfolioContext';

type Row = {
  kind: 'stock' | 'cash';
  type: 'buy' | 'sell' | 'deposit' | 'withdraw';
  date: string;
  year: string;
  stockName?: string;
  shares?: number;
  price?: number;
  amount?: number;
};

export function TransactionsSection() {
  const { portfolioData, trackerState } = usePortfolio();
  const { yearData, formatLargeNumber, years } = portfolioData;
  const { currency } = trackerState;

  const [typeFilter, setTypeFilter] = useState<'all' | 'buy' | 'sell' | 'cash'>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [showCashForm, setShowCashForm] = useState(false);

  const rows: Row[] = useMemo(() => {
    const list: Row[] = [];
    Object.entries(yearData).forEach(([year, yd]) => {
      yd?.stockTransactions?.forEach((t) => {
        list.push({
          kind: 'stock',
          type: (t.type as 'buy' | 'sell') ?? 'buy',
          date: t.date ?? year,
          year,
          stockName: t.stockName,
          shares: t.shares,
          price: t.price,
        });
      });
      yd?.cashTransactions?.forEach((t) => {
        // cashTransaction.type 可能包含 buy/sell（股票联动），我们只关心 deposit/withdraw
        if (t.type === 'deposit' || t.type === 'withdraw') {
          list.push({
            kind: 'cash',
            type: t.type,
            date: t.date ?? year,
            year,
            amount: t.amount,
            stockName: t.stockName,
          });
        }
      });
    });
    return list.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [yearData]);

  const filtered = rows.filter((r) => {
    if (typeFilter === 'buy' && r.type !== 'buy') return false;
    if (typeFilter === 'sell' && r.type !== 'sell') return false;
    if (typeFilter === 'cash' && r.kind !== 'cash') return false;
    if (yearFilter !== 'all' && r.year !== yearFilter) return false;
    return true;
  });

  const typeBadge = (t: Row) => {
    if (t.kind === 'cash') {
      return t.type === 'deposit'
        ? { icon: ArrowDownLeft, label: '存入', tone: 'info' as const }
        : { icon: ArrowUpRight, label: '取出', tone: 'warning' as const };
    }
    return t.type === 'buy'
      ? { icon: ArrowDownLeft, label: '买入', tone: 'success' as const }
      : { icon: ArrowUpRight, label: '卖出', tone: 'danger' as const };
  };

  const toneClass = (tone: 'info' | 'warning' | 'success' | 'danger') => {
    switch (tone) {
      case 'info': return 'bg-info/10 text-info';
      case 'warning': return 'bg-warning/15 text-warning';
      case 'success': return 'bg-success/10 text-success';
      case 'danger': return 'bg-danger/10 text-danger';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="交易流水"
        description={`共 ${filtered.length} 条记录`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowCashForm((v) => !v)}
              className="bg-brand text-brand-fg hover:bg-brand/90"
            >
              <Plus className="h-4 w-4" aria-hidden />
              添加入金
            </Button>
            <ListFilter className="h-4 w-4 text-fg-muted" aria-hidden />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              className="h-8 rounded-md border border-border-default bg-bg-elevated px-2 text-sm text-fg"
            >
              <option value="all">全部类型</option>
              <option value="buy">买入</option>
              <option value="sell">卖出</option>
              <option value="cash">现金</option>
            </select>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="h-8 rounded-md border border-border-default bg-bg-elevated px-2 text-sm text-fg"
            >
              <option value="all">全部年份</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        }
      />

      {showCashForm ? <CashTransactionForm onClose={() => setShowCashForm(false)} /> : null}

      {filtered.length === 0 ? (
        <Section className="p-6">
          <EmptyState
            icon={Inbox}
            title="暂无记录"
            description="当筛选条件下没有交易时，这里会是空的"
          />
        </Section>
      ) : (
        <Section className="divide-y divide-border-subtle">
          {filtered.map((r, idx) => {
            const { icon: Icon, label, tone } = typeBadge(r);
            return (
              <div
                key={idx}
                className="flex items-center gap-3 px-4 py-3 transition-colors duration-[var(--motion-fast)] hover:bg-brand/5"
              >
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', toneClass(tone))}>
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', toneClass(tone))}>
                      {label}
                    </span>
                    <span className="truncate text-sm font-medium text-fg">
                      {r.stockName ?? '现金'}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-fg-subtle">
                    <span>{r.date}</span>
                    <span>·</span>
                    <span>{r.year} 年</span>
                    {r.shares !== undefined ? <span>· {r.shares} 股</span> : null}
                  </div>
                </div>
                <div className="text-right">
                  {r.kind === 'stock' && r.shares !== undefined && r.price !== undefined ? (
                    <>
                      <div className="tabular-nums text-sm font-medium text-fg">
                        {formatLargeNumber(r.shares * r.price, currency)}
                      </div>
                      <div className="tabular-nums text-xs text-fg-subtle">
                        @ {formatLargeNumber(r.price, currency)}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1 tabular-nums text-sm font-medium text-fg">
                      <Coins className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
                      {formatLargeNumber(r.amount ?? 0, currency)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </Section>
      )}
    </div>
  );
}
