'use client';

import { useMemo } from 'react';
import { History } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { usePortfolio } from '@/components/shell/PortfolioContext';
import {
  computeYearGrowthRate,
  computeYearNetReturnRate,
  computeYearNetDeposits,
} from '@/lib/portfolio/portfolio-metrics';
import { YearCard } from './YearCard';

export function YearlyBreakdownGrid() {
  const { portfolioData, chartData, callbacks, trackerState } = usePortfolio();
  const { years, yearData, formatLargeNumber } = portfolioData;
  const { totalValues } = chartData;
  const { currency } = trackerState;

  const fmt = (v: number) => formatLargeNumber(v, currency);

  // 排序：最新年在前
  const sortedYears = useMemo(
    () => [...years].sort((a, b) => parseInt(b) - parseInt(a)),
    [years],
  );

  if (sortedYears.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="逐年总览" description="按年度查看资产增长与纯投资收益" />
        <EmptyState
          icon={History}
          title="暂无年度数据"
          description="添加交易后即可看到逐年对比"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="逐年总览" description="按年度查看资产增长与纯投资收益" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedYears.map((year) => {
          const totalAtYearEnd = totalValues[year] ?? 0;
          const growthPct = computeYearGrowthRate(year, totalValues, years);
          const netReturnPct = computeYearNetReturnRate(yearData, years, year, totalValues);
          const netDeposits = computeYearNetDeposits(yearData, year);

          // 找上一年（数字升序后取 idx-1）
          const sortedAsc = [...years].sort((a, b) => parseInt(a) - parseInt(b));
          const idx = sortedAsc.indexOf(year);
          const prevYear = idx > 0 ? sortedAsc[idx - 1] : null;
          const prevValue = prevYear ? totalValues[prevYear] : null;

          const totalGrowthAmount =
            growthPct !== null && prevValue !== null
              ? totalAtYearEnd - prevValue
              : null;
          const netReturnAmount =
            netReturnPct !== null && prevValue !== null
              ? totalAtYearEnd - netDeposits - prevValue
              : null;

          return (
            <YearCard
              key={year}
              year={year}
              totalAtYearEnd={totalAtYearEnd}
              totalGrowthAmount={totalGrowthAmount}
              totalGrowthPct={growthPct}
              netReturnAmount={netReturnAmount}
              netReturnPct={netReturnPct}
              netDeposits={netDeposits}
              fmt={fmt}
              onClick={() => callbacks.handleReportClick(year)}
            />
          );
        })}
      </div>
    </div>
  );
}
