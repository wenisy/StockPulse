'use client';

import React, { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useResolvedColors } from '@/hooks/useResolvedColors';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DailyTrendChartProps {
  currency: string;
  formatLargeNumber: (value: number, currency: string) => string;
}

interface ChartPoint {
  date: string;
  label: string;
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
}

const CustomTooltip: React.FC<
  TooltipProps<number, string> & {
    formatLargeNumber: (v: number, c: string) => string;
    currency: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    successColor: string;
    dangerColor: string;
    mutedColor: string;
  }
> = ({
  active,
  payload,
  label,
  formatLargeNumber,
  currency,
  bgColor,
  borderColor,
  textColor,
  successColor,
  dangerColor,
  mutedColor,
}) => {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as ChartPoint | undefined;
  const totalValue = (payload[0]?.value as number) ?? 0;
  const totalGain = point?.totalGain ?? 0;
  const totalGainPercent = point?.totalGainPercent ?? 0;

  const gainColor =
    totalGain > 0 ? successColor : totalGain < 0 ? dangerColor : mutedColor;
  const sign = totalGain > 0 ? '+' : '';

  return (
    <div
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        color: textColor,
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '12px',
        minWidth: '160px',
      }}
    >
      <p className="mb-2 font-medium">{label}</p>
      <p className="mb-1">
        资产总值:{' '}
        <span className="font-semibold">{formatLargeNumber(totalValue, currency)}</span>
      </p>
      <p className="mb-0.5" style={{ color: gainColor }}>
        当日涨跌:{' '}
        <span className="font-semibold">
          {sign}{formatLargeNumber(totalGain, currency)}
        </span>
      </p>
      <p style={{ color: gainColor }}>
        涨跌幅:{' '}
        <span className="font-semibold">
          {sign}{totalGainPercent.toFixed(2)}%
        </span>
      </p>
    </div>
  );
};

function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

const DailyTrendChart: React.FC<DailyTrendChartProps> = ({
  currency,
  formatLargeNumber,
}) => {
  const { year: initYear, month: initMonth } = getCurrentYearMonth();
  const [year, setYear] = useState(initYear);
  const [month, setMonth] = useState(initMonth);

  const { calendarData, isLoading, error, fetchCalendarData } = useCalendarData();
  const colors = useResolvedColors();

  useEffect(() => {
    fetchCalendarData(year, month);
  }, [year, month, fetchCalendarData]);

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const chartData: ChartPoint[] = calendarData
    .filter((d) => d.hasData && (d.totalValue ?? 0) > 0)
    .map((d) => {
      const [, mm, dd] = d.date.split('-');
      const label = `${parseInt(mm)}/${parseInt(dd)}`;
      return {
        date: d.date,
        label,
        totalValue: d.totalValue ?? 0,
        totalGain: d.totalGain,
        totalGainPercent: d.totalGainPercent ?? 0,
      };
    });

  const monthLabel = `${year}年${month}月`;

  return (
    <div className="space-y-3">
      {/* 月份导航 */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={prevMonth} disabled={isLoading}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[72px] text-center text-sm font-medium text-fg">
          {monthLabel}
        </span>
        <Button variant="ghost" size="sm" onClick={nextMonth} disabled={isLoading}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 图表内容 */}
      {isLoading ? (
        <div className="h-[240px] w-full animate-pulse rounded-lg bg-bg-subtle" />
      ) : error ? (
        <div className="flex h-[240px] w-full items-center justify-center rounded-lg border border-danger/30 bg-danger/5 text-sm text-danger">
          数据加载失败，请重试
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-[240px] w-full items-center justify-center rounded-lg border border-border-subtle bg-bg-subtle text-sm text-fg-muted">
          暂无数据
        </div>
      ) : (
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.borderSubtle} />
              <XAxis
                dataKey="label"
                tick={{ fill: colors.fgMuted, fontSize: 11 }}
                axisLine={{ stroke: colors.borderDefault }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: colors.fgMuted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={72}
                tickFormatter={(v: number) => formatLargeNumber(v, currency)}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    formatLargeNumber={formatLargeNumber}
                    currency={currency}
                    bgColor={colors.bgElevated}
                    borderColor={colors.borderDefault}
                    textColor={colors.fg}
                    successColor={colors.success}
                    dangerColor={colors.danger}
                    mutedColor={colors.fgMuted}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="totalValue"
                stroke={colors.brand}
                strokeWidth={2}
                dot={chartData.length === 1 ? { r: 4, fill: colors.brand } : false}
                activeDot={{ r: 4, fill: colors.brand }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default DailyTrendChart;
