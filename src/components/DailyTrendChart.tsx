'use client';

import React from 'react';
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
import { CalendarData } from '@/types/stock';
import { useResolvedColors } from '@/hooks/useResolvedColors';

interface DailyTrendChartProps {
  calendarData: CalendarData[];
  isLoading: boolean;
  currency: string;
  formatLargeNumber: (value: number, currency: string) => string;
}

interface ChartPoint {
  date: string;
  label: string;
  totalValue: number;
}

const CustomTooltip: React.FC<
  TooltipProps<number, string> & {
    formatLargeNumber: (v: number, c: string) => string;
    currency: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
  }
> = ({ active, payload, label, formatLargeNumber, currency, bgColor, borderColor, textColor }) => {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? 0;
  return (
    <div
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        color: textColor,
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '12px',
      }}
    >
      <p className="mb-1 font-medium">{label}</p>
      <p>
        资产总值:{' '}
        <span className="font-semibold">{formatLargeNumber(value, currency)}</span>
      </p>
    </div>
  );
};

const DailyTrendChart: React.FC<DailyTrendChartProps> = ({
  calendarData,
  isLoading,
  currency,
  formatLargeNumber,
}) => {
  const colors = useResolvedColors();

  const chartData: ChartPoint[] = calendarData
    .filter((d) => d.hasData && (d.totalValue ?? 0) > 0)
    .map((d) => {
      // Parse as local date to avoid UTC offset shift on display
      const [, mm, dd] = d.date.split('-');
      const label = `${parseInt(mm)}/${parseInt(dd)}`;
      return {
        date: d.date,
        label,
        totalValue: d.totalValue ?? 0,
      };
    });

  if (isLoading) {
    return (
      <div className="h-[240px] w-full animate-pulse rounded-lg bg-bg-subtle" />
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-[240px] w-full items-center justify-center rounded-lg border border-border-subtle bg-bg-subtle text-sm text-fg-muted">
        暂无数据
      </div>
    );
  }

  return (
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
  );
};

export default DailyTrendChart;
