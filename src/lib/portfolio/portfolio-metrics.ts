import type { Stock, YearData } from '@/types/stock';

/**
 * 投资组合聚合指标。
 *
 * 抽自 useCalculations.ts。所有函数都是纯计算（无货币换算副作用）：
 * 货币换算应在调用侧叠加（hook 用 convertToCurrency 包一层），
 * 这样 metrics 本身可独立测试，且与 currency 模块解耦。
 *
 * 对应 spec：portfolio-domain
 * - 投资组合总价值
 * - 投资回报率
 * - 持仓占比
 * - 年度增长率
 */

/**
 * 某年度组合总价值 = Σ(stock.shares × stock.price) + cashBalance。
 *
 * @param stocks 该年度持仓（已过滤 hidden 等情况由调用方控制）
 * @param cashBalance 该年度现金余额
 */
export function computePortfolioValue(
  stocks: Stock[],
  cashBalance: number,
): number {
  const stockValue = stocks.reduce(
    (acc, stock) => acc + stock.shares * stock.price,
    0,
  );
  return stockValue + cashBalance;
}

/**
 * 投资回报率（百分比形式，如 25 表示 25%）。
 *
 * 公式：(组合价值 - 累计投入) / 累计投入 × 100
 *
 * 边界：累计投入 ≤ 0 时返回 0（避免除零或 Infinity）。
 *
 * @param portfolioValue 当前组合总价值
 * @param totalInvestment 累计投入成本（通常是 deposit 累加）
 */
export function computeReturnRate(
  portfolioValue: number,
  totalInvestment: number,
): number {
  if (totalInvestment <= 0) {
    return 0;
  }
  return ((portfolioValue - totalInvestment) / totalInvestment) * 100;
}

/**
 * 计算某年度内每个 stock + cash 的占比（百分比）。
 *
 * 边界：总价值 ≤ 0 时各项占比均为 0。
 *
 * @returns { [name]: percentage }，name 包括所有 stock.name 和 "现金"
 */
export function computeAllocation(
  stocks: Stock[],
  cashBalance: number,
): Record<string, number> {
  const total = computePortfolioValue(stocks, cashBalance);
  const result: Record<string, number> = {};
  if (total <= 0) {
    stocks.forEach((s) => {
      result[s.name] = 0;
    });
    result['现金'] = 0;
    return result;
  }
  stocks.forEach((s) => {
    result[s.name] = ((s.shares * s.price) / total) * 100;
  });
  result['现金'] = (cashBalance / total) * 100;
  return result;
}

/**
 * 跨年增长率（百分比形式）。
 *
 * 公式：(thisYearValue - lastYearValue) / lastYearValue × 100
 *
 * 边界：上年价值 ≤ 0 时返回 0。
 */
export function computeYearlyGrowth(
  lastYearValue: number,
  thisYearValue: number,
): number {
  if (lastYearValue <= 0) {
    return 0;
  }
  return ((thisYearValue - lastYearValue) / lastYearValue) * 100;
}

/**
 * 累计现金投入（截至 targetYear，含 targetYear 当年）。
 *
 * 行为对齐 useCalculations.calculateTotalInvestment：
 * deposit 累加 amount，withdraw 减去 amount（注意 withdraw 在 YearData 里
 * 存的 amount 已经是负值，所以这里是 -= amount，等效于"再减一次"）。
 *
 * @param yearData 年度数据
 * @param targetYear 目标年份（字符串）
 * @param years 当前 years 列表（用于截断）
 */
export function computeCumulativeCashInvested(
  yearData: { [year: string]: YearData },
  targetYear: string,
  years: string[],
): number {
  let total = 0;
  years
    .filter((year) => parseInt(year) <= parseInt(targetYear))
    .forEach((year) => {
      const data = yearData[year];
      if (!data) return;
      data.cashTransactions.forEach((tx) => {
        if (tx.type === 'deposit') {
          total += tx.amount;
        } else {
          // 对齐 useCalculations 现有行为：withdraw 时再减一次 amount
          // （amount 在 YearData 里已是负值，故 total 实际上 += |amount|）
          total -= tx.amount;
        }
      });
    });
  return total;
}
