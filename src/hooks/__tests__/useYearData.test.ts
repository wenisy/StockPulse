import { renderHook, act } from '@testing-library/react';
import { useYearData } from '../useYearData';

describe('useYearData - 初始状态', () => {
  it('years 非空且按降序排列', () => {
    const { result } = renderHook(() => useYearData({ currentUser: null }));
    const { years } = result.current;
    expect(years.length).toBeGreaterThan(0);
    for (let i = 0; i < years.length - 1; i++) {
      expect(parseInt(years[i])).toBeGreaterThanOrEqual(parseInt(years[i + 1]));
    }
  });

  it('latestYear 为 years 中最大值', () => {
    const { result } = renderHook(() => useYearData({ currentUser: null }));
    const expected = Math.max(...result.current.years.map(Number)).toString();
    expect(result.current.latestYear).toBe(expected);
  });

  it('exchangeRates 包含默认值 USD=1', () => {
    const { result } = renderHook(() => useYearData({ currentUser: null }));
    expect(result.current.exchangeRates.USD).toBe(1);
  });

  it('incrementalChanges 初始为空', () => {
    const { result } = renderHook(() => useYearData({ currentUser: null }));
    expect(Object.keys(result.current.incrementalChanges.stocks)).toHaveLength(0);
  });
});

describe('useYearData - addNewYear', () => {
  it('添加不重复年份后 years 包含该年且 selectedYear 更新', () => {
    const { result } = renderHook(() => useYearData({ currentUser: null }));
    act(() => { result.current.addNewYear('2099'); });
    expect(result.current.years).toContain('2099');
    expect(result.current.selectedYear).toBe('2099');
  });

  it('添加重复年份被忽略', () => {
    const { result } = renderHook(() => useYearData({ currentUser: null }));
    const before = result.current.years.length;
    act(() => { result.current.addNewYear(result.current.years[0]); });
    expect(result.current.years.length).toBe(before);
  });

  it('新年份 years 仍按降序排列', () => {
    const { result } = renderHook(() => useYearData({ currentUser: null }));
    act(() => { result.current.addNewYear('2099'); });
    expect(result.current.years[0]).toBe('2099');
  });

  it('incrementalChanges.yearlySummaries 包含新年份', () => {
    const { result } = renderHook(() => useYearData({ currentUser: null }));
    act(() => { result.current.addNewYear('2099'); });
    expect(result.current.incrementalChanges.yearlySummaries).toHaveProperty('2099');
  });
});

describe('useYearData - addCashTransaction', () => {
  it('deposit 增加 cashBalance', () => {
    const { result } = renderHook(() => useYearData({ currentUser: null }));
    const year = result.current.years[0];
    const before = result.current.yearData[year]?.cashBalance ?? 0;
    act(() => { result.current.addCashTransaction(1000, 'deposit', year); });
    expect(result.current.yearData[year].cashBalance).toBe(before + 1000);
  });

  it('withdraw 减少 cashBalance', () => {
    const { result } = renderHook(() => useYearData({ currentUser: null }));
    const year = result.current.years[0];
    act(() => { result.current.addCashTransaction(5000, 'deposit', year); });
    const after = result.current.yearData[year].cashBalance;
    act(() => { result.current.addCashTransaction(1000, 'withdraw', year); });
    expect(result.current.yearData[year].cashBalance).toBe(after - 1000);
  });

  it('不存在的年份自动初始化', () => {
    const { result } = renderHook(() => useYearData({ currentUser: null }));
    act(() => { result.current.addCashTransaction(500, 'deposit', '2099'); });
    expect(result.current.yearData['2099']?.cashBalance).toBe(500);
  });
});

describe('useYearData - updateStock', () => {
  it('买入新股票后 stocks 包含该股票', () => {
    const { result } = renderHook(() => useYearData({ currentUser: null }));
    const year = result.current.years[0];
    act(() => {
      result.current.updateStock(year, 'TEST', 10, 100, 80, 10, 100, 'buy', 'T', 0);
    });
    expect(result.current.yearData[year].stocks.some((s) => s.name === 'TEST')).toBe(true);
  });

  it('incrementalChanges.stocks 追加了股票记录', () => {
    const { result } = renderHook(() => useYearData({ currentUser: null }));
    const year = result.current.years[0];
    act(() => {
      result.current.updateStock(year, 'TEST', 10, 100, 80, 10, 100, 'buy', 'T', 0);
    });
    expect(result.current.incrementalChanges.stocks[year]?.length).toBeGreaterThan(0);
  });
});

describe('useYearData - convertToCurrency / formatLargeNumber', () => {
  it('convertToCurrency USD=1 时返回原值', () => {
    const { result } = renderHook(() => useYearData({ currentUser: null }));
    expect(result.current.convertToCurrency(100, 'USD')).toBe(100);
  });

  it('formatLargeNumber 返回字符串', () => {
    const { result } = renderHook(() => useYearData({ currentUser: null }));
    expect(typeof result.current.formatLargeNumber(1234567, 'USD')).toBe('string');
  });

  it('setExchangeRates 更新后 convertToCurrency 使用新汇率', () => {
    const { result } = renderHook(() => useYearData({ currentUser: null }));
    act(() => {
      result.current.setExchangeRates({ USD: 1, HKD: 0.1, CNY: 0.14 });
    });
    // 100 / 0.1 = 1000
    expect(result.current.convertToCurrency(100, 'HKD')).toBeCloseTo(1000, 1);
  });
});

describe('useYearData - 边界保护', () => {
  it('latestYear 是有效非空字符串', () => {
    const { result } = renderHook(() => useYearData({ currentUser: null }));
    expect(typeof result.current.latestYear).toBe('string');
    expect(result.current.latestYear.length).toBeGreaterThan(0);
    expect(parseInt(result.current.latestYear)).not.toBeNaN();
  });

  it('selectedYear 初始化为 years[0]（最新年）', () => {
    const { result } = renderHook(() => useYearData({ currentUser: null }));
    expect(result.current.selectedYear).toBe(result.current.years[0]);
  });

  it('addNewYear 后 latestYear 自动更新', () => {
    const { result } = renderHook(() => useYearData({ currentUser: null }));
    const before = parseInt(result.current.latestYear);
    act(() => {
      result.current.addNewYear((before + 5).toString());
    });
    expect(parseInt(result.current.latestYear)).toBe(before + 5);
  });
});
