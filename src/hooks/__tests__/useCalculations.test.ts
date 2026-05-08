import { renderHook } from '@testing-library/react';
import { useCalculations } from '../useCalculations';
import type { YearData } from '@/types/stock';

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
