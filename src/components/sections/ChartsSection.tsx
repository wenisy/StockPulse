'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Section } from '@/components/ui/section';
import StockCharts from '@/components/StockCharts';
import { usePortfolio } from '@/components/shell/PortfolioContext';

export function ChartsSection() {
  const { chartData, callbacks, trackerState, portfolioData } = usePortfolio();
  const { showPositionChart, setShowPositionChart, hiddenStocks, hiddenSeries, currency } = trackerState;
  const { formatLargeNumber, years } = portfolioData;

  return (
    <div className="space-y-6">
      <PageHeader title="图表" description="多维度可视化组合表现" />
      <Section className="p-4 md:p-6">
        <StockCharts
          showPositionChart={showPositionChart}
          setShowPositionChart={setShowPositionChart}
          lineChartData={chartData.lineChartData}
          barChartData={chartData.barChartData}
          years={years}
          hiddenStocks={hiddenStocks}
          hiddenSeries={hiddenSeries}
          handleLegendClick={callbacks.handleLegendClick}
          formatLargeNumber={formatLargeNumber}
          currency={currency}
        />
      </Section>
    </div>
  );
}
