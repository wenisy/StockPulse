'use client';

import { BarChart2, Layers, Percent, TrendingUp, Wallet } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { usePortfolio } from '@/components/shell/PortfolioContext';

export function KpiCards() {
  const { portfolioData, chartData, trackerState } = usePortfolio();
  const { formatLargeNumber, yearData, latestYear, years } = portfolioData;
  const { totalValues, calculateCumulativeInvested, getLatestYearGrowthRate } = chartData;
  const { currency } = trackerState;

  const currentTotal = totalValues[latestYear] ?? 0;
  const invested = calculateCumulativeInvested(latestYear) || 0;
  const totalReturn = currentTotal - invested;
  // 累计总收益率 = (总资产 − 累计净投入) / 累计净投入 × 100
  const totalReturnPct = invested > 0 ? (totalReturn / invested) * 100 : 0;

  // 持仓数
  const holdingsCount =
    yearData[latestYear]?.stocks?.filter((s) => s.shares > 0).length ?? 0;

  // 年化复合收益率（CAGR）
  const cagrRaw = getLatestYearGrowthRate();
  const cagrPct = cagrRaw ? parseFloat(cagrRaw) : null;

  const fmt = (v: number) => formatLargeNumber(v, currency);

  // 最早年 → 用于 CAGR 说明
  const sortedYears = [...years].sort((a, b) => parseInt(a) - parseInt(b));
  const firstYear = sortedYears[0] ?? latestYear;
  const investmentYears = parseInt(latestYear) - parseInt(firstYear) + 1;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        label="总资产"
        value={currentTotal}
        icon={Wallet}
        tone="brand"
        format={fmt}
        description={`${latestYear} 年末持仓市值 + 现金余额`}
      />
      <StatCard
        label="累计收益"
        value={Math.abs(totalReturn)}
        icon={TrendingUp}
        tone={totalReturn >= 0 ? 'success' : 'danger'}
        format={fmt}
        delta={totalReturnPct}
        deltaLabel="vs 累计投入"
        description={`总资产 − 全历史净投入 ${fmt(invested)}`}
      />
      <StatCard
        label="累计收益率"
        value={totalReturnPct}
        icon={Percent}
        tone={totalReturnPct >= 0 ? 'success' : 'danger'}
        format={(n) => `${n.toFixed(2)}%`}
        description="(总资产 − 累计投入) ÷ 累计投入，全周期总回报"
      />
      <StatCard
        label="年化复合收益"
        value={cagrPct ?? 0}
        icon={BarChart2}
        tone={cagrPct !== null && cagrPct >= 0 ? 'success' : 'danger'}
        format={(n) => (cagrPct === null ? '—' : `${n.toFixed(2)}%`)}
        description={
          cagrPct === null
            ? '数据不足，无法计算'
            : `全周期 CAGR，共 ${investmentYears} 年（${firstYear}–${latestYear}）`
        }
      />
      <StatCard
        label="持仓数"
        value={holdingsCount}
        icon={Layers}
        tone="info"
        format={(n) => Math.round(n).toString()}
        description={`${latestYear} 年末持有股票只数`}
      />
    </div>
  );
}
