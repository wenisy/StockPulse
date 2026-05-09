'use client';

import { ArrowUpRight, Layers, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { usePortfolio } from '@/components/shell/PortfolioContext';
import { computeYearNetReturnRate } from '@/lib/portfolio/portfolio-metrics';

export function KpiCards() {
  const { portfolioData, chartData, trackerState } = usePortfolio();
  const { formatLargeNumber, yearData, latestYear, years } = portfolioData;
  const { totalValues, calculateCumulativeInvested, getLatestYearGrowthRate } = chartData;

  const { currency } = trackerState;

  const currentTotal = totalValues[latestYear] ?? 0;
  const invested = calculateCumulativeInvested(latestYear) || 0;
  const totalReturn = currentTotal - invested;
  const returnPct = invested > 0 ? (totalReturn / invested) * 100 : 0;

  // 持仓数
  const holdingsCount =
    yearData[latestYear]?.stocks?.filter((s) => s.shares > 0).length ?? 0;

  // YTD（含入金）：用 getLatestYearGrowthRate() 返回的字符串
  const ytdRaw = getLatestYearGrowthRate();
  const ytdPct = ytdRaw ? parseFloat(ytdRaw) : null;

  // 本年纯收益（不含本年入金）：使用新增的纯函数
  const netReturnPct = computeYearNetReturnRate(yearData, years, latestYear, totalValues);

  const fmt = (v: number) => formatLargeNumber(v, currency);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        label="总资产"
        value={currentTotal}
        icon={Wallet}
        tone="brand"
        format={fmt}
      />
      <StatCard
        label="累计收益"
        value={Math.abs(totalReturn)}
        icon={TrendingUp}
        tone={totalReturn >= 0 ? 'success' : 'danger'}
        format={fmt}
        delta={returnPct}
        deltaLabel="相对本金 · 含入金"
      />
      <StatCard
        label="本年纯收益"
        value={netReturnPct ?? 0}
        icon={Sparkles}
        tone={netReturnPct !== null && netReturnPct >= 0 ? 'success' : 'danger'}
        format={(n) => (netReturnPct === null ? '—' : `${n.toFixed(2)}%`)}
      />
      <StatCard
        label="年初至今"
        value={ytdPct ?? 0}
        icon={ArrowUpRight}
        tone={ytdPct !== null && ytdPct >= 0 ? 'success' : 'danger'}
        format={(n) => (ytdPct === null ? '—' : `${n.toFixed(2)}%`)}
      />
      <StatCard
        label="持仓数"
        value={holdingsCount}
        icon={Layers}
        tone="info"
        format={(n) => Math.round(n).toString()}
      />
    </div>
  );
}
