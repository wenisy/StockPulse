import { renderHook } from '@testing-library/react';
import { useChartData } from '../useChartData';
import type { YearData } from '@/types/stock';

const makeYearData = (): { [y: string]: YearData } => ({
  '2023': {
    stocks: [{ name: 'A', shares: 100, price: 40, costPrice: 40, id: 'a1' }],
    cashTransactions: [],
    stockTransactions: [],
    cashBalance: 1000,
  },
  '2024': {
    stocks: [{ name: 'A', shares: 100, price: 50, costPrice: 40, id: 'a1' }],
    cashTransactions: [],
    stockTransactions: [],
    cashBalance: 2000,
  },
});

describe('useChartData', () => {
  const render = (hidden: { [k: string]: boolean } = {}) =>
    renderHook(() =>
      useChartData({
        yearData: makeYearData(),
        years: ['2024', '2023'],
        latestYear: '2024',
        hiddenStocks: hidden,
      }),
    );

  it('totalValues：按年统计总价值（股票 + cash）', () => {
    const { result } = render();
    expect(result.current.totalValues['2023']).toBe(5000); // 4000 + 1000
    expect(result.current.totalValues['2024']).toBe(7000); // 5000 + 2000
  });

  it('calculateYearlyValues：返回每年的各股票价值', () => {
    const { result } = render();
    const vals = result.current.calculateYearlyValues();
    expect(vals['2024']['A']).toBe(5000);
    expect(vals['2024']['total']).toBe(5000);
  });

  it('隐藏股票时不计入 totalValues', () => {
    const { result } = render({ A: true });
    expect(result.current.totalValues['2024']).toBe(2000); // 只剩 cash
  });

  it('lineChartData 为数组', () => {
    const { result } = render();
    expect(Array.isArray(result.current.lineChartData)).toBe(true);
  });

  it('barChartData 为数组', () => {
    const { result } = render();
    expect(Array.isArray(result.current.barChartData)).toBe(true);
  });

  it('calculateInvestmentReturn 返回包含 portfolioValue 的对象', () => {
    const { result } = render();
    const ret = result.current.calculateInvestmentReturn('2024');
    expect(ret).toHaveProperty('portfolioValue');
    expect(ret).toHaveProperty('percentageReturn');
  });

  it('getLatestYearGrowthRate：无 deposits 时返回空字符串', () => {
    const { result } = render();
    // 测试数据无 cashTransactions，netDeposits=0，故返回 ""
    const rate = result.current.getLatestYearGrowthRate();
    expect(rate).toBe('');
  });
});

// ==================== shares=0 防回归测试 ====================
// 用户场景：用户在 2026 年清仓了 Amazon (shares=0 但条目仍在)，
// 该股票不应出现在折线图、柱状图任何展示层中。

describe('useChartData - shares=0 过滤防回归', () => {
  const makeWithZeroShares = (): { [y: string]: YearData } => ({
    '2023': {
      stocks: [
        { name: 'AAPL', shares: 100, price: 150, costPrice: 100, id: 'a1' },
        { name: 'AMZN', shares: 50, price: 200, costPrice: 180, id: 'a2' },
      ],
      cashTransactions: [],
      stockTransactions: [],
      cashBalance: 1000,
    },
    '2024': {
      stocks: [
        { name: 'AAPL', shares: 120, price: 180, costPrice: 100, id: 'a1' },
        { name: 'AMZN', shares: 0, price: 220, costPrice: 180, id: 'a2' }, // 已清仓
      ],
      cashTransactions: [],
      stockTransactions: [],
      cashBalance: 2000,
    },
  });

  const renderZ = () =>
    renderHook(() =>
      useChartData({
        yearData: makeWithZeroShares(),
        years: ['2024', '2023'],
        latestYear: '2024',
        hiddenStocks: {},
      }),
    );

  it('lineChartData：shares=0 股票不作为 key 出现', () => {
    const { result } = renderZ();
    const dataPoint2024 = result.current.lineChartData.find((d) => d.year === '2024');
    expect(dataPoint2024).toBeDefined();
    expect(dataPoint2024).not.toHaveProperty('AMZN');
    expect(dataPoint2024).toHaveProperty('AAPL');
  });

  it('lineChartData：shares>0 的股票仍正常出现', () => {
    const { result } = renderZ();
    const dataPoint2024 = result.current.lineChartData.find((d) => d.year === '2024');
    expect(dataPoint2024?.AAPL).toBe(120 * 180);
  });

  it('barChartData：shares=0 股票不计入', () => {
    const { result } = renderZ();
    const amznRow = result.current.barChartData.find((row) => row.name === 'AMZN');
    expect(amznRow).toBeUndefined();
    const aaplRow = result.current.barChartData.find((row) => row.name === 'AAPL');
    expect(aaplRow).toBeDefined();
  });

  it('混合场景：所有股票都 shares=0 时 lineChartData 不含股票 key', () => {
    const yearData: { [y: string]: YearData } = {
      '2024': {
        stocks: [{ name: 'X', shares: 0, price: 100, costPrice: 100, id: 'x1' }],
        cashTransactions: [],
        stockTransactions: [],
        cashBalance: 5000,
      },
    };
    const { result } = renderHook(() =>
      useChartData({
        yearData,
        years: ['2024'],
        latestYear: '2024',
        hiddenStocks: {},
      }),
    );
    const point = result.current.lineChartData[0];
    expect(point).not.toHaveProperty('X');
    // total 在 yearlyValues 里仅累计股票市值（不含 cash），shares=0 故 total=0
    expect(point.total).toBe(0);
  });
});

