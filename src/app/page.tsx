'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/shell/AppShell';

const LegacyTracker = dynamic(() => import('@/components/StockPortfolioTracker'), {
  ssr: false,
  loading: () => <div className="p-8 text-sm text-fg-muted">加载旧版视图…</div>,
});

export default function Home() {
  const [legacy, setLegacy] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLegacy(params.get('legacy') === '1');
  }, []);

  if (legacy === null) {
    // 首屏占位避免闪烁；主题已由 layout 的 FOUC 脚本处理，这里不需要额外 skeleton
    return <div className="min-h-dvh bg-bg" />;
  }

  if (legacy) {
    return (
      <main className="min-h-dvh bg-bg">
        <LegacyTracker />
      </main>
    );
  }

  return <AppShell />;
}
