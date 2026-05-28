'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useCalendarData, YearlyMonthSummary, getBackendDomain } from '@/hooks/useCalendarData';
import { CalendarData } from '@/types/stock';
import { useResolvedColors } from '@/hooks/useResolvedColors';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyTrendChartProps {
  currency: string;
  formatLargeNumber: (value: number, currency: string) => string;
}

type Range = '1M' | '3M' | '1Y';

interface DailyChartPoint {
  date: string;
  label: string;
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
}

interface WeeklyChartPoint {
  weekKey: string;   // "YYYY-WW"
  label: string;     // "M/D" of the last trading day in the week
  date: string;      // YYYY-MM-DD of the last trading day
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
}

interface MonthlyChartPoint {
  month: string;
  label: string;
  totalGainPercent: number;
  totalGain: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCurrentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function maskValue(hide: boolean, display: string): string {
  return hide ? '****' : display;
}

/**
 * Returns ISO week { year, week } for a given date.
 * Handles cross-year ISO weeks correctly (e.g. 2024-12-30 → { year: 2025, week: 1 }).
 */
export function getISOWeek(date: Date): { year: number; week: number } {
  // Create a copy and adjust to the nearest Thursday (ISO week rule)
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7; // Convert Sunday (0) to 7
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek); // Shift to Thursday of this ISO week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/**
 * Aggregates daily CalendarData into weekly points.
 * Each week is keyed by ISO (year, week). The last valid trading day's totalValue
 * is used as the week's value; totalGain is accumulated across the week.
 */
export function aggregateByWeek(calendarData: CalendarData[]): WeeklyChartPoint[] {
  const validData = calendarData.filter((d) => d.hasData && (d.totalValue ?? 0) > 0);
  if (validData.length === 0) return [];

  // Group by ISO week key
  const weekMap = new Map<string, { points: CalendarData[]; weekKey: string }>();
  for (const d of validData) {
    const dateObj = new Date(d.date + 'T00:00:00');
    const { year: isoYear, week } = getISOWeek(dateObj);
    const weekKey = `${isoYear}-${String(week).padStart(2, '0')}`;
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { points: [], weekKey });
    }
    weekMap.get(weekKey)!.points.push(d);
  }

  // Sort week keys ascending and build output
  const result: WeeklyChartPoint[] = [];
  for (const [weekKey, { points }] of [...weekMap.entries()].sort()) {
    // Last point by date = week's closing value
    const last = points[points.length - 1];
    const totalGain = points.reduce((sum, p) => sum + (p.totalGain ?? 0), 0);
    const weekEndValue = last.totalValue ?? 0;
    const weekStartValue = weekEndValue - totalGain;
    const totalGainPercent = weekStartValue > 0
      ? (totalGain / weekStartValue) * 100
      : 0;

    const [, mm, dd] = last.date.split('-');
    result.push({
      weekKey,
      label: `${parseInt(mm)}/${parseInt(dd)}`,
      date: last.date,
      totalValue: weekEndValue,
      totalGain,
      totalGainPercent,
    });
  }
  return result;
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

const tooltipContainerStyle = (bgColor: string, borderColor: string, textColor: string) => ({
  background: bgColor,
  border: `1px solid ${borderColor}`,
  color: textColor,
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '12px',
  minWidth: '160px',
});

const DailyTooltip: React.FC<
  TooltipProps<number, string> & TooltipStyleProps & {
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
    <div style={tooltipContainerStyle(bgColor, borderColor, textColor)}>
      <p className="mb-2 font-medium">{label}</p>
      <p className="mb-1">资产总值: <span className="font-semibold">{maskValue(hideAmount, formatLargeNumber(totalValue, currency))}</span></p>
      <p className="mb-0.5" style={{ color: gainColor }}>
        当日涨跌: <span className="font-semibold">{maskValue(hideAmount, `${sign}${formatLargeNumber(totalGain, currency)}`)}</span>
      </p>
      <p style={{ color: gainColor }}>
        涨跌幅: <span className="font-semibold">{`${sign}${totalGainPercent.toFixed(2)}%`}</span>
      </p>
    </div>
  );
};

const WeeklyTooltip: React.FC<
  TooltipProps<number, string> & TooltipStyleProps & {
    formatLargeNumber: (v: number, c: string) => string;
    currency: string;
    hideAmount: boolean;
  }
