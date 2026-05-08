'use client';

import { TrendingUp, Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import type { ReactNode } from 'react';

export function TopNav({
  onMenuClick,
  rightSlot,
}: {
  onMenuClick?: () => void;
  rightSlot?: ReactNode;
}) {
  const { activeSection, sections } = useAppNavigation();
  const currentLabel =
    sections.find((s) => s.id === activeSection)?.label ?? '';

  return (
    <header
      data-slot="top-nav"
      className={cn(
        'sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border-subtle bg-bg-elevated/80 px-4 backdrop-blur-md',
        'md:px-6',
      )}
    >
      {/* 移动端汉堡（保留但本批次 drawer 未实现，仅 aria） */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="菜单"
        className="flex h-9 w-9 items-center justify-center rounded-md text-fg-muted hover:bg-bg-subtle md:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-fg">
          <TrendingUp className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-sm font-semibold tracking-tight text-fg">StockPulse</span>
      </div>

      {/* 当前 section 名（md+） */}
      <span className="hidden text-sm text-fg-subtle md:inline">/</span>
      <span className="hidden text-sm font-medium text-fg-muted md:inline">
        {currentLabel}
      </span>

      {/* 右侧：主题 + 用户入口（父组件传入） */}
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        {rightSlot}
      </div>
    </header>
  );
}
