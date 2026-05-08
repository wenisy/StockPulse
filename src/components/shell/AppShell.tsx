'use client';

import { type ReactNode } from 'react';
import { PortfolioProvider, usePortfolio } from './PortfolioContext';
import { TopNav } from './TopNav';
import { SideNav } from './SideNav';
import { BottomTabBar } from './BottomTabBar';
import { UserPanelSlot } from './UserPanelSlot';
import { AlertDialog } from '@/components/tracker/AlertDialog';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { OverviewSection } from '@/components/sections/overview/OverviewSection';
import { HoldingsSection } from '@/components/sections/holdings/HoldingsSection';
import { TransactionsSection } from '@/components/sections/TransactionsSection';
import { ChartsSection } from '@/components/sections/ChartsSection';
import { PlannerSection } from '@/components/sections/PlannerSection';

function ShellInner({ children }: { children?: ReactNode }) {
  const { activeSection } = useAppNavigation();
  const { trackerState } = usePortfolio();

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection />;
      case 'holdings':
        return <HoldingsSection />;
      case 'transactions':
        return <TransactionsSection />;
      case 'charts':
        return <ChartsSection />;
      case 'planner':
        return <PlannerSection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <TopNav rightSlot={<UserPanelSlot />} />
      <div className="flex flex-1">
        <SideNav />
        <main className="min-w-0 flex-1 pb-24 md:pb-8">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8 animate-fade-in" key={activeSection}>
            {children ?? renderSection()}
          </div>
        </main>
      </div>
      <BottomTabBar />

      {/* 全局 Alert */}
      <AlertDialog
        alertInfo={trackerState.alertInfo}
        onOpenChange={(open) => {
          if (!open) trackerState.setAlertInfo(null);
        }}
      />
    </div>
  );
}

export function AppShell({ children }: { children?: ReactNode }) {
  return (
    <PortfolioProvider>
      <ShellInner>{children}</ShellInner>
    </PortfolioProvider>
  );
}
