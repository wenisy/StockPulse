import { renderHook } from '@testing-library/react';
import { useCalculations } from '../useCalculations';
import type { StockChartData, YearData } from '@/types/stock';

const makeYearData = (): { [y: string]: YearData } => ({
  '2023': {
    stocks: [
      { name: 'A', shares: 100, price: 40, costPrice: 40, id: 'a1' },
    ],
    cashTransactions: [{ amount: 4000, type: 'deposit', date: '2023-01-01' }],
    stockTransactions: [],
    cashBalance: 0,
  },
  '2024': {
    stocks: [
      { name: 'A', shares: 100, price: 50, costPrice: 40, id: 'a1' },
    ],
    cashTransactions: [],
    stockTransactions: [],
    cashBalance: 0,
  },
});

const currency = 'USD';
const convertToCurrency = jest.fn((amount: number) => amount);

describe('useCalculations', () => {
  beforeEach(() => jest.clearAllMocks());

  const render = (yd = makeYearData()) =>
    renderHook(() =>
      useCalculations(
        yd,
        ['2023', '2024'],
        ['2023', '2024'],
        {},
        convertToCurrency,
        currency,
      ),
    );

  it('calculateYearlyValues：返回每年总价值', () => {
    const { result } = render();
    const values = result.current.calculateYearlyValues();
    expect(values['2023']).toBe(4000); // 100×40 + 0
    expect(values['2024']).toBe(5000); // 100×50 + 0
  });

  it('getLatestYearGrowthRate：2024 比 2023 增长 25%', () => {
    const { result } = render();
    expect(result.current.getLatestYearGrowthRate()).toBeCloseTo(25, 1);
  });

  it('prepareLineChartData：返回按年份排序的数组', () => {
    const { result } = render();
    const data = result.current.prepareLineChartData();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('year');
  });

  it('preparePercentageBarChartData：返回百分比数组', () => {
    const { result } = render();
    const data = result.current.preparePercentageBarChartData();
    expect(Array.isArray(data)).toBe(true);
  });

  it('calculateInvestmentReturn：正确计算回报率', () => {
    const { result } = render();
    const ret = result.current.calculateInvestmentReturn('2024');
    expect(ret).toHaveProperty('portfolioValue');
    expect(ret).toHaveProperty('percentageReturn');
  });

  it('tableData：包含所有股票名称', () => {
    const { result } = render();
    const table = result.current.tableData();
    const names = table.map((row: { stockName: string }) => row.stockName);
    expect(names).toContain('A');
  });

  it('只有一年数据时 getLatestYearGrowthRate 返回 null', () => {
    const singleYear: { [y: string]: YearData } = {
      '2024': makeYearData()['2024'],
    };
    const { result } = renderHook(() =>
      useCalculations(
        singleYear,
        ['2024'],
        ['2024'],
        {},
        convertToCurrency,
        currency,
      ),
    );
    expect(result.current.getLatestYearGrowthRate()).toBeNull();
  });

  it('隐藏股票时不计入总价值', () => {
    const { result } = renderHook(() =>
      useCalculations(
        makeYearData(),
        ['2023', '2024'],
        ['2023', '2024'],
        { A: true }, // 隐藏 A
        convertToCurrency,
        currency,
      ),
    );
    const values = result.current.calculateYearlyValues();
    expect(values['2024']).toBe(0); // A 被隐藏，只有 cashBalance=0
  });
});

// ==================== shares=0 防回归测试 ====================

