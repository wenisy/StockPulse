import { renderHook, act } from '@testing-library/react';
import { useCalendarData } from '../useCalendarData';

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

describe('useCalendarData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('初始状态：calendarData 空、isLoading false、error null', () => {
    const { result } = renderHook(() => useCalendarData());
    expect(result.current.calendarData).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetchCalendarData：无 token 时设置 error', async () => {
    const { result } = renderHook(() => useCalendarData());
    await act(async () => {
      await result.current.fetchCalendarData(2024, 6);
    });
    expect(result.current.error).toBeTruthy();
    expect(result.current.isLoading).toBe(false);
  });

  it('fetchCalendarData：token 存在且 fetch 成功时更新数据', async () => {
    localStorageMock.getItem.mockReturnValue('token123');
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            date: '2024-06-01',
            totalGain: 100,
            totalGainPercent: 1,
            hasData: true,
            hasTransaction: false,
            stocks: [],
          },
        ],
        monthlySummary: {
          totalGain: 100,
          totalGainPercent: 1,
          tradingDaysCount: 1,
          profitDays: 1,
          lossDays: 0,
          winRate: 100,
        },
      }),
    });
    const { result } = renderHook(() => useCalendarData());
    await act(async () => {
      await result.current.fetchCalendarData(2024, 6);
    });
    expect(result.current.calendarData.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
  });

  it('fetchYearlySummary：无 token 时设置 error', async () => {
    const { result } = renderHook(() => useCalendarData());
    await act(async () => {
      await result.current.fetchYearlySummary(2024);
    });
    expect(result.current.error).toBeTruthy();
  });

  it('fetchCalendarData：fetch 失败时 isLoading 归零且设置 error', async () => {
    localStorageMock.getItem.mockReturnValue('token123');
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('网络错误'));
    const { result } = renderHook(() => useCalendarData());
    await act(async () => {
      await result.current.fetchCalendarData(2024, 6);
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it('fetchCalendarData：AbortError 不触发 setError（竞态中止）', async () => {
    localStorageMock.getItem.mockReturnValue('token123');
    const abortError = new DOMException('aborted', 'AbortError');
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);
    const { result } = renderHook(() => useCalendarData());
    await act(async () => {
      await result.current.fetchCalendarData(2024, 6);
    });
    // AbortError 被静默丢弃，error 保持 null
    expect(result.current.error).toBeNull();
  });

  it('fetchYearlySummary：fetch 失败时 isLoading 归零且设置 error', async () => {
    localStorageMock.getItem.mockReturnValue('token123');
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('超时'));
    const { result } = renderHook(() => useCalendarData());
    await act(async () => {
      await result.current.fetchYearlySummary(2024);
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it('fetchYearlySummary：AbortError 不触发 setError', async () => {
    localStorageMock.getItem.mockReturnValue('token123');
    const abortError = new DOMException('aborted', 'AbortError');
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);
    const { result } = renderHook(() => useCalendarData());
    await act(async () => {
      await result.current.fetchYearlySummary(2024);
    });
    expect(result.current.error).toBeNull();
  });

  it('generateDailySnapshot：无 token 时 throw', async () => {
    const { result } = renderHook(() => useCalendarData());
    await expect(
      act(async () => { await result.current.generateDailySnapshot(); }),
    ).rejects.toBeTruthy();
  });

  it('generateDailySnapshot：token 存在且成功时不 throw', async () => {
    localStorageMock.getItem.mockReturnValue('token123');
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });
    const { result } = renderHook(() => useCalendarData());
    await expect(
      act(async () => { await result.current.generateDailySnapshot('2024-06-01'); }),
    ).resolves.not.toThrow();
  });
});
