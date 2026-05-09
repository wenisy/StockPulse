'use client';

import { useMemo, useState } from 'react';
import { Edit3, Eye, EyeOff, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortfolio } from '@/components/shell/PortfolioContext';
import { useResolvedColors } from '@/hooks/useResolvedColors';

/**
 * 单只股票的持仓卡片，展示历年市值迷你柱状图 + 当前年汇总。
 */
export function StockHoldingCard({
  stockName,
  onEdit,
}: {
  stockName: string;
  onEdit: (name: string) => void;
}) {
  const { portfolioData, chartData, trackerState, callbacks, stockOperations } =
    usePortfolio();
  const { yearData, formatLargeNumber, years, latestYear } = portfolioData;
  const { lineChartData } = chartData;
  const { currency, hiddenStocks } = trackerState;
  const { toggleStockVisibility } = callbacks;
  const colors = useResolvedColors();

  const hidden = !!hiddenStocks[stockName];
  const [hoverYear, setHoverYear] = useState<string | null>(null);

  // 当前年持仓信息
  const latestStock = yearData[latestYear]?.stocks?.find((s) => s.name === stockName);

  // 各年市值（从 lineChartData 提取该股票）
  const yearlyValues = useMemo(() => {
    const sorted = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    return sorted.map((year) => {
      const entry = lineChartData.find((d) => d.year === year);
      const value = entry ? (Number(entry[stockName]) || 0) : 0;
      return { year, value };
    });
  }, [years, lineChartData, stockName]);

  const maxValue = Math.max(...yearlyValues.map((d) => d.value), 1);

  const fmt = (v: number) => formatLargeNumber(v, currency);

  if (!latestStock && yearlyValues.every((d) => d.value === 0)) return null;

  const currentValue = latestStock
    ? latestStock.shares * latestStock.price
    : 0;
  const costBasis = latestStock
    ? latestStock.shares * latestStock.costPrice
    : 0;
  const returnAmt = currentValue - costBasis;
  const returnPct = costBasis > 0 ? (returnAmt / costBasis) * 100 : 0;
  const isPositive = returnAmt >= 0;

  // 找上一年值，算本年涨跌
  const sortedYears = [...years].sort((a, b) => parseInt(a) - parseInt(b));
  const latestIdx = sortedYears.indexOf(latestYear);
  const prevYear = latestIdx > 0 ? sortedYears[latestIdx - 1] : null;
  const prevValue = prevYear
    ? (lineChartData.find((d) => d.year === prevYear)?.[stockName] as number) || 0
    : null;
  const yoyAmt = prevValue !== null ? currentValue - prevValue : null;
  const yoyPct = prevValue ? ((currentValue - prevValue) / prevValue) * 100 : null;

  const displayYear = hoverYear ?? latestYear;
  const displayEntry = lineChartData.find((d) => d.year === displayYear);
  const displayValue = displayEntry ? (Number(displayEntry[stockName]) || 0) : 0;
  const displayShares = yearData[displayYear]?.stocks?.find((s) => s.name === stockName)?.shares ?? 0;
  const displayPrice = yearData[displayYear]?.stocks?.find((s) => s.name === stockName)?.price ?? 0;

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-border-subtle bg-bg-elevated p-4 shadow-sm',
        'transition-all duration-[var(--motion-base)] ease-[cubic-bezier(0.16,1,0.3,1)]',
        'hover:shadow-md hover:-translate-y-0.5 hover:border-border-default',
        hidden && 'opacity-50',
      )}
    >
      {/* 头部：股票名 + 操作按钮 */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-fg">
              {stockName}
            </span>
            {latestStock?.symbol ? (
              <span className="shrink-0 rounded bg-bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-fg-muted">
                {latestStock.symbol}
              </span>
            ) : null}
          </div>
          {latestStock ? (
            <div className="mt-0.5 text-xs text-fg-muted">
              {latestStock.shares.toLocaleString()} 股 · 成本{' '}
              {fmt(latestStock.costPrice)}
            </div>
          ) : (
            <div className="mt-0.5 text-xs text-fg-subtle">已清仓</div>
          )}
        </div>

        {/* 操作按钮组 */}
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => toggleStockVisibility(stockName)}
            aria-label={hidden ? '显示' : '隐藏'}
            className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-bg-subtle hover:text-fg"
          >
            {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => onEdit(stockName)}
            aria-label="编辑"
            className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-brand/10 hover:text-brand"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => stockOperations.handleDeleteStock(stockName)}
            aria-label="删除"
            className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 当前市值 + 收益 */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="text-2xl font-semibold text-fg tabular-nums">
            {fmt(currentValue)}
          </div>
          <div
            className={cn(
              'mt-0.5 text-xs tabular-nums font-medium',
              isPositive ? 'text-success' : 'text-danger',
            )}
          >
            {isPositive ? '+' : ''}
            {fmt(returnAmt)} ({isPositive ? '+' : ''}{returnPct.toFixed(1)}%)
            <span className="ml-1 text-fg-subtle font-normal">相对成本</span>
          </div>
        </div>
        {yoyAmt !== null && yoyPct !== null ? (
          <div className="text-right">
            <div
              className={cn(
                'text-xs font-medium tabular-nums',
                yoyAmt >= 0 ? 'text-success' : 'text-danger',
              )}
            >
              {yoyAmt >= 0 ? '+' : ''}{fmt(yoyAmt)}
            </div>
            <div className="text-[10px] text-fg-subtle">vs {prevYear}</div>
          </div>
        ) : null}
      </div>

      {/* 历年迷你柱状图 */}
      {yearlyValues.length > 1 ? (
        <div className="space-y-1">
          <div className="text-[10px] text-fg-subtle">历年市值走势</div>
          <div className="flex items-end gap-1" style={{ height: 48 }}>
            {yearlyValues.map(({ year, value }) => {
              const isHoverYear = hoverYear === year;
              const isLatest = year === latestYear;
              const heightPct = maxValue > 0 ? (value / maxValue) * 100 : 0;
              const barColor = value > 0
                ? isLatest
                  ? colors.brand
                  : isHoverYear
                    ? colors.info
                    : `${colors.brand}60`
                : colors.borderDefault;

              return (
                <div
                  key={year}
                  className="group/bar relative flex flex-1 flex-col items-center justify-end gap-0.5"
                  onMouseEnter={() => setHoverYear(year)}
                  onMouseLeave={() => setHoverYear(null)}
                >
                  {/* 柱体 */}
                  <div
                    className="w-full rounded-t-sm transition-all duration-[var(--motion-fast)]"
                    style={{
                      height: `${Math.max(heightPct, value > 0 ? 8 : 3)}%`,
                      backgroundColor: barColor,
                    }}
                  />
                  {/* 年份标签 */}
                  <div
                    className={cn(
                      'text-[9px] tabular-nums transition-colors',
                      isLatest ? 'text-brand font-semibold' : 'text-fg-subtle',
                      isHoverYear && 'text-fg',
                    )}
                  >
                    {year.slice(2)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* hover 时显示对应年份数据 */}
          {hoverYear ? (
            <div className="flex items-center justify-between rounded-md bg-bg-subtle px-2 py-1 text-xs">
              <span className="text-fg-muted">{hoverYear} 年</span>
              <span className="tabular-nums font-medium text-fg">{fmt(displayValue)}</span>
              {displayShares > 0 ? (
                <span className="text-fg-subtle">
                  {displayShares} 股 @ {fmt(displayPrice)}
                </span>
              ) : (
                <span className="text-fg-subtle">未持仓</span>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-md bg-bg-subtle px-2 py-1 text-xs opacity-0 pointer-events-none">
              <span>–</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
