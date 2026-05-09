'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Section } from '@/components/ui/section';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { usePortfolio } from '@/components/shell/PortfolioContext';
import { useResolvedColors } from '@/hooks/useResolvedColors';

export function AssetTrendCard() {
  const { chartData, portfolioData, trackerState } = usePortfolio();
  const { lineChartData } = chartData;
  const { formatLargeNumber } = portfolioData;
  const { currency } = trackerState;
  const colors = useResolvedColors();

  const empty = !lineChartData || lineChartData.length === 0;

  const data = (lineChartData ?? []).map((d) => ({
    year: d.year,
    total: Number(d.total ?? 0),
  }));

  return (
    <Section className="p-4 md:p-6">
      <PageHeader
        title={<span className="flex items-center gap-2 text-base font-semibold">资产走势</span>}
        description="按年度汇总的总资产变化"
      />
      <div className="mt-4 h-56 md:h-72">
        {empty ? (
          <EmptyState
            icon={TrendingUp}
            title="暂无数据"
            description="添加第一笔交易后即可看到资产走势"
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.brand} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={colors.brand} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={colors.borderSubtle} vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: colors.fgMuted, fontSize: 12 }}
                axisLine={{ stroke: colors.borderSubtle }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: colors.fgMuted, fontSize: 12 }}
                axisLine={{ stroke: colors.borderSubtle }}
                tickLine={false}
                tickFormatter={(v) => formatLargeNumber(Number(v), currency)}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  background: colors.bgElevated,
                  border: `1px solid ${colors.borderDefault}`,
                  borderRadius: 8,
                  fontSize: 12,
                  color: colors.fg,
                }}
                formatter={(v: number) => [
                  formatLargeNumber(Number(v), currency),
                  '总资产',
                ]}
                labelStyle={{ color: colors.fgMuted }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke={colors.brand}
                strokeWidth={2}
                fill="url(#trendFill)"
                dot={{ r: 3, fill: colors.brand, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Section>
  );
}
