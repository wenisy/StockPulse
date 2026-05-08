import { renderHook, act } from '@testing-library/react';
import { useUserManagement } from '../useUserManagement';

global.fetch = jest.fn();

describe('useUserManagement', () => {
  beforeEach(() => jest.clearAllMocks());

  it('初始状态：未登录、currentUser 为 null', () => {
    const { result } = renderHook(() => useUserManagement());
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.currentUser).toBeNull();
  });

  it('setIsLoggedIn 更新登录状态', () => {
    const { result } = renderHook(() => useUserManagement());
    act(() => { result.current.setIsLoggedIn(true); });
    expect(result.current.isLoggedIn).toBe(true);
  });

  it('setCurrentUser 更新当前用户', () => {
    const { result } = renderHook(() => useUserManagement());
    const user = { username: 'test', uuid: 'u1' };
    act(() => { result.current.setCurrentUser(user); });
    expect(result.current.currentUser?.username).toBe('test');
  });

  it('fetchJsonData：成功响应返回数据', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { '2024': {} } }),
    });
    const { result } = renderHook(() => useUserManagement());
    let data: unknown;
    await act(async () => {
      data = await result.current.fetchJsonData('token');
    });
    expect(data).toEqual({ '2024': {} });
  });

  it('fetchJsonData：404 响应返回 null', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });
    const { result } = renderHook(() => useUserManagement());
    let data: unknown;
    await act(async () => {
      data = await result.current.fetchJsonData('token');
    });
    expect(data).toBeNull();
  });

  it('saveDataToBackend：未登录时不发送请求', async () => {
    const { result } = renderHook(() => useUserManagement());
    await act(async () => {
      await result.current.saveDataToBackend({}, {});
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('setAlertInfo 更新 alertInfo 状态', () => {
    const { result } = renderHook(() => useUserManagement());
    act(() => {
      result.current.setAlertInfo({
        isOpen: true,
        title: '测试',
        description: '描述',
      });
    });
    expect(result.current.alertInfo?.title).toBe('测试');
  });

  it('saveDataToBackend：登录且有 token 时发送请求', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });
    const { result } = renderHook(() => useUserManagement());
    act(() => {
      result.current.setIsLoggedIn(true);
      result.current.setCurrentUser({ username: 'u', uuid: 'u1', token: 'tok' } as Parameters<typeof result.current.setCurrentUser>[0]);
    });
    await act(async () => {
      await result.current.saveDataToBackend({}, {});
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('isMoreMenuOpen 可切换', () => {
    const { result } = renderHook(() => useUserManagement());
    act(() => { result.current.setIsMoreMenuOpen(true); });
    expect(result.current.isMoreMenuOpen).toBe(true);
  });
});

describe('useUserManagement - fetchJsonData 更多路径', () => {
  beforeEach(() => jest.clearAllMocks());

  it('非 404 错误：抛异常', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });
    const { result } = renderHook(() => useUserManagement());
    await expect(
      act(async () => { await result.current.fetchJsonData('token'); }),
    ).rejects.toBeTruthy();
  });

  it('result.success 为 false：返回 null', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, data: null }),
    });
    const { result } = renderHook(() => useUserManagement());
    let data: unknown;
    await act(async () => { data = await result.current.fetchJsonData('token'); });
    expect(data).toBeNull();
  });

  it('fetch throw：抛异常', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useUserManagement());
    await expect(
      act(async () => { await result.current.fetchJsonData('token'); }),
    ).rejects.toBeTruthy();
  });
});

describe('useUserManagement - saveDataToBackend 更多路径', () => {
  beforeEach(() => jest.clearAllMocks());

  const setupLoggedIn = (result: ReturnType<typeof renderHook>['result'] & { current: ReturnType<typeof useUserManagement> }) => {
    act(() => {
      result.current.setIsLoggedIn(true);
      result.current.setCurrentUser({ username: 'u', uuid: 'u1', token: 'tok' } as Parameters<typeof result.current.setCurrentUser>[0]);
    });
  };

  it('响应 success 为 false：不抛', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, message: 'fail' }),
    });
    const { result } = renderHook(() => useUserManagement());
    setupLoggedIn(result as never);
    await expect(
      act(async () => { await result.current.saveDataToBackend({}, {}); }),
    ).resolves.not.toThrow();
  });

  it('fetch 抛异常：内部 catch 不往外抛', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useUserManagement());
    setupLoggedIn(result as never);
    await expect(
      act(async () => { await result.current.saveDataToBackend({}, {}); }),
    ).resolves.not.toThrow();
  });

  it('响应非 ok：内部抛出但被 catch', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });
    const { result } = renderHook(() => useUserManagement());
    setupLoggedIn(result as never);
    await expect(
      act(async () => { await result.current.saveDataToBackend({}, {}); }),
    ).resolves.not.toThrow();
  });

  it('currentUser 没有 token 时直接返回', async () => {
    const { result } = renderHook(() => useUserManagement());
    act(() => {
      result.current.setIsLoggedIn(true);
      result.current.setCurrentUser({ username: 'u', uuid: 'u1' } as Parameters<typeof result.current.setCurrentUser>[0]);
    });
    await act(async () => {
      await result.current.saveDataToBackend({}, {});
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('useUserManagement - debouncedSave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('debouncedSave 2 秒后触发 saveDataToBackend', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    const { result } = renderHook(() => useUserManagement());
    act(() => {
      result.current.setIsLoggedIn(true);
      result.current.setCurrentUser({ username: 'u', uuid: 'u1', token: 'tok' } as Parameters<typeof result.current.setCurrentUser>[0]);
    });
    act(() => { result.current.debouncedSave({}, {}); });
    expect(global.fetch).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });
    expect(global.fetch).toHaveBeenCalled();
  });
});
