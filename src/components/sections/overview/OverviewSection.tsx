'use client';

import { PageHeader } from '@/components/ui/page-header';
import { KpiCards } from './KpiCards';
import { AssetTrendCard } from './AssetTrendCard';
import { QuickActions } from './QuickActions';
import { YearlyBreakdownGrid } from './YearlyBreakdownGrid';
import { usePortfolio } from '@/components/shell/PortfolioContext';
import ReportDialog from '@/components/ReportDialog';

export function OverviewSection() {
  const { trackerState, portfolioData, chartData } = usePortfolio();
  const { yearData, formatLargeNumber, handleTokenExpired } = portfolioData;
  const { calculateCumulativeInvested } = chartData;
  const { currency, isReportDialogOpen, setIsReportDialogOpen, selectedReportYear, hiddenStocks, currentUser, isLoggedIn } = trackerState;

  // 问候语：早上好 / 下午好 / 晚上好
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
  const displayName = isLoggedIn && currentUser
    ? (currentUser.nickname || currentUser.username || null)
    : null;

  const totalPortfolioValue = selectedReportYear
    ? (yearData[selectedReportYear]?.stocks?.reduce(
        (acc, stock) => (hiddenStocks[stock.name] ? acc : acc + stock.shares * stock.price),
        0,
      ) || 0) + (yearData[selectedReportYear]?.cashBalance || 0)
    : 0;
  const cumulativeInvested = selectedReportYear
    ? calculateCumulativeInvested(selectedReportYear)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          displayName
            ? `${greeting}，${displayName} 👋`
            : '投资总览'
        }
        description={
          displayName
            ? '一眼看懂当前财务状况'
            : '登录后可显示个人问候'
        }
        actions={<QuickActions />}
      />
      <KpiCards />
      <AssetTrendCard />
      <YearlyBreakdownGrid />

      {/* Report Dialog 挂载点（复用 legacy） */}
      <ReportDialog
        isOpen={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        selectedYear={selectedReportYear}
        yearData={yearData}
        hiddenStocks={hiddenStocks}
        formatLargeNumber={formatLargeNumber}
        currency={currency}
        totalPortfolioValue={totalPortfolioValue}
        cumulativeInvested={cumulativeInvested}
        currentUser={currentUser}
        onUnauthorized={handleTokenExpired}
      />
    </div>
  );
}
