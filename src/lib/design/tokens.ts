/**
 * Design tokens - 单一事实源
 *
 * 注意：本文件的颜色键必须与 src/app/globals.css 的 CSS 变量一一对应，
 * 由 tokens.test.ts 守护一致性。
 *
 * 业务组件应优先使用 Tailwind 语义 class（bg-bg, text-fg, text-fg-muted, ...），
 * 只有需要在运行期读取颜色（例如传给 Recharts）时才引用本文件。
 */

export const SEMANTIC_COLOR_KEYS = [
  'bg',
  'bg-elevated',
  'bg-subtle',
  'border-default',
  'border-subtle',
  'fg',
  'fg-muted',
  'fg-subtle',
  'brand',
  'brand-fg',
  'success',
  'success-fg',
  'warning',
  'warning-fg',
  'danger',
  'danger-fg',
  'info',
  'info-fg',
] as const;

export type SemanticColorKey = (typeof SEMANTIC_COLOR_KEYS)[number];

/**
 * 语义色对应的 CSS 变量名 (kebab-case)。
 * 业务代码通常不直接用本对象；需要 JS 运行时读色时用 `cssVar()` 即可。
 */
export const cssVarName = (key: SemanticColorKey): string => `--${key}`;

/**
 * 生成 `var(--xxx)` 引用字符串，便于直接赋给 Recharts 等库的 prop。
 *
 * ⚠️ 限制：Recharts 某些属性（如 AreaChart gradient stop 的 stopColor）
 *    不支持 CSS 变量；这类场景请改用 useResolvedCssColor() hook 在运行时读值。
 */
export const cssVar = (key: SemanticColorKey): string => `var(${cssVarName(key)})`;

/** 动效时长分级 */
export const motion = {
  fast: 120,
  base: 200,
  slow: 320,
} as const;

/** 动效曲线 */
export const easing = {
  outExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

/** 圆角分级（匹配 Tailwind 语义） */
export const radii = {
  sm: 'calc(var(--radius) - 4px)',
  md: 'calc(var(--radius) - 2px)',
  lg: 'var(--radius)',
  xl: 'calc(var(--radius) + 4px)',
} as const;

/** 响应式断点（仅一个分水岭） */
export const breakpoints = {
  md: 768,
} as const;
