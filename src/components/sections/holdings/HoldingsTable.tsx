'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Edit3, EyeOff, Eye, Inbox, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { usePortfolio } from '@/components/shell/PortfolioContext';
import type { Stock } from '@/types/stock';

type SortKey = 'name' | 'shares' | 'costPrice' | 'price' | 'marketValue' | 'returnPct';
type SortDir = 'asc' | 'desc';

function SortTh({
  k,
  label,
  align = 'left',
  sortKey,
  sortDir,
  onSort,
}: {
  k: SortKey;
  label: string;
  align?: 'left' | 'right';
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  return (
    <th
      scope="col"
      className={cn(
        'sticky top-0 z-10 cursor-pointer select-none bg-bg-elevated/95 px-3 py-2.5 text-xs font-medium text-fg-muted backdrop-blur-sm',
        align === 'right' ? 'text-right' : 'text-left',
      )}
      onClick={() => onSort(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k ? (
          sortDir === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : null}
      </span>
    </th>
  );
}

export function HoldingsTable({ onEdit }: { onEdit: (stockName: string) => void }) {
  const { portfolioData, trackerState, callbacks, stockOperations } = usePortfolio();
  const { yearData, formatLargeNumber, latestYear } = portfolioData;
  const { currency, hiddenStocks } = trackerState;
  const { toggleStockVisibility } = callbacks;

  const [sortKey, setSortKey] = useState<SortKey>('marketValue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const rows = useMemo(() => {
    const stocks: Stock[] = yearData[latestYear]?.stocks ?? [];
    const enriched = stocks
      .filter((s) => s.shares > 0)
      .map((s) => {
        const marketValue = s.shares * s.price;
        const cost = s.shares * s.costPrice;
        const ret = marketValue - cost;
        const returnPct = cost > 0 ? (ret / cost) * 100 : 0;
        return { ...s, marketValue, cost, ret, returnPct };
      });
    enriched.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const av = a[sortKey as keyof typeof a];
      const bv = b[sortKey as keyof typeof b];
      if (typeof av === 'string' && typeof bv === 'string')
        return av.localeCompare(bv) * dir;
      return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
    });
    return enriched;
  }, [yearData, latestYear, sortKey, sortDir]);

  const setSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="当年还没有持仓"
        description={`添加 ${latestYear} 年的第一笔交易，开始追踪你的组合`}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle">
      <div className="max-h-[calc(100dvh-22rem)] overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <SortTh k="name" label="股票" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
              <SortTh k="shares" label="持仓" align="right" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
              <SortTh k="costPrice" label="成本" align="right" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
              <SortTh k="price" label="现价" align="right" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
              <SortTh k="marketValue" label="市值" align="right" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
              <SortTh k="returnPct" label="收益" align="right" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
              <th className="sticky top-0 z-10 bg-bg-elevated/95 px-3 py-2.5 text-right backdrop-blur-sm"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const hidden = !!hiddenStocks[r.name];
              return (
                <tr
                  key={r.id || r.name}
                  className={cn(
                    'group border-b border-border-subtle/70 transition-colors duration-[var(--motion-fast)]',
                    'hover:bg-brand/5',
                    hidden && 'opacity-50',
                  )}
                >
                  <td className="px-3 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-fg">{r.name}</span>
                      {r.symbol ? (
                        <span className="text-xs text-fg-subtle">{r.symbol}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-fg">
                    {r.shares.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-fg-muted">
                    {formatLargeNumber(r.costPrice, currency)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-fg">
                    {formatLargeNumber(r.price, currency)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums font-medium text-fg">
                    {formatLargeNumber(r.marketValue, currency)}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-3 text-right tabular-nums font-medium',
                      r.ret >= 0 ? 'text-success' : 'text-danger',
                    )}
                  >
                    <div className="flex flex-col items-end">
                      <span>
                        {r.ret >= 0 ? '+' : ''}
                        {formatLargeNumber(r.ret, currency)}
                      </span>
                      <span className="text-xs opacity-80">
                        {r.returnPct >= 0 ? '+' : ''}
                        {r.returnPct.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => toggleStockVisibility(r.name)}
                        aria-label={hidden ? '显示' : '隐藏'}
                        title={hidden ? '显示' : '隐藏'}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-bg-subtle hover:text-fg"
                      >
                        {hidden ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(r.name)}
                        aria-label="编辑"
                        title="编辑"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-brand/10 hover:text-brand"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => stockOperations.handleDeleteStock(r.name)}
                        aria-label="删除"
                        title="删除"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
