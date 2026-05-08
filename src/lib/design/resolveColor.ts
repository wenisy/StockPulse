/**
 * 运行时读取 CSS 变量的计算值（用于 Recharts 等不支持 CSS 变量的场景）。
 */
import type { SemanticColorKey } from './tokens';
import { cssVarName } from './tokens';

export const resolveCssColor = (key: SemanticColorKey): string => {
  if (typeof window === 'undefined') return '';
  const styles = getComputedStyle(document.documentElement);
  return styles.getPropertyValue(cssVarName(key)).trim();
};