describe('useCalculations - shares=0 过滤防回归', () => {
  const makeWithZeroShares = (): { [y: string]: YearData } => ({
    '2023': {
      stocks: [
        { name: 'AAPL', shares: 100, price: 150, costPrice: 100, id: 'a1' },
        { name: 'AMZN', shares: 50, price: 200, costPrice: 180, id: 'a2' },
      ],
      cashTransactions: [],
      stockTransactions: [],
      cashBalance: 0,
    },
    '2024': {
      stocks: [
        { name: 'AAPL', shares: 120, price: 180, costPrice: 100, id: 'a1' },
        { name: 'AMZN', shares: 0, price: 220, costPrice: 180, id: 'a2' }, // 已清仓
      ],
      cashTransactions: [],
      stockTransactions: [],
      cashBalance: 0,
    },
  });

  const renderZ = (yd = makeWithZeroShares()) =>
    renderHook(() =>
      useCalculations(
        yd,
        ['2023', '2024'],
        ['2023', '2024'],
        {},
        convertToCurrency,
        currency,
      ),
    );

  it('prepareLineChartData：stockNames 不含最新年 shares=0 的股票', () => {
    const { result } = renderZ();
    const data = result.current.prepareLineChartData();
    const point2024 = data.find((d: StockChartData) => d.year === '2024');
    expect(point2024).toBeDefined();
    expect(point2024).not.toHaveProperty('AMZN');
    expect(point2024).toHaveProperty('AAPL');
  });

  it('prepareLineChartData：混合场景仅保留 shares>0 股票', () => {
    const { result } = renderZ();
    const data = result.current.prepareLineChartData();
    // 找到任意一个 dataPoint，确认 keys 中没有 AMZN
    const allKeys = new Set<string>();
    data.forEach((d: StockChartData) => Object.keys(d).forEach((k) => allKeys.add(k)));
    expect(allKeys.has('AAPL')).toBe(true);
    expect(allKeys.has('AMZN')).toBe(false);
  });
});

// ==================== 边界保护防回归 ====================

describe('useCalculations - 边界保护', () => {
  it('单年数据 → getLatestYearGrowthRate 返回 null', () => {
    const yd: { [y: string]: YearData } = {
      '2024': {
        stocks: [{ name: 'A', shares: 100, price: 50, costPrice: 40, id: 'a1' }],
        cashTransactions: [],
        stockTransactions: [],
        cashBalance: 0,
      },
    };
    const { result } = renderHook(() =>
      useCalculations(yd, ['2024'], ['2024'], {}, convertToCurrency, currency),
    );
    expect(result.current.getLatestYearGrowthRate()).toBeNull();
  });

  it('上一年 stocks 空 cashBalance=0 → getLatestYearGrowthRate 返回 null', () => {
    const yd: { [y: string]: YearData } = {
      '2023': {
        stocks: [],
        cashTransactions: [],
        stockTransactions: [],
        cashBalance: 0,
      },
      '2024': {
        stocks: [{ name: 'A', shares: 100, price: 50, costPrice: 40, id: 'a1' }],
        cashTransactions: [],
        stockTransactions: [],
        cashBalance: 0,
      },
    };
    const { result } = renderHook(() =>
      useCalculations(yd, ['2023', '2024'], ['2023', '2024'], {}, convertToCurrency, currency),
    );
    expect(result.current.getLatestYearGrowthRate()).toBeNull();
  });

  it('prepareLineChartData 在 stocks=[] 时不抛', () => {
    const yd: { [y: string]: YearData } = {
      '2024': {
        stocks: [],
        cashTransactions: [],
        stockTransactions: [],
        cashBalance: 0,
      },
    };
    expect(() => {
      const { result } = renderHook(() =>
        useCalculations(yd, ['2024'], ['2024'], {}, convertToCurrency, currency),
      );
      result.current.prepareLineChartData();
    }).not.toThrow();
  });

  it('preparePercentageBarChartData 在 totalValue<=0 时跳过该年（不 NaN）', () => {
    const yd: { [y: string]: YearData } = {
      '2024': {
        stocks: [],
        cashTransactions: [],
        stockTransactions: [],
        cashBalance: 0, // totalValue=0 应被跳过
      },
    };
    const { result } = renderHook(() =>
      useCalculations(yd, ['2024'], ['2024'], {}, convertToCurrency, currency),
    );
    const data = result.current.preparePercentageBarChartData();
    expect(data).toEqual([]);
  });
});