> = ({ active, payload, label, formatLargeNumber, currency, hideAmount, bgColor, borderColor, textColor, successColor, dangerColor, mutedColor }) => {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as WeeklyChartPoint | undefined;
  const totalValue = (payload[0]?.value as number) ?? 0;
  const totalGain = point?.totalGain ?? 0;
  const totalGainPercent = point?.totalGainPercent ?? 0;
  const gainColor = totalGain > 0 ? successColor : totalGain < 0 ? dangerColor : mutedColor;
  const sign = totalGain > 0 ? '+' : '';
  return (
    <div style={tooltipContainerStyle(bgColor, borderColor, textColor)}>
      <p className="mb-2 font-medium">周末 {label}</p>
      <p className="mb-1">资产总值: <span className="font-semibold">{maskValue(hideAmount, formatLargeNumber(totalValue, currency))}</span></p>
      <p className="mb-0.5" style={{ color: gainColor }}>
        周累计涨跌: <span className="font-semibold">{maskValue(hideAmount, `${sign}${formatLargeNumber(totalGain, currency)}`)}</span>
      </p>
      <p style={{ color: gainColor }}>
        周涨跌幅: <span className="font-semibold">{`${sign}${totalGainPercent.toFixed(2)}%`}</span>
      </p>
    </div>
  );
};

