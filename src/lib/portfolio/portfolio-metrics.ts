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

/**
 * 计算指定年份的"年内净入金"（deposit - withdraw，按绝对值口径）。
 *
 * 数据约定：useYearData.addCashTransaction 在 withdraw 时把 amount 存为负值，
 * deposit 时存为正值。但**为了语义稳健**，本函数不依赖符号：
 * - 看 type === 'deposit' → 累加 |amount|
 * - 看 type === 'withdraw' → 累减 |amount|
 * - 其他 type（如 buy/sell，stockTransaction 触发的 cash 联动）忽略
 *
 * 返回正数表示净流入，负数表示净流出。
 *
 * @param yearData 年度数据
 * @param year 目标年份（字符串）
 */
export function computeYearNetDeposits(
  yearData: { [year: string]: YearData },
  year: string,
): number {
  const data = yearData[year];
  if (!data) return 0;
  let net = 0;
  data.cashTransactions.forEach((tx) => {
    const abs = Math.abs(tx.amount);
    if (tx.type === 'deposit') {
      net += abs;
    } else if (tx.type === 'withdraw') {
      net -= abs;
    }
    // 'buy' / 'sell' 等股票联动的现金流不计入
  });
  return net;
}

/**
 * 类型 A：年度同比增长率（含入金，百分比形式，如 12.5 表示 +12.5%）。
 *
 * 公式：(thisYear - lastYear) / lastYear × 100
 *
 * 边界：
 * - 第一年（years 中没有上一年）返回 null
 * - 上年末市值 ≤ 0 时返回 null
 * - 找不到 totalValues[prevYear] 时返回 null
 *
 * 与 computeYearlyGrowth 的区别：那个是 (lastYearValue, thisYearValue) 直接传值，
 * 边界返回 0；本函数从 totalValues map 里取值，并用 null 表达"不可计算"。
 */
export function computeYearGrowthRate(
  year: string,
  totalValues: { [year: string]: number },
  years: string[],
): number | null {
  const sortedYears = [...years].sort((a, b) => parseInt(a) - parseInt(b));
  const idx = sortedYears.indexOf(year);
  if (idx <= 0) return null; // 第一年或不在列表里
  const prevYear = sortedYears[idx - 1];
  const prevValue = totalValues[prevYear];
  const curValue = totalValues[year];
  if (prevValue === undefined || curValue === undefined) return null;
  if (prevValue <= 0) return null;
  return ((curValue - prevValue) / prevValue) * 100;
}

/**
 * 类型 B：年内"纯投资回报率"（不含本年入金，百分比形式）。
 *
 * 公式：(yearEndValue - yearNetDeposits) / prevYearEndValue - 1，× 100
 *
 * 含义：假设本年开始时持仓不动、年内新入的钱不影响"基线"，那么纯投资本身
 * 在这一年增长了多少。这是衡量"投资能力"而非"账户增长"的常用口径。
 *
 * 边界：
 * - 第一年（无上年）返回 null
 * - 上年末市值 ≤ 0 时返回 null
 * - 找不到对应数据时返回 null
 * - yearNetDeposits 可正可负（净取出），公式照用
 */
export function computeYearNetReturnRate(
  yearData: { [year: string]: YearData },
  years: string[],
  year: string,
  totalValues: { [year: string]: number },
): number | null {
  const sortedYears = [...years].sort((a, b) => parseInt(a) - parseInt(b));
  const idx = sortedYears.indexOf(year);
  if (idx <= 0) return null;
  const prevYear = sortedYears[idx - 1];
  const prevValue = totalValues[prevYear];
  const curValue = totalValues[year];
  if (prevValue === undefined || curValue === undefined) return null;
  if (prevValue <= 0) return null;
  const netDeposits = computeYearNetDeposits(yearData, year);
  return ((curValue - netDeposits) / prevValue - 1) * 100;
}
