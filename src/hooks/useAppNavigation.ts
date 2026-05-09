'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
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

const isValid = (v: string | null | undefined): v is SectionId =>
  !!v && (SECTION_IDS as readonly string[]).includes(v);

// ===== 模块级单例 store =====
// 所有调用 useAppNavigation() 的组件订阅同一份 state，setActiveSection 通知全员。

let currentSection: SectionId = DEFAULT;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

// snapshot 必须引用稳定（同值返回同一字符串，OK），React 才不会告警
const getSnapshot = (): SectionId => currentSection;
const getServerSnapshot = (): SectionId => DEFAULT;

const writeUrl = (id: SectionId) => {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  params.set('view', id);
  const url = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
  window.history.replaceState(null, '', url);
};

const writeStorage = (id: SectionId) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
};

/** 仅供测试用：重置 store。 */
export const __resetAppNavigationForTest = () => {
  currentSection = DEFAULT;
  listeners.clear();
};

/**
 * 客户端启动时调用一次，从 URL/localStorage 引导初始 section。
 * 优先级：URL ?view= > localStorage > 默认。
 */
const bootstrap = () => {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const urlView = params.get('view');
  if (isValid(urlView)) {
    if (currentSection !== urlView) {
      currentSection = urlView;
      notify();
    }
    return;
  }
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (isValid(stored)) {
    if (currentSection !== stored) {
      currentSection = stored;
      notify();
    }
    // 把 URL 也对齐一下
    writeUrl(stored);
  }
};

export const setActiveSectionGlobal = (id: SectionId) => {
  if (currentSection === id) return;
  currentSection = id;
  writeUrl(id);
  writeStorage(id);
  notify();
};

export const useAppNavigation = () => {
  const activeSection = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setActiveSection = useCallback((id: SectionId) => {
    setActiveSectionGlobal(id);
  }, []);

  // 首次挂载时引导一次（多次调用是幂等的，只有 currentSection 真变化才 notify）
  useEffect(() => {
    bootstrap();
  }, []);

  return {
    activeSection,
    setActiveSection,
    sections: SECTIONS,
  };
};
