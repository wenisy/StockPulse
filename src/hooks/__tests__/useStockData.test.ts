import { renderHook, act } from '@testing-library/react';
import { useStockData } from '../useStockData';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-uuid') }));

describe('useStockData', () => {
  it('初始状态：years 非空、yearData 有数据', () => {
    const { result } = renderHook(() => useStockData());
    expect(result.current.years.length).toBeGreaterThan(0);
    expect(Object.keys(result.current.yearData).length).toBeGreaterThan(0);
  });

  it('years 按降序排列', () => {
    const { result } = renderHook(() => useStockData());
    const years = result.current.years;
    for (let i = 0; i < years.length - 1; i++) {
      expect(parseInt(years[i])).toBeGreaterThanOrEqual(parseInt(years[i + 1]));
    }
  });

  it('addNewYear：添加新年份成功返回 true', () => {
    const { result } = renderHook(() => useStockData());
    let success = false;
    act(() => { success = result.current.addNewYear('2099'); });
    expect(success).toBe(true);
    expect(result.current.years).toContain('2099');
  });

  it('addNewYear：重复年份返回 false', () => {
    const { result } = renderHook(() => useStockData());
    const existing = result.current.years[0];
    let success = true;
    act(() => { success = result.current.addNewYear(existing); });
    expect(success).toBe(false);
  });

  it('addCashTransaction：deposit 增加余额', () => {
    const { result } = renderHook(() => useStockData());
    const year = result.current.years[0];
    const before = result.current.yearData[year]?.cashBalance ?? 0;
    act(() => { result.current.addCashTransaction(year, 'deposit', 1000); });
    expect(result.current.yearData[year].cashBalance).toBe(before + 1000);
  });

  it('addCashTransaction：amount <= 0 返回 false', () => {
    const { result } = renderHook(() => useStockData());
    const year = result.current.years[0];
    let ok = true;
    act(() => { ok = result.current.addCashTransaction(year, 'deposit', 0); });
    expect(ok).toBe(false);
  });

  it('addStockTransaction：买入后 stocks 包含该股票', () => {
    const { result } = renderHook(() => useStockData());
    const year = result.current.years[0];
    act(() => {
      result.current.addStockTransaction(year, 'TEST', 'T', 'buy', 10, 100);
    });
    const stocks = result.current.yearData[year].stocks;
    const found = stocks.find((s) => s.name === 'TEST');
    expect(found).toBeDefined();
    expect(found?.shares).toBe(10);
  });

  it('addStockTransaction：无效参数返回 false', () => {
    const { result } = renderHook(() => useStockData());
    let ok = true;
    act(() => {
      ok = result.current.addStockTransaction('', 'TEST', 'T', 'buy', 10, 100);
    });
    expect(ok).toBe(false);
  });
});
