'use client';

import { useMemo } from 'react';
import { Edit3, Eye, EyeOff, Trash2 } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { usePortfolio } from '@/components/shell/PortfolioContext';
import { useResolvedColors } from '@/hooks/useResolvedColors';

export function StockHoldingCard({
  stockName,
  onEdit,
}: {
  stockName: string;
  onEdit: (name: string) => void;
}) {
  const { portfolioData, trackerState, callbacks, stockOperations } = usePortfolio();
  const { yearData, formatLargeNumber, years, latestYear } = portfolioData;
  const { currency, hiddenStocks } = trackerState;
  const { toggleStockVisibility } = callbacks;
  const colors = useResolvedColors();

  const hidden = !!hiddenStocks[stockName];

  // 最新年持仓（可能为 null，说明已清仓）
  const latestStock = yearData[latestYear]?.stocks?.find((s) => s.name === stockName);
  const isClosed = !latestStock || latestStock.shares <= 0;

  // 找该股票最后有持仓的年份
  const sortedAsc = [...years].sort((a, b) => parseInt(a) - parseInt(b));
  const lastActiveYear = sortedAsc
    .slice()
    .reverse()
    .find((y) => {
      const stk = yearData[y]?.stocks?.find((s) => s.name === stockName);
      return stk && stk.shares > 0;
    }) ?? null;

  const displayStock = isClosed && lastActiveYear
    ? yearData[lastActiveYear]?.stocks?.find((s) => s.name === stockName)
    : latestStock;

  // 各年市值数据（用于 Recharts）
  const chartData = useMemo(() => {
    return sortedAsc.map((year) => {
      const stk = yearData[year]?.stocks?.find((s) => s.name === stockName);
      const value = stk ? stk.shares * stk.price : 0;
      return { year, value, label: `'${year.slice(2)}` };
    });
  }, [sortedAsc, yearData, stockName]);

  const hasAnyValue = chartData.some((d) => d.value > 0);

  // 兜底：跨所有年份从未有真实持仓（shares>0），直接不渲染
  if (!hasAnyValue && !lastActiveYear) return null;

  // 当前/最后持仓值
  const currentValue = displayStock ? displayStock.shares * displayStock.price : 0;
  const costBasis = displayStock ? displayStock.shares * displayStock.costPrice : 0;
  const returnAmt = currentValue - costBasis;
  const returnPct = costBasis > 0 ? (returnAmt / costBasis) * 100 : 0;
  const isPositive = returnAmt >= 0;

  // 本年 vs 上年涨跌（只对未清仓）
  const latestIdx = sortedAsc.indexOf(latestYear);
  const prevYear = latestIdx > 0 ? sortedAsc[latestIdx - 1] : null;
  const prevEntry = prevYear ? chartData.find((d) => d.year === prevYear) : null;
  const latestEntry = chartData.find((d) => d.year === latestYear);
  const yoyAmt =
    !isClosed && prevEntry && latestEntry
      ? latestEntry.value - prevEntry.value
      : null;
  const yoyPct =
    prevEntry && prevEntry.value > 0 && yoyAmt !== null
      ? (yoyAmt / prevEntry.value) * 100
      : null;

  const fmt = (v: number) => formatLargeNumber(v, currency);

  // Symbol：跨年找第一个有的
  const symbol = sortedAsc
    .slice()
    .reverse()
    .map((y) => yearData[y]?.stocks?.find((s) => s.name === stockName)?.symbol)
    .find(Boolean);

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-border-subtle bg-bg-elevated p-4 shadow-sm',
        'transition-all duration-[var(--motion-base)] ease-[cubic-bezier(0.16,1,0.3,1)]',
        'hover:shadow-md hover:-translate-y-0.5 hover:border-border-default',
        hidden && 'opacity-50',
        isClosed && 'border-dashed',
      )}
    >
      {/* 头部 */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-fg">{stockName}</span>
            {symbol ? (
              <span className="shrink-0 rounded bg-bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-fg-muted">
                {symbol}
              </span>
            ) : null}
            {isClosed ? (
              <span className="shrink-0 rounded-full border border-fg-subtle/30 px-1.5 py-0.5 text-[10px] text-fg-subtle">
                已清仓
              </span>
            ) : null}
          </div>
          {displayStock ? (
            <div className="mt-0.5 text-xs text-fg-muted">
              {isClosed ? `${lastActiveYear} 年末：` : ''}
              {displayStock.shares.toLocaleString()} 股 · 成本 {fmt(displayStock.costPrice)}
            </div>
          ) : (
            <div className="mt-0.5 text-xs text-fg-subtle">无持仓记录</div>
          )}
        </div>

        {/* 操作按钮 */}
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

      {/* 市值 + 收益 */}
      {displayStock ? (
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold text-fg tabular-nums">
              {fmt(currentValue)}
            </div>
            <div
              className={cn(
                'mt-0.5 text-xs font-medium tabular-nums',
                isPositive ? 'text-success' : 'text-danger',
              )}
            >
              {isPositive ? '+' : ''}{fmt(returnAmt)} ({isPositive ? '+' : ''}{returnPct.toFixed(1)}%)
              <span className="ml-1 font-normal text-fg-subtle">vs 成本</span>
            </div>
          </div>
          {yoyAmt !== null && yoyPct !== null ? (
            <div className="text-right">
              <div className={cn('text-xs font-medium tabular-nums', yoyAmt >= 0 ? 'text-success' : 'text-danger')}>
                {yoyAmt >= 0 ? '+' : ''}{fmt(yoyAmt)}
              </div>
              <div className="text-[10px] text-fg-subtle">vs {prevYear}</div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mb-4 text-sm text-fg-subtle">—</div>
      )}

      {/* Recharts 面积图 */}
      {hasAnyValue && chartData.length > 1 ? (
        <div>
          <div className="mb-1 text-[10px] text-fg-subtle">历年市值走势</div>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`fill-${stockName.replace(/[^a-zA-Z0-9]/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isClosed ? colors.fgMuted : colors.brand} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={isClosed ? colors.fgMuted : colors.brand} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={colors.borderSubtle} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: colors.fgMuted, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: colors.bgElevated,
                    border: `1px solid ${colors.borderDefault}`,
                    borderRadius: 6,
                    fontSize: 11,
                    color: colors.fg,
                  }}
                  formatter={(v: number) => [fmt(v), '市值']}
                  labelFormatter={(label: string) => {
                    const entry = chartData.find((d) => d.label === label);
                    const stk = entry ? yearData[entry.year]?.stocks?.find((s) => s.name === stockName) : null;
                    return stk
                      ? `${entry?.year} 年  ${stk.shares} 股 @ ${fmt(stk.price)}`
                      : `${entry?.year} 年  已清仓`;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={isClosed ? colors.fgMuted : colors.brand}
                  strokeWidth={1.5}
                  fill={`url(#fill-${stockName.replace(/[^a-zA-Z0-9]/g, '-')})`}
                  dot={false}
                  activeDot={{ r: 3, fill: isClosed ? colors.fgMuted : colors.brand }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
