'use client';

import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { PortfolioProvider, usePortfolio } from './PortfolioContext';
import { TopNav } from './TopNav';
import { SideNav } from './SideNav';
import { BottomTabBar } from './BottomTabBar';
import { UserPanelSlot } from './UserPanelSlot';
import { AlertDialog } from '@/components/tracker/AlertDialog';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { OverviewSection } from '@/components/sections/overview/OverviewSection';
import { HoldingsSection } from '@/components/sections/holdings/HoldingsSection';
import { TransactionsSection } from '@/components/sections/TransactionsSection';
import { ChartsSection } from '@/components/sections/ChartsSection';
import { PlannerSection } from '@/components/sections/PlannerSection';

/** 移动端侧边抽屉菜单 */
function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { activeSection, setActiveSection, sections } = useAppNavigation();

  return (
    <>
      {/* 遮罩 */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-[var(--motion-base)] md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* 抽屉面板 */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="导航菜单"
        className={cn(
          'fixed left-0 top-0 z-50 flex h-dvh w-64 flex-col border-r border-border-subtle bg-bg-elevated shadow-xl',
          'transition-transform duration-[var(--motion-base)] ease-[cubic-bezier(0.16,1,0.3,1)]',
          'md:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* 抽屉头部 */}
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <span className="text-sm font-semibold text-fg">导航</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭菜单"
            className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-bg-subtle"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 导航列表 */}
        <nav className="flex flex-col gap-0.5 p-3">
          {sections.map(({ id, label, icon: Icon }) => {
            const active = id === activeSection;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveSection(id);
                  onClose();
                }}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors duration-[var(--motion-fast)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                  active
                    ? 'bg-brand/10 text-brand font-medium'
                    : 'text-fg-muted hover:bg-bg-subtle hover:text-fg',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

function ShellInner({ children }: { children?: ReactNode }) {
  const { activeSection } = useAppNavigation();
  const { trackerState } = usePortfolio();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      <TopNav
        rightSlot={<UserPanelSlot />}
        onMenuClick={isMobile ? () => setDrawerOpen(true) : undefined}
      />

      {/* 移动端侧边抽屉 */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex flex-1">
        <SideNav />
        <main className="min-w-0 flex-1 pb-24 md:pb-8">
          <div
            className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8 animate-fade-in"
            key={activeSection}
          >
            {children ?? renderSection()}
          </div>
        </main>
      </div>
      <BottomTabBar />

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
