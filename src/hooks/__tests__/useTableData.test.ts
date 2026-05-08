import { renderHook } from '@testing-library/react';
import { useTableData } from '../useTableData';
import type { YearData } from '@/types/stock';

const makeYearData = (): { [y: string]: YearData } => ({
  '2023': {
    stocks: [
      { name: 'AAPL', shares: 10, price: 150, costPrice: 120, id: 'a1' },
      { name: 'NVDA', shares: 5, price: 400, costPrice: 300, id: 'n1' },
    ],
    cashTransactions: [],
    stockTransactions: [],
    cashBalance: 1000,
  },
  '2024': {
    stocks: [
      { name: 'AAPL', shares: 20, price: 200, costPrice: 150, id: 'a1' },
    ],
    cashTransactions: [],
    stockTransactions: [],
    cashBalance: 2000,
  },
});

describe('useTableData', () => {
  it('headers 包含 filteredYears', () => {
    const { result } = renderHook(() =>
      useTableData({
        yearData: makeYearData(),
        years: ['2024', '2023'],
        filteredYears: ['2024', '2023'],
        hiddenStocks: {},
      }),
    );
    expect(result.current.headers).toContain('2024');
    expect(result.current.headers).toContain('2023');
  });

  it('rows 包含所有股票行', () => {
    const { result } = renderHook(() =>
      useTableData({
        yearData: makeYearData(),
        years: ['2024', '2023'],
        filteredYears: ['2024', '2023'],
        hiddenStocks: {},
      }),
    );
    const stockNames = result.current.rows.map((row) => (row[1] as { name: string }).name);
    expect(stockNames).toContain('AAPL');
    expect(stockNames).toContain('NVDA');
  });

  it('空 yearData：rows 为空', () => {
    const { result } = renderHook(() =>
      useTableData({
        yearData: {},
        years: [],
        filteredYears: [],
        hiddenStocks: {},
      }),
    );
    expect(result.current.rows).toHaveLength(0);
  });

  it('totalRow 长度与 headers 一致', () => {
    const { result } = renderHook(() =>
      useTableData({
        yearData: makeYearData(),
        years: ['2024', '2023'],
        filteredYears: ['2024', '2023'],
        hiddenStocks: {},
      }),
    );
    expect(result.current.totalRow.length).toBe(result.current.headers.length);
  });
});
