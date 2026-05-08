/**
 * 持仓成本相关纯计算。
 *
 * 抽自 useStockOperations.ts:163-237 的 confirmAddNewStock 内联逻辑，
 * 行为完全一致；目的是让计算可独立测试与复用。
 *
 * 对应 spec：portfolio-domain
 * - 加权成本价（买入）
 * - 卖出后剩余成本与实现盈亏
 */

/**
 * 买入加权成本价。
 *
 * `newCostPrice = (oldShares × oldCostPrice + txShares × txPrice)
 *                  / (oldShares + txShares)`
 *
 * 边界：当 oldShares + txShares ≤ 0 时返回 0，避免除零。
 *
 * @param oldShares 原持仓股数（首次买入为 0）
 * @param oldCostPrice 原成本价（首次买入为 0）
 * @param txShares 本次买入股数
 * @param txPrice 本次买入价
 */
export function computeWeightedCostPrice(
  oldShares: number,
  oldCostPrice: number,
  txShares: number,
  txPrice: number,
): number {
  const newShares = oldShares + txShares;
  if (newShares <= 0) {
    return 0;
  }
  const oldTotalCost = oldShares * oldCostPrice;
  const newTotalCost = oldTotalCost + txShares * txPrice;
  return newTotalCost / newShares;
}

/**
 * 卖出后剩余成本价。
 *
 * 算法（来自现有 hook 实现，行为锁定不可改）：
 * - 剩余股数 = oldShares - txShares
 * - 剩余总成本 = oldShares × oldCostPrice - txShares × txPrice
 * - 剩余成本价 = 剩余股数 > 0 ? 剩余总成本 / 剩余股数 : 0
 *
 * 注意：此处"剩余总成本"按"扣除卖出收入"而非"按比例核销"计算，
 * 这是项目现有行为；任何对此语义的修订属于另一个提案，本提案
 * 必须保持行为不变。
 *
 * @param oldShares 原持仓股数
 * @param oldCostPrice 原成本价
 * @param txShares 本次卖出股数
 * @param txPrice 本次卖出价
 */
export function computeRemainingCostAfterSell(
  oldShares: number,
  oldCostPrice: number,
  txShares: number,
  txPrice: number,
): number {
  const remainingShares = oldShares - txShares;
  if (remainingShares <= 0) {
    return 0;
  }
  const oldTotalCost = oldShares * oldCostPrice;
  const sellProceeds = txShares * txPrice;
  const remainingTotalCost = oldTotalCost - sellProceeds;
  return remainingTotalCost / remainingShares;
}

/**
 * 卖出实现盈亏。
 *
 * `realizedProfit = (txPrice - oldCostPrice) × txShares`
 *
 * 正数为盈利、负数为亏损、零为平本。
 *
 * @param oldCostPrice 卖出前的成本价
 * @param txShares 卖出股数
 * @param txPrice 卖出价
 */
export function computeRealizedProfit(
  oldCostPrice: number,
  txShares: number,
  txPrice: number,
): number {
  return (txPrice - oldCostPrice) * txShares;
}
