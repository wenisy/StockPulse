import { renderHook, act } from '@testing-library/react';
import { useUserSettings } from '../useUserSettings';

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

describe('useUserSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  const render = () =>
    renderHook(() => useUserSettings(null, false, undefined));

  it('初始状态：所有设置为默认值', () => {
    const { result } = render();
    expect(result.current.retirementGoal).toBe('');
    expect(result.current.annualReturn).toBe('');
    expect(result.current.targetYears).toBe('');
    expect(result.current.calculationMode).toBe('rate');
  });

  it('updateRetirementGoal：更新退休目标', () => {
    const { result } = render();
    act(() => { result.current.updateRetirementGoal('1000000'); });
    expect(result.current.retirementGoal).toBe('1000000');
  });

  it('updateAnnualReturn：更新年化回报率', () => {
    const { result } = render();
    act(() => { result.current.updateAnnualReturn('8'); });
    expect(result.current.annualReturn).toBe('8');
  });

  it('updateTargetYears：更新目标年数', () => {
    const { result } = render();
    act(() => { result.current.updateTargetYears('10'); });
    expect(result.current.targetYears).toBe('10');
  });

  it('updateCalculationMode：切换计算模式', () => {
    const { result } = render();
    act(() => { result.current.updateCalculationMode('years'); });
    expect(result.current.calculationMode).toBe('years');
  });

  it('updateAllSettings：批量更新所有设置', () => {
    const { result } = render();
    act(() => {
      result.current.updateAllSettings({
        retirementGoal: '500000',
        annualReturn: '7',
        targetYears: '15',
        calculationMode: 'years',
      });
    });
    expect(result.current.retirementGoal).toBe('500000');
    expect(result.current.annualReturn).toBe('7');
    expect(result.current.targetYears).toBe('15');
    expect(result.current.calculationMode).toBe('years');
  });

  it('loadUserSettings：从 user 对象加载设置', () => {
    const { result } = render();
    const user = {
      username: 'test',
      uuid: 'u1',
      retirementGoal: '2000000',
      annualReturn: '10',
      targetYears: '20',
    };
    act(() => { result.current.loadUserSettings(user); });
    expect(result.current.retirementGoal).toBe('2000000');
    expect(result.current.annualReturn).toBe('10');
  });

  it('loadUserSettings(null)：不 crash', () => {
    const { result } = render();
    act(() => { result.current.loadUserSettings(null); });
    expect(true).toBe(true);
  });
});

describe('useUserSettings - localStorage 初始化', () => {
  const localStorageMock2 = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: jest.fn((key: string) => { delete store[key]; }),
      clear: jest.fn(() => { store = {}; }),
      setStore: (data: Record<string, string>) => { store = { ...data }; },
    };
  })();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock2.clear();
    // 覆盖 localStorage
    Object.defineProperty(window, 'localStorage', { value: localStorageMock2, writable: true });
  });

  it('localStorage 有 retirementGoal 时初始化使用该值', () => {
    localStorageMock2.setStore({
      retirementGoal: '999999',
      annualReturn: '12',
      targetYears: '10',
      calculationMode: 'years',
    });
    const { result } = renderHook(() => useUserSettings(null, false, undefined));
    expect(result.current.retirementGoal).toBe('999999');
  });

  it('localStorage 有 user JSON 时从 user 读取退休目标', () => {
    localStorageMock2.setStore({
      user: JSON.stringify({ retirementGoal: '2000000', annualReturn: '8' }),
    });
    const { result } = renderHook(() => useUserSettings(null, false, undefined));
    expect(result.current.retirementGoal).toBe('2000000');
  });
});

