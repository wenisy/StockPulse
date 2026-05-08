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
