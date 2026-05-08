import {
  computePortfolioValue,
  computeReturnRate,
  computeAllocation,
  computeYearlyGrowth,
  computeCumulativeCashInvested,
} from '@/lib/portfolio/portfolio-metrics';
import type { Stock, YearData } from '@/types/stock';

const stock = (overrides: Partial<Stock>): Stock => ({
  name: 'A',
  shares: 0,
  price: 0,
  costPrice: 0,
  id: 'x',
  ...overrides,
});

describe('computePortfolioValue（投资组合总价值）', () => {
  it('股票 + 现金叠加', () => {
    const stocks = [
      stock({ name: 'A', shares: 100, price: 50 }),
      stock({ name: 'B', shares: 200, price: 25 }),
    ];
    expect(computePortfolioValue(stocks, 5000)).toBe(15000);
  });

  it('仅有现金无股票', () => {
    expect(computePortfolioValue([], 10000)).toBe(10000);
  });

  it('仅有股票无现金', () => {
    expect(computePortfolioValue([stock({ shares: 10, price: 100 })], 0)).toBe(
      1000,
    );
  });

  it('空组合：返回 0', () => {
    expect(computePortfolioValue([], 0)).toBe(0);
  });

  it('负现金（透支场景）：仍按公式计算', () => {
    expect(computePortfolioValue([stock({ shares: 10, price: 100 })], -200)).toBe(800);
  });
});

describe('computeReturnRate（投资回报率）', () => {
  it('25% 正向回报：(5000 - 4000) / 4000 × 100', () => {
    expect(computeReturnRate(5000, 4000)).toBe(25);
  });

  it('亏损：负回报率', () => {
    expect(computeReturnRate(3000, 4000)).toBe(-25);
  });

  it('累计投入为 0：返回 0（边界）', () => {
    expect(computeReturnRate(5000, 0)).toBe(0);
  });

  it('累计投入为负数：返回 0（边界）', () => {
    expect(computeReturnRate(5000, -100)).toBe(0);
  });

  it('平本：组合价值等于投入', () => {
    expect(computeReturnRate(4000, 4000)).toBe(0);
  });
});

describe('computeAllocation（持仓占比）', () => {
  it('多股票 + 现金各占一份', () => {
    const stocks = [
      stock({ name: 'A', shares: 100, price: 50 }), // 5000
      stock({ name: 'B', shares: 200, price: 25 }), // 5000
    ];
    const result = computeAllocation(stocks, 10000);
    expect(result['A']).toBe(25);
    expect(result['B']).toBe(25);
    expect(result['现金']).toBe(50);
  });

  it('总价值为 0：所有占比为 0', () => {
    const stocks = [stock({ name: 'A', shares: 0, price: 0 })];
    const result = computeAllocation(stocks, 0);
    expect(result['A']).toBe(0);
    expect(result['现金']).toBe(0);
  });

  it('总价值为负：所有占比为 0（边界）', () => {
    const result = computeAllocation([], -100);
    expect(result['现金']).toBe(0);
  });

  it('单股票 100%', () => {
    const stocks = [stock({ name: 'A', shares: 10, price: 100 })];
    expect(computeAllocation(stocks, 0)['A']).toBe(100);
  });
});

describe('computeYearlyGrowth（年度增长率）', () => {
  it('25% 增长', () => {
    expect(computeYearlyGrowth(4000, 5000)).toBe(25);
  });

  it('负增长', () => {
    expect(computeYearlyGrowth(5000, 4000)).toBe(-20);
  });

  it('上年价值为 0：返回 0', () => {
    expect(computeYearlyGrowth(0, 5000)).toBe(0);
  });

  it('上年为负：返回 0（边界）', () => {
    expect(computeYearlyGrowth(-100, 5000)).toBe(0);
  });

  it('持平', () => {
    expect(computeYearlyGrowth(5000, 5000)).toBe(0);
  });
});

describe('computeCumulativeCashInvested（累计现金投入）', () => {
  const buildYearData = (): { [year: string]: YearData } => ({
    '2022': {
      stocks: [],
      cashTransactions: [
        { amount: 4000, type: 'deposit', date: '2022-01-01' },
      ],
      stockTransactions: [],
      cashBalance: 4000,
    },
    '2023': {
      stocks: [],
      cashTransactions: [
        { amount: 1000, type: 'deposit', date: '2023-01-01' },
      ],
      stockTransactions: [],
      cashBalance: 5000,
    },
  });

  it('截至 2023：累加 2022 + 2023 的 deposit', () => {
    const result = computeCumulativeCashInvested(
      buildYearData(),
      '2023',
      ['2022', '2023'],
    );
    expect(result).toBe(5000);
  });

  it('截至 2022：只累加到 2022', () => {
    const result = computeCumulativeCashInvested(
      buildYearData(),
      '2022',
      ['2022', '2023'],
    );
    expect(result).toBe(4000);
  });

  it('withdraw（YearData 中 amount 已为负）：再减一次（对齐现有行为）', () => {
    const yd: { [year: string]: YearData } = {
      '2024': {
        stocks: [],
        cashTransactions: [
          { amount: 1000, type: 'deposit', date: '2024-01-01' },
          // withdraw 500：amount 已经是 -500
          { amount: -500, type: 'withdraw', date: '2024-02-01' },
        ],
        stockTransactions: [],
        cashBalance: 500,
      },
    };
    // total += 1000；total -= -500（实际 += 500）→ 1500
    expect(computeCumulativeCashInvested(yd, '2024', ['2024'])).toBe(1500);
  });

  it('未登记的年份被跳过', () => {
    expect(
      computeCumulativeCashInvested(buildYearData(), '2024', [
        '2022',
        '2023',
        '2024',
      ]),
    ).toBe(5000);
  });

  it('空年份列表：返回 0', () => {
    expect(computeCumulativeCashInvested({}, '2024', [])).toBe(0);
  });
});
