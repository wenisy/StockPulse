import { renderHook, act } from '@testing-library/react';
import { usePortfolioSync } from '../usePortfolioSync';
import type { IncrementalChanges } from '@/types/stock';

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

const makeProps = (overrides = {}) => {
  const setYearData = jest.fn();
  const setYears = jest.fn();
  const setFilteredYears = jest.fn();
  const setSelectedYear = jest.fn();
  const setComparisonYear = jest.fn();
  const setIncrementalChanges = jest.fn();
  const setAlertInfo = jest.fn();
  const incrementalChanges: IncrementalChanges = {
    stocks: {},
    cashTransactions: {},
    stockTransactions: {},
    yearlySummaries: {},
  };
  return {
    yearData: {},
    incrementalChanges,
    setYearData,
    setYears,
    setFilteredYears,
    setSelectedYear,
    setComparisonYear,
    setIncrementalChanges,
    setAlertInfo,
    ...overrides,
  };
};

describe('usePortfolioSync - 初始状态', () => {
  it('isLoading 初始为 false', () => {
    const { result } = renderHook(() => usePortfolioSync(makeProps()));
    expect(result.current.isLoading).toBe(false);
  });

  it('priceData 初始为空对象', () => {
    const { result } = renderHook(() => usePortfolioSync(makeProps()));
    expect(result.current.priceData).toEqual({});
  });

  it('getBasePath 非 github.io 返回空字符串', () => {
    const { result } = renderHook(() => usePortfolioSync(makeProps()));
    expect(result.current.getBasePath()).toBe('');
  });
});

describe('usePortfolioSync - handleTokenExpired', () => {
  it('清除 token / user + 调 setAlertInfo', () => {
    localStorageMock.setItem('token', 'test');
    localStorageMock.setItem('user', '{}');
    const props = makeProps();
    const { result } = renderHook(() => usePortfolioSync(props));
    act(() => { result.current.handleTokenExpired(); });
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    expect(props.setAlertInfo).toHaveBeenCalledWith(
      expect.objectContaining({ title: '会话已过期' }),
    );
  });
});

describe('usePortfolioSync - fetchJsonData', () => {
  beforeEach(() => { jest.clearAllMocks(); localStorageMock.clear(); });

  it('401 响应触发 handleTokenExpired', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 401 });
    const props = makeProps();
    const { result } = renderHook(() => usePortfolioSync(props));
    await act(async () => { await result.current.fetchJsonData('bad'); });
    expect(props.setAlertInfo).toHaveBeenCalledWith(
      expect.objectContaining({ title: '会话已过期' }),
    );
  });

  it('years API 成功：设置 years 和 setSelectedYear', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ years: ['2024', '2023'] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stocks: [], cashTransactions: [], stockTransactions: [], cashBalance: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stocks: [], cashTransactions: [], stockTransactions: [], cashBalance: 0 }),
      });
    const props = makeProps();
    const { result } = renderHook(() => usePortfolioSync(props));
    await act(async () => { await result.current.fetchJsonData('token'); });
    expect(props.setYears).toHaveBeenCalledWith(['2024', '2023']);
    expect(props.setSelectedYear).toHaveBeenCalledWith('2024');
  });

  it('years API 失败回退 legacy', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ '2024': { stocks: [], cashTransactions: [], stockTransactions: [], cashBalance: 0 } }),
      });
    const props = makeProps();
    const { result } = renderHook(() => usePortfolioSync(props));
    await act(async () => { await result.current.fetchJsonData('token'); });
    expect(props.setYearData).toHaveBeenCalled();
  });
});

describe('usePortfolioSync - saveDataToBackend', () => {
  beforeEach(() => { jest.clearAllMocks(); localStorageMock.clear(); });

  it('无 token 时不发请求', async () => {
    const props = makeProps();
    const { result } = renderHook(() => usePortfolioSync(props));
    await act(async () => { await result.current.saveDataToBackend(); });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('有 token 成功后清空 incrementalChanges', async () => {
    localStorageMock.getItem.mockReturnValue('test-token');
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true, json: async () => ({}),
    });
    const props = makeProps();
    const { result } = renderHook(() => usePortfolioSync(props));
    await act(async () => { await result.current.saveDataToBackend(); });
    expect(props.setIncrementalChanges).toHaveBeenCalledWith(expect.objectContaining({ stocks: {} }));
  });
});

describe('usePortfolioSync - refreshPrices', () => {
  beforeEach(() => { jest.clearAllMocks(); localStorageMock.clear(); });

  it('当年无股票且手动触发：弹提示', async () => {
    const props = makeProps({ yearData: {} });
    const { result } = renderHook(() => usePortfolioSync(props));
    await act(async () => { await result.current.refreshPrices(true); });
    expect(props.setAlertInfo).toHaveBeenCalledWith(
      expect.objectContaining({ title: '无股票数据' }),
    );
  });
});
