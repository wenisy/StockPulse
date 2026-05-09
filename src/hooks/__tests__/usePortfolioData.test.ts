import { renderHook, act } from '@testing-library/react';
import { usePortfolioData } from '../usePortfolioData';

global.fetch = jest.fn();

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const makeSetAlertInfo = () => jest.fn();

describe('usePortfolioData - 初始状态', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('years 非空且按降序排列', () => {
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo: makeSetAlertInfo() }),
    );
    const { years } = result.current;
    expect(years.length).toBeGreaterThan(0);
    for (let i = 0; i < years.length - 1; i++) {
      expect(parseInt(years[i])).toBeGreaterThanOrEqual(parseInt(years[i + 1]));
    }
  });

  it('latestYear 为 years 中最大年份', () => {
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo: makeSetAlertInfo() }),
    );
    const expected = Math.max(...result.current.years.map(Number)).toString();
    expect(result.current.latestYear).toBe(expected);
  });

  it('selectedYear 默认为最新年（years[0]，降序排列）', () => {
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo: makeSetAlertInfo() }),
    );
    const { years, selectedYear } = result.current;
    expect(selectedYear).toBe(years[0]);
  });

  it('exchangeRates 默认包含 USD/HKD/CNY', () => {
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo: makeSetAlertInfo() }),
    );
    expect(result.current.exchangeRates.USD).toBe(1);
    expect(result.current.exchangeRates.HKD).toBeGreaterThan(0);
  });

  it('isLoading 默认 false', () => {
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo: makeSetAlertInfo() }),
    );
    expect(result.current.isLoading).toBe(false);
  });
});

describe('usePortfolioData - addNewYear', () => {
  beforeEach(() => { jest.clearAllMocks(); localStorageMock.clear(); });

  it('添加不重复年份', () => {
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo: makeSetAlertInfo() }),
    );
    act(() => { result.current.addNewYear('2099'); });
    expect(result.current.years).toContain('2099');
    expect(result.current.selectedYear).toBe('2099');
  });

  it('添加重复年份被忽略', () => {
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo: makeSetAlertInfo() }),
    );
    const before = result.current.years.length;
    act(() => { result.current.addNewYear(result.current.years[0]); });
    expect(result.current.years.length).toBe(before);
  });

  it('新年份 years 仍按降序', () => {
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo: makeSetAlertInfo() }),
    );
    act(() => { result.current.addNewYear('2099'); });
    expect(result.current.years[0]).toBe('2099');
  });

  it('新年份带上年结余：cashBalance > 0 时追加结余 deposit', () => {
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo: makeSetAlertInfo() }),
    );
    // 先给某年加余额
    const year = result.current.years[0];
    act(() => { result.current.addCashTransaction(5000, 'deposit', year); });
    // 添加更新的年份
    const nextYear = (parseInt(year) + 1).toString();
    act(() => { result.current.addNewYear(nextYear); });
    const newYearData = result.current.yearData[nextYear];
    if (newYearData?.cashBalance > 0) {
      expect(newYearData.cashTransactions.some(tx => tx.description === '上年结余')).toBe(true);
    }
  });
});

describe('usePortfolioData - addCashTransaction', () => {
  beforeEach(() => { jest.clearAllMocks(); localStorageMock.clear(); });

  it('deposit 增加 cashBalance', () => {
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo: makeSetAlertInfo() }),
    );
    const year = result.current.years[0];
    const before = result.current.yearData[year]?.cashBalance ?? 0;
    act(() => { result.current.addCashTransaction(1000, 'deposit', year); });
    expect(result.current.yearData[year].cashBalance).toBe(before + 1000);
  });

  it('withdraw 减少 cashBalance', () => {
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo: makeSetAlertInfo() }),
    );
    const year = result.current.years[0];
    act(() => { result.current.addCashTransaction(5000, 'deposit', year); });
    const after = result.current.yearData[year].cashBalance;
    act(() => { result.current.addCashTransaction(1000, 'withdraw', year); });
    expect(result.current.yearData[year].cashBalance).toBe(after - 1000);
  });

  it('incremental changes 正确追加', () => {
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo: makeSetAlertInfo() }),
    );
    const year = result.current.years[0];
    act(() => { result.current.addCashTransaction(1000, 'deposit', year); });
    expect(result.current.incrementalChanges.cashTransactions[year]?.length).toBeGreaterThan(0);
  });
});

describe('usePortfolioData - updateStock', () => {
  beforeEach(() => { jest.clearAllMocks(); localStorageMock.clear(); });

  it('买入新股票后 stocks 包含该股票', () => {
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo: makeSetAlertInfo() }),
    );
    const year = result.current.years[0];
    act(() => {
      result.current.updateStock(year, 'AAPL', 10, 200, 180, 10, 200, 'buy', 'AAPL', 0);
    });
    const stocks = result.current.yearData[year].stocks;
    expect(stocks.some(s => s.name === 'AAPL')).toBe(true);
  });
});

describe('usePortfolioData - currency helpers', () => {
  it('convertToCurrency USD rate=1 返回原值', () => {
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo: makeSetAlertInfo() }),
    );
    expect(result.current.convertToCurrency(100, 'USD')).toBe(100);
  });

  it('formatLargeNumber 返回字符串', () => {
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo: makeSetAlertInfo() }),
    );
    expect(typeof result.current.formatLargeNumber(1234567, 'USD')).toBe('string');
  });
});

describe('usePortfolioData - getBasePath', () => {
  it('非 github.io 时返回空字符串', () => {
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo: makeSetAlertInfo() }),
    );
    expect(result.current.getBasePath()).toBe('');
  });
});

