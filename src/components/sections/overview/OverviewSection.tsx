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
  const { yearData, formatLargeNumber } = portfolioData;
  const { calculateCumulativeInvested } = chartData;
  const { currency, isReportDialogOpen, setIsReportDialogOpen, selectedReportYear, hiddenStocks, currentUser } = trackerState;

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
        title="总览"
        description="一眼看懂当前财务状况"
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
      />
    </div>
  );
}
