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

// ============================================================================
// 新增：纯收益率与年内入金净额相关
// ============================================================================

import {
  computeYearNetDeposits,
  computeYearGrowthRate,
  computeYearNetReturnRate,
} from '@/lib/portfolio/portfolio-metrics';

const makeYearData = (overrides: Partial<YearData> = {}): YearData => ({
  stocks: [],
  cashTransactions: [],
  stockTransactions: [],
  cashBalance: 0,
  ...overrides,
});

describe('computeYearNetDeposits（年内净入金）', () => {
  it('仅 deposit 时累加金额', () => {
    const yearData: { [year: string]: YearData } = {
      '2024': makeYearData({
        cashTransactions: [
          { type: 'deposit', amount: 1000, date: '2024-01-01' },
          { type: 'deposit', amount: 500, date: '2024-06-01' },
        ],
      }),
    };
    expect(computeYearNetDeposits(yearData, '2024')).toBe(1500);
  });

  it('混合 deposit + withdraw（withdraw amount 为负数存储）', () => {
    const yearData: { [year: string]: YearData } = {
      '2024': makeYearData({
        cashTransactions: [
          { type: 'deposit', amount: 1000, date: '2024-01-01' },
          { type: 'withdraw', amount: -300, date: '2024-06-01' }, // 标准存法
        ],
      }),
    };
    expect(computeYearNetDeposits(yearData, '2024')).toBe(700);
  });

  it('withdraw amount 为正数存储（兜底）', () => {
    const yearData: { [year: string]: YearData } = {
      '2024': makeYearData({
        cashTransactions: [
          { type: 'deposit', amount: 1000, date: '2024-01-01' },
          { type: 'withdraw', amount: 300, date: '2024-06-01' }, // 也兼容
        ],
      }),
    };
    expect(computeYearNetDeposits(yearData, '2024')).toBe(700);
  });

  it('忽略 buy/sell（股票联动现金流不计入）', () => {
    const yearData: { [year: string]: YearData } = {
      '2024': makeYearData({
        cashTransactions: [
          { type: 'deposit', amount: 1000, date: '2024-01-01' },
          { type: 'buy', amount: -500, date: '2024-03-01', stockName: 'AAPL' },
          { type: 'sell', amount: 200, date: '2024-09-01', stockName: 'AAPL' },
        ],
      }),
    };
    expect(computeYearNetDeposits(yearData, '2024')).toBe(1000);
  });

  it('年份不存在：返回 0', () => {
    expect(computeYearNetDeposits({}, '2024')).toBe(0);
  });

  it('净流出场景：返回负数', () => {
    const yearData: { [year: string]: YearData } = {
      '2024': makeYearData({
        cashTransactions: [
          { type: 'deposit', amount: 100, date: '2024-01-01' },
          { type: 'withdraw', amount: -500, date: '2024-06-01' },
        ],
      }),
    };
    expect(computeYearNetDeposits(yearData, '2024')).toBe(-400);
  });
});

describe('computeYearGrowthRate（年度同比增长率，含入金）', () => {
  it('正常计算：(本年 - 上年) / 上年 × 100', () => {
    const totalValues = { '2023': 10000, '2024': 12000 };
    expect(computeYearGrowthRate('2024', totalValues, ['2023', '2024'])).toBe(20);
  });

  it('负增长', () => {
    const totalValues = { '2023': 10000, '2024': 8000 };
    expect(computeYearGrowthRate('2024', totalValues, ['2023', '2024'])).toBe(-20);
  });

  it('第一年（无上年）返回 null', () => {
    const totalValues = { '2024': 10000 };
    expect(computeYearGrowthRate('2024', totalValues, ['2024'])).toBeNull();
  });

  it('上年市值为 0 返回 null', () => {
    const totalValues = { '2023': 0, '2024': 10000 };
    expect(computeYearGrowthRate('2024', totalValues, ['2023', '2024'])).toBeNull();
  });

  it('上年市值缺失返回 null', () => {
    const totalValues = { '2024': 10000 };
    expect(computeYearGrowthRate('2024', totalValues, ['2023', '2024'])).toBeNull();
  });

  it('年份不在 years 列表里返回 null', () => {
    const totalValues = { '2023': 1000, '2024': 2000 };
    expect(computeYearGrowthRate('2025', totalValues, ['2023', '2024'])).toBeNull();
  });

  it('years 顺序乱序：自动按数字排序', () => {
    const totalValues = { '2022': 5000, '2023': 10000, '2024': 12000 };
    expect(computeYearGrowthRate('2024', totalValues, ['2024', '2022', '2023'])).toBe(20);
  });
});

describe('computeYearNetReturnRate（年内纯投资回报率，扣除本年入金）', () => {
  const baseYears = ['2023', '2024'];
  const baseTotalValues = { '2023': 10000, '2024': 15000 };

  it('简单情形：上年 1万 → 今年 1.5万，今年新入 2000，纯收益 = (15000-2000)/10000-1 = 30%', () => {
    const yearData: { [year: string]: YearData } = {
      '2024': makeYearData({
        cashTransactions: [{ type: 'deposit', amount: 2000, date: '2024-01-01' }],
      }),
    };
    expect(
      computeYearNetReturnRate(yearData, baseYears, '2024', baseTotalValues),
    ).toBeCloseTo(30, 5);
  });

  it('无入金的年份：等同于含入金的同比', () => {
    expect(
      computeYearNetReturnRate({}, baseYears, '2024', baseTotalValues),
    ).toBe(50); // (15000 - 0) / 10000 - 1 = 50%
  });

  it('净取出场景：纯收益更高（因为本金少了反而衬出投资能力）', () => {
    const yearData: { [year: string]: YearData } = {
      '2024': makeYearData({
        cashTransactions: [{ type: 'withdraw', amount: -3000, date: '2024-06-01' }],
      }),
    };
    // (15000 - (-3000)) / 10000 - 1 = 80%
    expect(
      computeYearNetReturnRate(yearData, baseYears, '2024', baseTotalValues),
    ).toBe(80);
  });

  it('第一年返回 null', () => {
    const yearData: { [year: string]: YearData } = {
      '2024': makeYearData({
        cashTransactions: [{ type: 'deposit', amount: 1000, date: '2024-01-01' }],
      }),
    };
    expect(
      computeYearNetReturnRate(yearData, ['2024'], '2024', { '2024': 1500 }),
    ).toBeNull();
  });

  it('上年市值缺失返回 null', () => {
    expect(
      computeYearNetReturnRate({}, baseYears, '2024', { '2024': 15000 }),
    ).toBeNull();
  });

  it('上年市值为 0 返回 null', () => {
    expect(
      computeYearNetReturnRate({}, baseYears, '2024', { '2023': 0, '2024': 15000 }),
    ).toBeNull();
  });

  it('负收益：投资亏损时纯收益为负', () => {
    const yearData: { [year: string]: YearData } = {
      '2024': makeYearData({
        cashTransactions: [{ type: 'deposit', amount: 5000, date: '2024-01-01' }],
      }),
    };
    // 上年 1万，今年 1.2万，本年入 5千 → 真实持有市值应是 1.5万，实际 1.2万 → 亏 3千
    // 纯收益 = (12000 - 5000) / 10000 - 1 = -30%
    expect(
      computeYearNetReturnRate(yearData, baseYears, '2024', { '2023': 10000, '2024': 12000 }),
    ).toBeCloseTo(-30, 5);
  });
});
