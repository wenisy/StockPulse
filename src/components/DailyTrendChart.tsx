'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';
import { useCalendarData, YearlyMonthSummary } from '@/hooks/useCalendarData';
import { useResolvedColors } from '@/hooks/useResolvedColors';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyTrendChartProps {
  currency: string;
  formatLargeNumber: (value: number, currency: string) => string;
}

interface DailyChartPoint {
  date: string;
  label: string;
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
}

interface MonthlyChartPoint {
  month: string;   // '01'..'12'
  label: string;   // '1月'..'12月'
  totalGainPercent: number;
  totalGain: number;
}

type ViewMode = 'daily' | 'monthly';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCurrentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function maskValue(hide: boolean, display: string): string {
  return hide ? '****' : display;
}

// ─── Tooltips ─────────────────────────────────────────────────────────────────

interface TooltipStyleProps {
  bgColor: string;
  borderColor: string;
  textColor: string;
  successColor: string;
  dangerColor: string;
  mutedColor: string;
}

const DailyTooltip: React.FC<
  TooltipProps<number, string> &
    TooltipStyleProps & {
      formatLargeNumber: (v: number, c: string) => string;
      currency: string;
      hideAmount: boolean;
    }
> = ({ active, payload, label, formatLargeNumber, currency, hideAmount, bgColor, borderColor, textColor, successColor, dangerColor, mutedColor }) => {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as DailyChartPoint | undefined;
  const totalValue = (payload[0]?.value as number) ?? 0;
  const totalGain = point?.totalGain ?? 0;
  const totalGainPercent = point?.totalGainPercent ?? 0;
  const gainColor = totalGain > 0 ? successColor : totalGain < 0 ? dangerColor : mutedColor;
  const sign = totalGain > 0 ? '+' : '';

  return (
    <div style={{ background: bgColor, border: `1px solid ${borderColor}`, color: textColor, borderRadius: '8px', padding: '8px 12px', fontSize: '12px', minWidth: '160px' }}>
      <p className="mb-2 font-medium">{label}</p>
      <p className="mb-1">资产总值: <span className="font-semibold">{maskValue(hideAmount, formatLargeNumber(totalValue, currency))}</span></p>
      <p className="mb-0.5" style={{ color: gainColor }}>
        当日涨跌: <span className="font-semibold">{maskValue(hideAmount, `${sign}${formatLargeNumber(totalGain, currency)}`)}</span>
      </p>
      <p style={{ color: gainColor }}>
        涨跌幅: <span className="font-semibold">{maskValue(hideAmount, `${sign}${totalGainPercent.toFixed(2)}%`)}</span>
      </p>
    </div>
  );
};

const MonthlyTooltip: React.FC<
  TooltipProps<number, string> &
    TooltipStyleProps & {
      formatLargeNumber: (v: number, c: string) => string;
      currency: string;
      hideAmount: boolean;
    }
