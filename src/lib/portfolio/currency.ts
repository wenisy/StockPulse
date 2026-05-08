import type { ExchangeRates } from '@/types/stock';

/**
 * 把金额从美元基准换算到目标货币。
 *
 * 公式：`convertedAmount = amount / rate`，其中 rate 来自
 * `exchangeRates[targetCurrency]`，缺省 1（即未知货币按 1:1 兜底）。
 *
 * 对应 spec：portfolio-domain → 货币换算
 *
 * @param amount 原始金额（美元基准）
 * @param targetCurrency 目标货币代码（USD / HKD / CNY 等）
 * @param exchangeRates 当前汇率表
 */
export function convertToCurrency(
  amount: number,
  targetCurrency: string,
  exchangeRates: ExchangeRates,
): number {
  const rate = exchangeRates[targetCurrency] || 1;
  return amount / rate;
}

/**
 * 大数本地化格式化。先按目标货币换算，再用 zh-CN 千分位格式输出，
 * 最多保留 2 位小数。
 *
 * 对应 spec：portfolio-domain → 大数本地化格式化
 *
 * @param num 原始金额（美元基准）
 * @param targetCurrency 目标货币代码
 * @param exchangeRates 当前汇率表
 */
export function formatLargeNumber(
  num: number,
  targetCurrency: string,
  exchangeRates: ExchangeRates,
): string {
  const convertedNum = convertToCurrency(num, targetCurrency, exchangeRates);
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(
    convertedNum,
  );
}