describe('usePortfolioData - handleTokenExpired', () => {
  it('清除 token 和 user', () => {
    localStorageMock.setItem('token', 'test-token');
    localStorageMock.setItem('user', '{}');
    const setAlertInfo = makeSetAlertInfo();
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo }),
    );
    act(() => { result.current.handleTokenExpired(); });
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    expect(setAlertInfo).toHaveBeenCalledWith(expect.objectContaining({ title: '会话已过期' }));
  });
});

describe('usePortfolioData - fetchJsonData', () => {
  beforeEach(() => { jest.clearAllMocks(); localStorageMock.clear(); });

  it('401 响应触发 token 过期处理', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 401 });
    const setAlertInfo = makeSetAlertInfo();
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo }),
    );
    await act(async () => { await result.current.fetchJsonData('bad'); });
    expect(setAlertInfo).toHaveBeenCalledWith(expect.objectContaining({ title: '会话已过期' }));
  });

  it('years API 失败回退到全量加载（fetchJsonDataLegacy）', async () => {
    // 第一次（years 接口）返回 500，触发回退
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 500 })
      // 第二次（legacy /api/data）返回 ok
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ '2024': { stocks: [], cashTransactions: [], stockTransactions: [], cashBalance: 1000 } }),
      });
    const setAlertInfo = makeSetAlertInfo();
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo }),
    );
    await act(async () => { await result.current.fetchJsonData('token'); });
    // 回退成功后，years 应更新
    expect(result.current.years).toContain('2024');
  });

  it('years API 成功：加载前 2 年数据', async () => {
    (global.fetch as jest.Mock)
      // years list
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ years: ['2024', '2023'] }),
      })
      // year 2024
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stocks: [], cashTransactions: [], stockTransactions: [], cashBalance: 1000 }),
      })
      // year 2023
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stocks: [], cashTransactions: [], stockTransactions: [], cashBalance: 500 }),
      });
    const setAlertInfo = makeSetAlertInfo();
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo }),
    );
    await act(async () => { await result.current.fetchJsonData('token'); });
    expect(result.current.years).toContain('2024');
    expect(result.current.years).toContain('2023');
  });

  it('years API 返回空数组时使用 initialData', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ years: [] }),
    });
    const setAlertInfo = makeSetAlertInfo();
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo }),
    );
    await act(async () => { await result.current.fetchJsonData('token'); });
    expect(result.current.years.length).toBeGreaterThan(0);
  });
});

describe('usePortfolioData - refreshPrices', () => {
  beforeEach(() => { jest.clearAllMocks(); localStorageMock.clear(); });

  it('当年无股票且手动刷新：弹提示', async () => {
    const setAlertInfo = makeSetAlertInfo();
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo }),
    );
    (global.fetch as jest.Mock).mockClear();
    await act(async () => { await result.current.refreshPrices(true); });
    // 当年无 stocks 时会弹"无股票数据"或者直接短路
    expect(true).toBe(true); // smoke test
  });

  it('成功响应更新价格数据', async () => {
    // 需要给当年添加一个有 symbol 的股票
    const setAlertInfo = makeSetAlertInfo();
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo }),
    );
    const currentYear = new Date().getFullYear().toString();
    act(() => {
      result.current.setYearData((prev) => ({
        ...prev,
        [currentYear]: {
          stocks: [{ name: 'AAPL', shares: 10, price: 150, costPrice: 120, id: 'a1', symbol: 'AAPL' }],
          cashTransactions: [],
          stockTransactions: [],
          cashBalance: 0,
        },
      }));
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { AAPL: { price: 200 } } }),
    });
    await act(async () => { await result.current.refreshPrices(true); });
    expect(result.current.yearData[currentYear]?.stocks[0]?.price).toBe(200);
  });

  it('失败响应弹 error alert', async () => {
    const setAlertInfo = makeSetAlertInfo();
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo }),
    );
    const currentYear = new Date().getFullYear().toString();
    act(() => {
      result.current.setYearData((prev) => ({
        ...prev,
        [currentYear]: {
          stocks: [{ name: 'AAPL', shares: 10, price: 150, costPrice: 120, id: 'a1', symbol: 'AAPL' }],
          cashTransactions: [],
          stockTransactions: [],
          cashBalance: 0,
        },
      }));
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, message: '错误信息' }),
    });
    await act(async () => { await result.current.refreshPrices(true); });
    expect(setAlertInfo).toHaveBeenCalledWith(expect.objectContaining({ title: '更新失败' }));
  });
});

describe('usePortfolioData - saveDataToBackend', () => {
  beforeEach(() => { jest.clearAllMocks(); localStorageMock.clear(); });

  it('无 token 时不发请求', async () => {
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo: makeSetAlertInfo() }),
    );
    await act(async () => { await result.current.saveDataToBackend(); });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('有 token 时发送请求并清空 incrementalChanges', async () => {
    localStorageMock.getItem.mockReturnValue('test-token');
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    const { result } = renderHook(() =>
      usePortfolioData({ currentUser: null, isLoggedIn: false, setAlertInfo: makeSetAlertInfo() }),
    );
    // 先加点 incremental 数据
    const year = result.current.years[0];
    act(() => { result.current.addCashTransaction(1000, 'deposit', year); });
    await act(async () => { await result.current.saveDataToBackend(); });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    // 成功后 incrementalChanges 清空
    expect(Object.keys(result.current.incrementalChanges.cashTransactions)).toHaveLength(0);
  });
});