> = ({ active, payload, label, formatLargeNumber, currency, hideAmount, bgColor, borderColor, textColor, successColor, dangerColor, mutedColor }) => {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as MonthlyChartPoint | undefined;
  const totalGainPercent = (payload[0]?.value as number) ?? 0;
  const totalGain = point?.totalGain ?? 0;
  const gainColor = totalGainPercent > 0 ? successColor : totalGainPercent < 0 ? dangerColor : mutedColor;
  const sign = totalGainPercent > 0 ? '+' : '';

  return (
    <div style={{ background: bgColor, border: `1px solid ${borderColor}`, color: textColor, borderRadius: '8px', padding: '8px 12px', fontSize: '12px', minWidth: '160px' }}>
      <p className="mb-2 font-medium">{label}</p>
      <p className="mb-0.5" style={{ color: gainColor }}>
        月涨跌幅: <span className="font-semibold">{maskValue(hideAmount, `${sign}${totalGainPercent.toFixed(2)}%`)}</span>
      </p>
      <p style={{ color: gainColor }}>
        月涨跌额: <span className="font-semibold">{maskValue(hideAmount, `${sign}${formatLargeNumber(totalGain, currency)}`)}</span>
      </p>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const DailyTrendChart: React.FC<DailyTrendChartProps> = ({ currency, formatLargeNumber }) => {
  const { year: initYear, month: initMonth } = getCurrentYearMonth();

  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [year, setYear] = useState(initYear);
  const [month, setMonth] = useState(initMonth);
  const [hideAmount, setHideAmount] = useState(false);

  const { calendarData, yearlySummary, isLoading, error, fetchCalendarData, fetchYearlySummary } = useCalendarData();
  const colors = useResolvedColors();

  // Fetch data when mode / year / month changes
  useEffect(() => {
    if (viewMode === 'daily') {
      fetchCalendarData(year, month);
    }
  }, [viewMode, year, month, fetchCalendarData]);

  useEffect(() => {
    if (viewMode === 'monthly') {
      fetchYearlySummary(year);
    }
  }, [viewMode, year, fetchYearlySummary]);

  // Navigation
  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };
  const prevYear = () => setYear((y) => y - 1);
  const nextYear = () => setYear((y) => y + 1);

  // Daily chart data
  const dailyChartData: DailyChartPoint[] = calendarData
    .filter((d) => d.hasData && (d.totalValue ?? 0) > 0)
    .map((d) => {
      const [, mm, dd] = d.date.split('-');
      return { date: d.date, label: `${parseInt(mm)}/${parseInt(dd)}`, totalValue: d.totalValue ?? 0, totalGain: d.totalGain, totalGainPercent: d.totalGainPercent ?? 0 };
    });

  // Monthly chart data
  const monthlyChartData: MonthlyChartPoint[] = (yearlySummary ?? [])
    .filter((s: YearlyMonthSummary) => s.tradingDaysCount > 0)
    .map((s: YearlyMonthSummary) => ({
      month: s.month,
      label: `${parseInt(s.month)}月`,
      totalGainPercent: s.totalGainPercent,
      totalGain: s.totalGain,
    }));

  // Shared tooltip style props — memoised so Tooltip element refs stay stable
  const tooltipStyle = useMemo<TooltipStyleProps>(() => ({
    bgColor: colors.bgElevated,
    borderColor: colors.borderDefault,
    textColor: colors.fg,
    successColor: colors.success,
    dangerColor: colors.danger,
    mutedColor: colors.fgMuted,
  }), [colors]);

  const navLabel = viewMode === 'daily' ? `${year}年${month}月` : `${year}年`;
  const onPrev = viewMode === 'daily' ? prevMonth : prevYear;
  const onNext = viewMode === 'daily' ? nextMonth : nextYear;

  // Memoised Tooltip elements — avoids re-creating JSX on every render → prevents hover flicker
  const dailyTooltipEl = useMemo(() => (
    <DailyTooltip formatLargeNumber={formatLargeNumber} currency={currency} hideAmount={hideAmount} {...tooltipStyle} />
  ), [formatLargeNumber, currency, hideAmount, tooltipStyle]);

  const monthlyTooltipEl = useMemo(() => (
    <MonthlyTooltip formatLargeNumber={formatLargeNumber} currency={currency} hideAmount={hideAmount} {...tooltipStyle} />
  ), [formatLargeNumber, currency, hideAmount, tooltipStyle]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Navigation bar */}
      <div className="flex items-center gap-2">
        {/* Mode toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode('daily')}
          className={cn(viewMode === 'daily' && 'bg-bg-subtle font-semibold text-fg')}
        >
          按日
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode('monthly')}
          className={cn(viewMode === 'monthly' && 'bg-bg-subtle font-semibold text-fg')}
        >
          按月
        </Button>

        {/* Month / Year navigation — centred */}
        <div className="flex flex-1 items-center justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={onPrev} disabled={isLoading}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[80px] text-center text-sm font-medium text-fg">{navLabel}</span>
          <Button variant="ghost" size="sm" onClick={onNext} disabled={isLoading}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Hide amounts */}
        <button
          type="button"
          onClick={() => setHideAmount((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors duration-[var(--motion-fast)]',
            hideAmount ? 'bg-brand/10 text-brand font-medium' : 'text-fg-muted hover:bg-bg-subtle hover:text-fg',
          )}
        >
          <EyeOff className="h-3.5 w-3.5" aria-hidden />
          {hideAmount ? '已隐藏' : '隐藏金额'}
        </button>
      </div>

      {/* Chart area */}
      {isLoading ? (
        <div className="h-[240px] w-full animate-pulse rounded-lg bg-bg-subtle" />
      ) : error ? (
        <div className="flex h-[240px] w-full items-center justify-center rounded-lg border border-danger/30 bg-danger/5 text-sm text-danger">
          数据加载失败，请重试
        </div>
      ) : viewMode === 'daily' ? (
        // ── Daily chart ──────────────────────────────────────────────────────
        dailyChartData.length === 0 ? (
          <div className="flex h-[240px] w-full items-center justify-center rounded-lg border border-border-subtle bg-bg-subtle text-sm text-fg-muted">
            暂无数据
          </div>
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyChartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.borderSubtle} />
                <XAxis dataKey="label" tick={{ fill: colors.fgMuted, fontSize: 11 }} axisLine={{ stroke: colors.borderDefault }} tickLine={false} />
                <YAxis
                  tick={{ fill: colors.fgMuted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                  tickFormatter={(v: number) => maskValue(hideAmount, formatLargeNumber(v, currency))}
                />
                <Tooltip content={dailyTooltipEl} />
                <Line
                  type="monotone"
                  dataKey="totalValue"
                  stroke={colors.brand}
                  strokeWidth={2}
                  dot={dailyChartData.length === 1 ? { r: 4, fill: colors.brand } : false}
                  activeDot={{ r: 4, fill: colors.brand }}
                />
                {dailyChartData.length >= 5 && (
                  <Brush
                    dataKey="label"
                    height={20}
                    stroke={colors.borderDefault}
                    fill={colors.bgSubtle}
                    travellerWidth={8}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      ) : (
        // ── Monthly chart ─────────────────────────────────────────────────────
        monthlyChartData.length === 0 ? (
          <div className="flex h-[240px] w-full items-center justify-center rounded-lg border border-border-subtle bg-bg-subtle text-sm text-fg-muted">
            暂无数据
          </div>
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.borderSubtle} />
                <XAxis dataKey="label" tick={{ fill: colors.fgMuted, fontSize: 11 }} axisLine={{ stroke: colors.borderDefault }} tickLine={false} />
                <YAxis
                  tick={{ fill: colors.fgMuted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(v: number) => {
                    if (hideAmount) return '****';
                    return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
                  }}
                />
                <Tooltip content={monthlyTooltipEl} />
                <Line
                  type="monotone"
                  dataKey="totalGainPercent"
                  stroke={colors.brand}
                  strokeWidth={2}
                  dot={monthlyChartData.length === 1 ? { r: 4, fill: colors.brand } : false}
                  activeDot={{ r: 4, fill: colors.brand }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      )}
    </div>
  );
};

export default DailyTrendChart;