describe('useUserSettings - 已登录用户的 updater', () => {
  const localStorageMock3 = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: jest.fn((key: string) => { delete store[key]; }),
      clear: jest.fn(() => { store = {}; }),
    };
  })();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock3.clear();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock3, writable: true });
  });

  it('updateRetirementGoal 已登录：调 setCurrentUser + 更新 localStorage user', () => {
    const user = { username: 'u', uuid: 'u1', retirementGoal: '' };
    const setCurrentUser = jest.fn();
    const { result } = renderHook(() =>
      useUserSettings(user as never, true, setCurrentUser as never),
    );
    act(() => { result.current.updateRetirementGoal('99999'); });
    expect(setCurrentUser).toHaveBeenCalled();
    expect(localStorageMock3.setItem).toHaveBeenCalledWith('user', expect.any(String));
  });

  it('updateAnnualReturn 已登录：调 setCurrentUser', () => {
    const user = { username: 'u', uuid: 'u1' };
    const setCurrentUser = jest.fn();
    const { result } = renderHook(() =>
      useUserSettings(user as never, true, setCurrentUser as never),
    );
    act(() => { result.current.updateAnnualReturn('10'); });
    expect(setCurrentUser).toHaveBeenCalled();
  });

  it('updateTargetYears 已登录：调 setCurrentUser', () => {
    const user = { username: 'u', uuid: 'u1' };
    const setCurrentUser = jest.fn();
    const { result } = renderHook(() =>
      useUserSettings(user as never, true, setCurrentUser as never),
    );
    act(() => { result.current.updateTargetYears('15'); });
    expect(setCurrentUser).toHaveBeenCalled();
  });

  it('updateCalculationMode 已登录：调 setCurrentUser', () => {
    const user = { username: 'u', uuid: 'u1' };
    const setCurrentUser = jest.fn();
    const { result } = renderHook(() =>
      useUserSettings(user as never, true, setCurrentUser as never),
    );
    act(() => { result.current.updateCalculationMode('years'); });
    expect(setCurrentUser).toHaveBeenCalled();
  });

  it('updateAllSettings 已登录：调 setCurrentUser', () => {
    const user = { username: 'u', uuid: 'u1' };
    const setCurrentUser = jest.fn();
    const { result } = renderHook(() =>
      useUserSettings(user as never, true, setCurrentUser as never),
    );
    act(() => {
      result.current.updateAllSettings({
        retirementGoal: '5',
        annualReturn: '6',
        targetYears: '7',
        calculationMode: 'years',
      });
    });
    expect(setCurrentUser).toHaveBeenCalled();
  });

  it('updateAllSettings 未登录：各自写 localStorage', () => {
    const { result } = renderHook(() => useUserSettings(null, false, undefined));
    act(() => {
      result.current.updateAllSettings({
        retirementGoal: '5',
        annualReturn: '6',
        targetYears: '7',
        calculationMode: 'years',
      });
    });
    expect(localStorageMock3.setItem).toHaveBeenCalledWith('retirementGoal', '5');
    expect(localStorageMock3.setItem).toHaveBeenCalledWith('annualReturn', '6');
    expect(localStorageMock3.setItem).toHaveBeenCalledWith('targetYears', '7');
    expect(localStorageMock3.setItem).toHaveBeenCalledWith('calculationMode', 'years');
  });

  it('updateRetirementGoal 未登录：写 localStorage', () => {
    const { result } = renderHook(() => useUserSettings(null, false, undefined));
    act(() => { result.current.updateRetirementGoal('100'); });
    expect(localStorageMock3.setItem).toHaveBeenCalledWith('retirementGoal', '100');
  });

  it('updateAnnualReturn 未登录：写 localStorage', () => {
    const { result } = renderHook(() => useUserSettings(null, false, undefined));
    act(() => { result.current.updateAnnualReturn('8'); });
    expect(localStorageMock3.setItem).toHaveBeenCalledWith('annualReturn', '8');
  });

  it('updateTargetYears 未登录：写 localStorage', () => {
    const { result } = renderHook(() => useUserSettings(null, false, undefined));
    act(() => { result.current.updateTargetYears('20'); });
    expect(localStorageMock3.setItem).toHaveBeenCalledWith('targetYears', '20');
  });

  it('updateCalculationMode 未登录：写 localStorage', () => {
    const { result } = renderHook(() => useUserSettings(null, false, undefined));
    act(() => { result.current.updateCalculationMode('years'); });
    expect(localStorageMock3.setItem).toHaveBeenCalledWith('calculationMode', 'years');
  });
});