// ==================== 数值边界 / 空数据防回归 ====================

describe('useChartData - 边界保护', () => {
  it('yearData={} 时 lineChartData 为空数组', () => {
    const { result } = renderHook(() =>
      useChartData({
        yearData: {},
        years: [],
        latestYear: '2024',
        hiddenStocks: {},
      }),
    );
    expect(result.current.lineChartData).toEqual([]);
  });

  it('yearData={} 时 totalValues 为空对象', () => {
    const { result } = renderHook(() =>
      useChartData({
        yearData: {},
        years: [],
        latestYear: '2024',
        hiddenStocks: {},
      }),
    );
    expect(result.current.totalValues).toEqual({});
  });

  it('years=[] 时 getLatestYearGrowthRate 返回空字符串（不 NaN）', () => {
    const { result } = renderHook(() =>
      useChartData({
        yearData: {},
        years: [],
        latestYear: '2024',
        hiddenStocks: {},
      }),
    );
    expect(result.current.getLatestYearGrowthRate()).toBe('');
  });

  it('cashTransactions 全空 → getLatestYearGrowthRate 返回空字符串（netDeposits<=0）', () => {
    const yearData: { [y: string]: YearData } = {
      '2023': {
        stocks: [{ name: 'A', shares: 100, price: 40, costPrice: 40, id: 'a1' }],
        cashTransactions: [],
        stockTransactions: [],
        cashBalance: 1000,
      },
      '2024': {
        stocks: [{ name: 'A', shares: 100, price: 50, costPrice: 40, id: 'a1' }],
        cashTransactions: [],
        stockTransactions: [],
        cashBalance: 2000,
      },
    };
    const { result } = renderHook(() =>
      useChartData({
        yearData,
        years: ['2024', '2023'],
        latestYear: '2024',
        hiddenStocks: {},
      }),
    );
    expect(result.current.getLatestYearGrowthRate()).toBe('');
  });

  it('单年数据 calculateInvestmentReturn 返回有限数（不 NaN）', () => {
    const yearData: { [y: string]: YearData } = {
      '2024': {
        stocks: [{ name: 'A', shares: 100, price: 50, costPrice: 40, id: 'a1' }],
        cashTransactions: [],
        stockTransactions: [],
        cashBalance: 0,
      },
    };
    const { result } = renderHook(() =>
      useChartData({
        yearData,
        years: ['2024'],
        latestYear: '2024',
        hiddenStocks: {},
      }),
    );
    const ret = result.current.calculateInvestmentReturn('2024');
    expect(Number.isFinite(ret.percentageReturn)).toBe(true);
    expect(Number.isFinite(ret.absoluteReturn)).toBe(true);
  });

  it('barChartData 为空数据时不抛', () => {
    expect(() => {
      renderHook(() =>
        useChartData({
          yearData: {},
          years: [],
          latestYear: '2024',
          hiddenStocks: {},
        }),
      );
    }).not.toThrow();
  });
});
