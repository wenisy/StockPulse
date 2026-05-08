/**
 * 年份数组工具。
 *
 * 抽自 usePortfolioData.ts 多处。所有函数都不修改输入数组。
 *
 * 对应 spec：portfolio-domain（隐含约定 —— spec 没专门把它列为
 * Requirement，但多处 scenario 隐含使用）
 */

/**
 * 按年份字符串降序排列（"2024" 在 "2023" 前）。
 *
 * 行为对齐 usePortfolioData 的 `Object.keys(initialData).sort((a, b) =>
 * parseInt(b) - parseInt(a))`。
 *
 * 不修改入参。
 */
export function sortYearsDesc(years: string[]): string[] {
  return [...years].sort((a, b) => parseInt(b) - parseInt(a));
}

/**
 * 取年份数组中数值上最大的年份。空数组兜底返回 '2024'。
 *
 * 行为对齐 usePortfolioData.ts:107：
 * `years.length > 0 ? Math.max(...years.map(Number)).toString() : '2024'`
 */
export function computeLatestYear(years: string[]): string {
  if (years.length === 0) {
    return '2024';
  }
  return Math.max(...years.map(Number)).toString();
}
