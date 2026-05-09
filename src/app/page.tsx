'use client';

import dynamic from 'next/dynamic';

// 整个 AppShell 用 dynamic + ssr:false, 避免 SSR 阶段 client hook 报 not-found
const AppShell = dynamic(
  () => import('@/components/shell/AppShell').then((m) => m.AppShell),
  {
    ssr: false,
    loading: () => <div className="min-h-dvh bg-bg" />,
  },
);

export default function Home() {
  return <AppShell />;
}
