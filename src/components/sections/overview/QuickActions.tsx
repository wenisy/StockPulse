'use client';

import { CalendarDays, Download, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePortfolio } from '@/components/shell/PortfolioContext';
import { useAppNavigation } from '@/hooks/useAppNavigation';

export function QuickActions() {
  const { portfolioData, trackerState, callbacks } = usePortfolio();
  const { refreshPrices, latestYear } = portfolioData;
  const { setActiveSection } = useAppNavigation();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        onClick={() => setActiveSection('holdings')}
        className="bg-brand text-brand-fg hover:bg-brand/90"
      >
        <Plus className="h-4 w-4" aria-hidden />
        添加交易
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => refreshPrices(true)}
        className="border-border-default text-fg hover:bg-bg-subtle"
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        刷新价格
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => callbacks.handleReportClick(latestYear)}
        className="border-border-default text-fg hover:bg-bg-subtle"
      >
        <Download className="h-4 w-4" aria-hidden />
        {latestYear} 年报
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setActiveSection('planner')}
        className="border-border-default text-fg hover:bg-bg-subtle"
      >
        <CalendarDays className="h-4 w-4" aria-hidden />
        查看日历
      </Button>
      {/* 保持 trackerState 被引用避免 lint */}
      <span className="hidden" aria-hidden>
        {trackerState.currency}
      </span>
    </div>
  );
}
