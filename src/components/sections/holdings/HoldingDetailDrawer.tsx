'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePortfolio } from '@/components/shell/PortfolioContext';

export function HoldingDetailDrawer({
  stockName,
  onClose,
}: {
  stockName: string | null;
  onClose: () => void;
}) {
  const { stockOperations, portfolioData, trackerState } = usePortfolio();
  const { handleEditRow, handleSaveRow, handleInputChange, editedRowData, editingStockName } =
    stockOperations;
  const { yearData, formatLargeNumber, years } = portfolioData;
  const { currency } = trackerState;

  useEffect(() => {
    if (stockName && editingStockName !== stockName) {
      handleEditRow(stockName);
    }
  }, [stockName, editingStockName, handleEditRow]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const open = !!stockName;

  // 取最新年作为主展示
  const latestYear = years[0];
  const stockLatest = stockName
    ? yearData[latestYear]?.stocks?.find((s) => s.name === stockName)
    : null;

  return (
    <>
      {/* backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-[var(--motion-base)]',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="持仓详情"
        className={cn(
          'fixed right-0 top-0 z-50 flex h-dvh w-full max-w-md flex-col border-l border-border-subtle bg-bg-elevated shadow-xl transition-transform duration-[var(--motion-base)] ease-[cubic-bezier(0.16,1,0.3,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-fg">{stockName ?? '—'}</h2>
            {stockLatest?.symbol ? (
              <p className="text-xs text-fg-subtle">{stockLatest.symbol}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-bg-subtle"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4">
          {stockLatest ? (
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-bg-subtle p-3">
              <div>
                <div className="text-xs text-fg-subtle">当前持仓</div>
                <div className="text-base font-semibold tabular-nums text-fg">
                  {stockLatest.shares}
                </div>
              </div>
              <div>
                <div className="text-xs text-fg-subtle">市值</div>
                <div className="text-base font-semibold tabular-nums text-fg">
                  {formatLargeNumber(stockLatest.shares * stockLatest.price, currency)}
                </div>
              </div>
            </div>
          ) : null}

          <h3 className="mb-2 text-sm font-medium text-fg">按年编辑</h3>
          <div className="space-y-3">
            {years.map((year) => {
              const y = editedRowData?.[year];
              if (!y) return null;
              return (
                <div key={year} className="rounded-lg border border-border-subtle p-3">
                  <div className="mb-2 text-xs font-semibold text-fg-muted">{year}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-fg-subtle">持仓</span>
                      <Input
                        value={y.quantity}
                        onChange={(e) => handleInputChange(year, 'quantity', e.target.value)}
                        className="bg-bg border-border-default"
                        inputMode="decimal"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-fg-subtle">现价</span>
                      <Input
                        value={y.unitPrice}
                        onChange={(e) => handleInputChange(year, 'unitPrice', e.target.value)}
                        className="bg-bg border-border-default"
                        inputMode="decimal"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-fg-subtle">成本</span>
                      <Input
                        value={y.costPrice}
                        onChange={(e) => handleInputChange(year, 'costPrice', e.target.value)}
                        className="bg-bg border-border-default"
                        inputMode="decimal"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-fg-subtle">Symbol</span>
                      <Input
                        value={y.symbol}
                        onChange={(e) => handleInputChange(year, 'symbol', e.target.value)}
                        className="bg-bg border-border-default"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border-subtle p-3">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={() => {
              if (stockName) handleSaveRow(stockName);
              onClose();
            }}
            className="bg-brand text-brand-fg hover:bg-brand/90"
          >
            保存
          </Button>
        </footer>
      </aside>
    </>
  );
}