const MonthlyTooltip: React.FC<
  TooltipProps<number, string> & TooltipStyleProps & {
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
    <div style={tooltipContainerStyle(bgColor, borderColor, textColor)}>
      <p className="mb-2 font-medium">{label}</p>
      <p className="mb-0.5" style={{ color: gainColor }}>
        月涨跌幅: <span className="font-semibold">{`${sign}${totalGainPercent.toFixed(2)}%`}</span>
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

  const [range, setRange] = useState<Range>('1M');
  const [year, setYear] = useState(initYear);
  const [month, setMonth] = useState(initMonth);       // anchor month (1M) or 3M window end
  const [hideAmount, setHideAmount] = useState(false);

  // 3M-mode: raw merged daily data across 3 months
  const [threeMonthData, setThreeMonthData] = useState<CalendarData[]>([]);
  const [threeMonthLoading, setThreeMonthLoading] = useState(false);
  const [threeMonthError, setThreeMonthError] = useState<string | null>(null);

  // Brush range state (1M mode only) — minimum 7 visible days
  const MIN_BRUSH_DAYS = 6;
  const [brushStart, setBrushStart] = useState(0);
  const [brushEnd, setBrushEnd] = useState(0);

  const { calendarData, yearlySummary, isLoading, error, fetchCalendarData, fetchYearlySummary } = useCalendarData();
  const colors = useResolvedColors();

  // ── Data fetching ─────────────────────────────────────────────────────────

  // 1M: fetch single month
  useEffect(() => {
    if (range === '1M') fetchCalendarData(year, month);
  }, [range, year, month, fetchCalendarData]);

  // 1Y: fetch yearly summary
  useEffect(() => {
    if (range === '1Y') fetchYearlySummary(year);
  }, [range, year, fetchYearlySummary]);

  // 3M: fetch 3 months concurrently using raw fetch (avoids double-calling the hook)
  const fetchThreeMonths = useCallback(async (endYear: number, endMonth: number) => {
    setThreeMonthLoading(true);
    setThreeMonthError(null);
    const months: Array<[number, number]> = [];
    for (let i = 2; i >= 0; i--) {
      let m = endMonth - i;
      let y = endYear;
      if (m <= 0) { m += 12; y -= 1; }
      months.push([y, m]);
    }
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) throw new Error('未找到认证令牌');

      const fetched = await Promise.allSettled(
        months.map(([y, m]) =>
          fetch(`${getBackendDomain()}/api/calendarData?year=${y}&month=${String(m).padStart(2, '0')}`, {
            headers: { Authorization: token },
            signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined,
          }).then((r) => r.json()).then((j) => (j.data || []) as CalendarData[])
        )
      );
      const merged: CalendarData[] = [];
      for (const r of fetched) {
        if (r.status === 'fulfilled') merged.push(...r.value);
      }
      if (merged.length === 0 && fetched.every((r) => r.status === 'rejected')) {
        throw new Error('所有月份数据加载失败');
      }
      setThreeMonthData(merged.sort((a, b) => a.date.localeCompare(b.date)));
    } catch (err) {
      setThreeMonthError(err instanceof Error ? err.message : '加载失败');
      setThreeMonthData([]);
    } finally {
      setThreeMonthLoading(false);
    }
  }, []); // no dependency on hook's fetchCalendarData — uses raw fetch directly

  useEffect(() => {
    if (range === '3M') fetchThreeMonths(year, month);
  }, [range, year, month, fetchThreeMonths]);

  // ── Navigation ────────────────────────────────────────────────────────────

  const onPrev = () => {
    if (range === '1Y') {
      setYear((y) => y - 1);
    } else {
      // 1M / 3M: slide month back by 1; clamp 3M to not start before month 1
      if (range === '3M' && month <= 3) return; // clamp: window can't start before Jan
      if (month === 1) { setYear((y) => y - 1); setMonth(12); }
      else setMonth((m) => m - 1);
    }
  };

  const onNext = () => {
    if (range === '1Y') {
      setYear((y) => y + 1);
    } else {
      // 3M: clamp upper bound — window can't end past December (no cross-year in v1)
      if (range === '3M' && month >= 12) return;
      if (month === 12) { setYear((y) => y + 1); setMonth(1); }
      else setMonth((m) => m + 1);
    }
  };

  // ── Derived chart data ────────────────────────────────────────────────────

  const dailyChartData: DailyChartPoint[] = useMemo(() =>
    calendarData
      .filter((d) => d.hasData && (d.totalValue ?? 0) > 0)
      .map((d) => {
        const parts = d.date.split('-');
        const mm = parts[1] ?? '01';
        const dd = parts[2] ?? '01';
        return { date: d.date, label: `${parseInt(mm)}/${parseInt(dd)}`, totalValue: d.totalValue ?? 0, totalGain: d.totalGain, totalGainPercent: d.totalGainPercent ?? 0 };
      }),
  [calendarData]);

  const weeklyChartData: WeeklyChartPoint[] = useMemo(
    () => aggregateByWeek(threeMonthData),
    [threeMonthData]
  );

  const monthlyChartData: MonthlyChartPoint[] = useMemo(() =>
    (yearlySummary ?? [])
      .filter((s: YearlyMonthSummary) => s.tradingDaysCount > 0)
      .map((s: YearlyMonthSummary) => ({
        month: s.month,
        label: `${parseInt(s.month)}月`,
        totalGainPercent: s.totalGainPercent,
        totalGain: s.totalGain,
    })), [yearlySummary]);

  // Reset brush when daily data changes
  useEffect(() => {
    setBrushStart(0);
    setBrushEnd(Math.max(0, dailyChartData.length - 1));
  }, [dailyChartData.length]);

  const handleBrushChange = ({ startIndex, endIndex }: { startIndex?: number; endIndex?: number }) => {
    const s = startIndex ?? brushStart;
    const e = endIndex ?? brushEnd;
    if (e - s >= MIN_BRUSH_DAYS) {
      setBrushStart(s);
      setBrushEnd(e);
    } else {
      if (s !== brushStart) setBrushStart(Math.max(0, e - MIN_BRUSH_DAYS));
      else setBrushEnd(Math.min(dailyChartData.length - 1, s + MIN_BRUSH_DAYS));
    }
  };

  // ── Memoised display values ───────────────────────────────────────────────

  const tooltipStyle = useMemo<TooltipStyleProps>(() => ({
    bgColor: colors.bgElevated,
    borderColor: colors.borderDefault,
    textColor: colors.fg,
    successColor: colors.success,
    dangerColor: colors.danger,
    mutedColor: colors.fgMuted,
  }), [colors]);

  const navLabel = useMemo(() => {
    if (range === '1Y') return `${year}年`;
    if (range === '3M') {
      const endM = month;
      let startM = month - 2;
      let startY = year;
      if (startM <= 0) { startM += 12; startY -= 1; }
      const label3M = startY === year ? `${year}年${startM}-${endM}月` : `${startY}/${startM}月-${year}/${endM}月`;
      return label3M;
    }
    return `${year}年${month}月`;
  }, [range, year, month]);

  const dailyTooltipEl = useMemo(() => (
    <DailyTooltip formatLargeNumber={formatLargeNumber} currency={currency} hideAmount={hideAmount} {...tooltipStyle} />
  ), [formatLargeNumber, currency, hideAmount, tooltipStyle]);

  const weeklyTooltipEl = useMemo(() => (
    <WeeklyTooltip formatLargeNumber={formatLargeNumber} currency={currency} hideAmount={hideAmount} {...tooltipStyle} />
  ), [formatLargeNumber, currency, hideAmount, tooltipStyle]);

  const monthlyTooltipEl = useMemo(() => (
    <MonthlyTooltip formatLargeNumber={formatLargeNumber} currency={currency} hideAmount={hideAmount} {...tooltipStyle} />
  ), [formatLargeNumber, currency, hideAmount, tooltipStyle]);

  // Unified loading / error state
  const activeIsLoading = range === '3M' ? threeMonthLoading : isLoading;
  const activeError = range === '3M' ? threeMonthError : error;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Navigation bar */}
      <div className="flex items-center gap-2">
        {/* Range selector */}
        {(['1M', '3M', '1Y'] as Range[]).map((r) => (
          <Button
            key={r}
            variant="ghost"
            size="sm"
            onClick={() => setRange(r)}
            className={cn(range === r && 'bg-bg-subtle font-semibold text-fg')}
          >
            {r === '1M' ? '1月' : r === '3M' ? '3月' : '1年'}
          </Button>
        ))}

        {/* Navigation */}
        <div className="flex flex-1 items-center justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={onPrev} disabled={activeIsLoading}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[96px] text-center text-sm font-medium text-fg">{navLabel}</span>
          <Button variant="ghost" size="sm" onClick={onNext} disabled={activeIsLoading}>
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
      {activeIsLoading ? (
        <div className="h-[240px] w-full animate-pulse rounded-lg bg-bg-subtle" />
      ) : activeError ? (
        <div className="flex h-[240px] w-full items-center justify-center rounded-lg border border-danger/30 bg-danger/5 text-sm text-danger">
          数据加载失败，请重试
        </div>
      ) : range === '1M' ? (
        // ── 1M: Daily chart ───────────────────────────────────────────────
        dailyChartData.length === 0 ? (
          <div className="flex h-[240px] w-full items-center justify-center rounded-lg border border-border-subtle bg-bg-subtle text-sm text-fg-muted">暂无数据</div>
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyChartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.borderSubtle} />
                <XAxis dataKey="label" tick={{ fill: colors.fgMuted, fontSize: 11 }} axisLine={{ stroke: colors.borderDefault }} tickLine={false} />
                <YAxis tick={{ fill: colors.fgMuted, fontSize: 11 }} axisLine={false} tickLine={false} width={72} tickFormatter={(v: number) => maskValue(hideAmount, formatLargeNumber(v, currency))} />
                <Tooltip content={dailyTooltipEl} />
                <Line type="monotone" dataKey="totalValue" stroke={colors.brand} strokeWidth={2} dot={dailyChartData.length === 1 ? { r: 4, fill: colors.brand } : false} activeDot={{ r: 4, fill: colors.brand }} />
                {dailyChartData.length >= 5 && (
                  <Brush dataKey="label" height={20} stroke={colors.borderDefault} fill={colors.bgSubtle} travellerWidth={8} startIndex={brushStart} endIndex={brushEnd} onChange={handleBrushChange} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      ) : range === '3M' ? (
        // ── 3M: Weekly chart ──────────────────────────────────────────────
        weeklyChartData.length === 0 ? (
          <div className="flex h-[240px] w-full items-center justify-center rounded-lg border border-border-subtle bg-bg-subtle text-sm text-fg-muted">暂无数据</div>
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyChartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.borderSubtle} />
                <XAxis dataKey="label" tick={{ fill: colors.fgMuted, fontSize: 11 }} axisLine={{ stroke: colors.borderDefault }} tickLine={false} />
                <YAxis tick={{ fill: colors.fgMuted, fontSize: 11 }} axisLine={false} tickLine={false} width={72} tickFormatter={(v: number) => maskValue(hideAmount, formatLargeNumber(v, currency))} />
                <Tooltip content={weeklyTooltipEl} />
                <Line type="monotone" dataKey="totalValue" stroke={colors.brand} strokeWidth={2} dot={weeklyChartData.length === 1 ? { r: 4, fill: colors.brand } : false} activeDot={{ r: 4, fill: colors.brand }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      ) : (
        // ── 1Y: Monthly chart ─────────────────────────────────────────────
        monthlyChartData.length === 0 ? (
          <div className="flex h-[240px] w-full items-center justify-center rounded-lg border border-border-subtle bg-bg-subtle text-sm text-fg-muted">暂无数据</div>
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.borderSubtle} />
                <XAxis dataKey="label" tick={{ fill: colors.fgMuted, fontSize: 11 }} axisLine={{ stroke: colors.borderDefault }} tickLine={false} />
                <YAxis tick={{ fill: colors.fgMuted, fontSize: 11 }} axisLine={false} tickLine={false} width={56} tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`} />
                <Tooltip content={monthlyTooltipEl} />
                <Line type="monotone" dataKey="totalGainPercent" stroke={colors.brand} strokeWidth={2} dot={monthlyChartData.length === 1 ? { r: 4, fill: colors.brand } : false} activeDot={{ r: 4, fill: colors.brand }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      )}
    </div>
  );
};

export default DailyTrendChart;
