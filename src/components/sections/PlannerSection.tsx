'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Section } from '@/components/ui/section';
import RetirementCalculator from '@/components/RetirementCalculator';
import ProfitLossCalendar from '@/components/ProfitLossCalendar';
import DailyTrendChart from '@/components/DailyTrendChart';
import { usePortfolio } from '@/components/shell/PortfolioContext';
import { TrendingUp } from 'lucide-react';

export function PlannerSection() {
  const { userSettings, chartData, portfolioData, trackerState } = usePortfolio();
  const { yearData, formatLargeNumber, latestYear } = portfolioData;
  const { currency } = trackerState;

  return (
    <div className="space-y-6">
      <PageHeader title="规划" description="退休目标 + 月度盈亏日历 + 每日资产走势" />
      <Section className="p-4 md:p-6">
        <h2 className="mb-4 text-base font-semibold text-fg">退休目标计算器</h2>
        <RetirementCalculator
          retirementGoal={userSettings.retirementGoal}
          annualReturn={userSettings.annualReturn}
          targetYears={userSettings.targetYears}
          calculationMode={userSettings.calculationMode}
          currency={currency}
          currentAmount={chartData.totalValues[latestYear] || 0}
          onRetirementGoalChange={userSettings.updateRetirementGoal}
          onAnnualReturnChange={userSettings.updateAnnualReturn}
          onTargetYearsChange={userSettings.updateTargetYears}
          onCalculationModeChange={userSettings.updateCalculationMode}
          onUseAverageReturn={() => {
            const latestRate = chartData.getLatestYearGrowthRate();
            if (latestRate) userSettings.updateAnnualReturn(latestRate);
          }}
          formatLargeNumber={(value, curr) => formatLargeNumber(value, curr || currency)}
        />
      </Section>
      <Section className="p-4 md:p-6">
        <h2 className="mb-4 text-base font-semibold text-fg">月度盈亏</h2>
        <ProfitLossCalendar
          selectedYear={latestYear}
          currency={currency}
          formatLargeNumber={formatLargeNumber}
          years={Object.keys(yearData)}
        />
      </Section>
      <Section className="p-4 md:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-fg">
          <TrendingUp className="h-4 w-4" />
          每日资产走势
        </h2>
        <DailyTrendChart
          currency={currency}
          formatLargeNumber={formatLargeNumber}
        />
      </Section>
    </div>
  );
}
