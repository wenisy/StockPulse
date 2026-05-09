'use client';

import { useEffect, useState } from 'react';
import { resolveCssColor } from '@/lib/design/resolveColor';
import { useTheme } from './useTheme';

/**
 * 主题响应的颜色对象，专门为 Recharts 等"不支持 CSS 变量的库"设计。
 * 订阅 resolvedTheme 变化，自动重新读取 CSS 变量的计算值。
 */
export type ResolvedColors = {
  brand: string;
  brandFg: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
  fg: string;
  fgMuted: string;
  bgElevated: string;
  bgSubtle: string;
  borderDefault: string;
  borderSubtle: string;
  chartColors: string[]; // 5 色循环调色板
};

const DEFAULT: ResolvedColors = {
  brand: '#6366f1',
  brandFg: '#ffffff',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  fg: '#1e293b',
  fgMuted: '#64748b',
  bgElevated: '#ffffff',
  bgSubtle: '#f8fafc',
  borderDefault: '#e2e8f0',
  borderSubtle: '#f1f5f9',
  chartColors: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6'],
};

const readColors = (): ResolvedColors => {
  const brand = resolveCssColor('brand') || DEFAULT.brand;
  const success = resolveCssColor('success') || DEFAULT.success;
  const danger = resolveCssColor('danger') || DEFAULT.danger;
  const warning = resolveCssColor('warning') || DEFAULT.warning;
  const info = resolveCssColor('info') || DEFAULT.info;
  return {
    brand,
    brandFg: resolveCssColor('brand-fg') || DEFAULT.brandFg,
    success,
    danger,
    warning,
    info,
    fg: resolveCssColor('fg') || DEFAULT.fg,
    fgMuted: resolveCssColor('fg-muted') || DEFAULT.fgMuted,
    bgElevated: resolveCssColor('bg-elevated') || DEFAULT.bgElevated,
    bgSubtle: resolveCssColor('bg-subtle') || DEFAULT.bgSubtle,
    borderDefault: resolveCssColor('border-default') || DEFAULT.borderDefault,
    borderSubtle: resolveCssColor('border-subtle') || DEFAULT.borderSubtle,
    chartColors: [brand, success, warning, danger, info],
  };
};

export const useResolvedColors = (): ResolvedColors => {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<ResolvedColors>(DEFAULT);

  useEffect(() => {
    setColors(readColors());
  }, [resolvedTheme]);

  return colors;
};
