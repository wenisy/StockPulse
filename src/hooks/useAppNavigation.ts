'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  LayoutDashboard,
  LineChart,
  Target,
  Wallet,
} from 'lucide-react';

export const SECTION_IDS = [
  'overview',
  'holdings',
  'transactions',
  'charts',
  'planner',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export type SectionDescriptor = {
  id: SectionId;
  label: string;
  icon: LucideIcon;
  href: string;
};

export const SECTIONS: readonly SectionDescriptor[] = [
  { id: 'overview', label: '总览', icon: LayoutDashboard, href: '?view=overview' },
  { id: 'holdings', label: '持仓', icon: Wallet, href: '?view=holdings' },
  { id: 'transactions', label: '交易', icon: LineChart, href: '?view=transactions' },
  { id: 'charts', label: '图表', icon: BarChart3, href: '?view=charts' },
  { id: 'planner', label: '规划', icon: Target, href: '?view=planner' },
];

const STORAGE_KEY = 'sp-nav-section';
const DEFAULT: SectionId = 'overview';

const isValid = (v: string | null): v is SectionId =>
  !!v && (SECTION_IDS as readonly string[]).includes(v);

const readInitial = (): SectionId => {
  if (typeof window === 'undefined') return DEFAULT;
  const params = new URLSearchParams(window.location.search);
  const urlView = params.get('view');
  if (isValid(urlView)) return urlView;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isValid(stored)) return stored;
  return DEFAULT;
};

const writeSection = (id: SectionId) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, id);
  const params = new URLSearchParams(window.location.search);
  params.set('view', id);
  const url = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', url);
};

export const useAppNavigation = () => {
  const [activeSection, setActive] = useState<SectionId>(DEFAULT);

  // 首次挂载从 URL/localStorage 恢复
  useEffect(() => {
    const init = readInitial();
    if (init !== DEFAULT) setActive(init);
    // 保证 URL 和 state 对齐
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') !== init) {
        params.set('view', init);
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}?${params.toString()}`,
        );
      }
    }
  }, []);

  const setActiveSection = useCallback((id: SectionId) => {
    setActive(id);
    writeSection(id);
  }, []);

  return {
    activeSection,
    setActiveSection,
    sections: SECTIONS,
  };
};
