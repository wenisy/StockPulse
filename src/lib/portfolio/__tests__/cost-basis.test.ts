import {
  computeWeightedCostPrice,
  computeRemainingCostAfterSell,
  computeRealizedProfit,
} from '@/lib/portfolio/cost-basis';

describe('computeWeightedCostPrice（加权成本价：买入）', () => {
  it('首次买入时成本价等于交易价', () => {
    expect(computeWeightedCostPrice(0, 0, 100, 40)).toBe(40);
  });

  it('加仓时按总成本除以总股数计算', () => {
    // 100 股 @ 40 + 50 股 @ 50 = (4000 + 2500) / 150 = 43.333...
    expect(computeWeightedCostPrice(100, 40, 50, 50)).toBeCloseTo(43.33, 2);
  });

  it('零股加仓不应除零（newShares = 0 返回 0）', () => {
    expect(computeWeightedCostPrice(0, 0, 0, 40)).toBe(0);
  });

  it('总股数为负时返回 0', () => {
    expect(computeWeightedCostPrice(0, 0, -1, 40)).toBe(0);
  });

  it('两次价格相同的买入：成本价不变', () => {
    expect(computeWeightedCostPrice(100, 50, 50, 50)).toBe(50);
  });

  it('低价加仓：成本价被拉低', () => {
    // 100 @ 100 + 100 @ 50 = 15000 / 200 = 75
    expect(computeWeightedCostPrice(100, 100, 100, 50)).toBe(75);
  });
});

describe('computeRemainingCostAfterSell（卖出后剩余成本价）', () => {
  it('部分卖出：按现有 hook 行为（扣除卖出收入）', () => {
    // oldTotalCost = 100×40 = 4000；sellProceeds = 30×50 = 1500
    // remainingTotalCost = 2500；剩余股数 70；价 = 2500/70 ≈ 35.71
    expect(computeRemainingCostAfterSell(100, 40, 30, 50)).toBeCloseTo(35.71, 2);
  });

  it('全部卖出（剩余股数 = 0）：返回 0', () => {
    expect(computeRemainingCostAfterSell(100, 40, 100, 50)).toBe(0);
  });

  it('卖出超过持仓（剩余 < 0）：返回 0', () => {
    expect(computeRemainingCostAfterSell(100, 40, 150, 50)).toBe(0);
  });

  it('零成本基础：剩余成本 = 卖出收入的负数 / 剩余股数', () => {
    // oldTotalCost = 0；sellProceeds = 30×50 = 1500
    // remainingTotalCost = -1500；剩余股数 70；价 = -21.43
    expect(computeRemainingCostAfterSell(100, 0, 30, 50)).toBeCloseTo(-21.43, 2);
  });

  it('卖出价等于成本价：成本价不变', () => {
    expect(computeRemainingCostAfterSell(100, 40, 30, 40)).toBe(40);
  });
});

describe('computeRealizedProfit（卖出实现盈亏）', () => {
  it('盈利：(50 - 40) × 30 = 300', () => {
    expect(computeRealizedProfit(40, 30, 50)).toBe(300);
  });

  it('亏损：(30 - 40) × 30 = -300', () => {
    expect(computeRealizedProfit(40, 30, 30)).toBe(-300);
  });

  it('平本：txPrice = oldCostPrice', () => {
    expect(computeRealizedProfit(40, 30, 40)).toBe(0);
  });

  it('零成本卖出：盈亏 = 收入', () => {
    expect(computeRealizedProfit(0, 100, 50)).toBe(5000);
  });

  it('零股卖出：盈亏 = 0', () => {
    expect(computeRealizedProfit(40, 0, 50)).toBe(0);
  });
});
