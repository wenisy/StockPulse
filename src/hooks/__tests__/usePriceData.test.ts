import { renderHook, act } from '@testing-library/react';
import { usePriceData } from '../usePriceData';

global.fetch = jest.fn();

describe('usePriceData', () => {
  beforeEach(() => jest.clearAllMocks());

  it('初始状态：priceData 空、isLoading false', () => {
    const { result } = renderHook(() => usePriceData());
    expect(result.current.priceData).toEqual({});
    expect(result.current.isLoading).toBe(false);
  });

  it('updateLatestPrices：更新 priceData 和 exchangeRates', () => {
    const { result } = renderHook(() => usePriceData());
    act(() => {
      result.current.updateLatestPrices({
        HKD: { price: 0.128, name: 'HKD', lastUpdated: '2024' },
        CNY: { price: 0.14, name: 'CNY', lastUpdated: '2024' },
        AAPL: { price: 200, name: 'Apple', lastUpdated: '2024' },
      });
    });
    expect(result.current.exchangeRates.HKD).toBeCloseTo(0.128);
    expect(result.current.stockSymbols.some((s) => s.symbol === 'AAPL')).toBe(true);
  });

  it('refreshPrices：fetch 成功时更新数据', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        HKD: { price: 0.128, name: 'HKD', lastUpdated: '2024' },
        AAPL: { price: 200, name: 'Apple', lastUpdated: '2024' },
      }),
    });
    const { result } = renderHook(() => usePriceData());
    const setYearData = jest.fn((cb: (prev: object) => object) => cb({}));
    await act(async () => {
      await result.current.refreshPrices(false, {}, setYearData as never);
    });
    expect(result.current.priceData).toHaveProperty('AAPL');
  });

  it('refreshPrices：fetch 失败时 isLoading 恢复 false', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network error'));
    const { result } = renderHook(() => usePriceData());
    const setYearData = jest.fn();
    await act(async () => {
      await result.current.refreshPrices(false, {}, setYearData);
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('refreshPrices 期间 isLoading=true', async () => {
    let resolve: (v: unknown) => void = () => {};
    (global.fetch as jest.Mock).mockReturnValueOnce(
      new Promise((r) => { resolve = r; }),
    );
    const { result } = renderHook(() => usePriceData());
    const setYearData = jest.fn();
    act(() => {
      result.current.refreshPrices(false, {}, setYearData);
    });
    expect(result.current.isLoading).toBe(true);
    // 清理
    act(() => {
      resolve({ ok: false, json: async () => ({}) });
    });
  });
});

describe('usePriceData - formatLargeNumber / convertToCurrency', () => {
  it('formatLargeNumber 返回字符串', () => {
    const { result } = renderHook(() => usePriceData());
    act(() => {
      result.current.updateLatestPrices({
        HKD: { price: 0.128, name: 'HKD', lastUpdated: '2024' },
        CNY: { price: 0.14, name: 'CNY', lastUpdated: '2024' },
      });
    });
    const val = result.current.formatLargeNumber(100000, 'USD');
    expect(typeof val).toBe('string');
  });

  it('convertToCurrency USD 返回原值', () => {
    const { result } = renderHook(() => usePriceData());
    expect(result.current.convertToCurrency(100, 'USD')).toBe(100);
  });

  it('exchangeRates 可通过 setExchangeRates 更新', () => {
    const { result } = renderHook(() => usePriceData());
    act(() => {
      result.current.setExchangeRates({ USD: 1, HKD: 0.1, CNY: 0.14 });
    });
    expect(result.current.exchangeRates.HKD).toBe(0.1);
  });
});
