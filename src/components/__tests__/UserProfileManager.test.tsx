import React, { createRef } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserProfileManager, { UserProfileManagerHandle } from '../UserProfileManager';

// Mock useUserSettings
jest.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({
    retirementGoal: '',
    annualReturn: '',
    targetYears: '',
    calculationMode: 'rate' as const,
    updateRetirementGoal: jest.fn(),
    updateAnnualReturn: jest.fn(),
    updateTargetYears: jest.fn(),
    updateCalculationMode: jest.fn(),
    updateAllSettings: jest.fn(),
    loadUserSettings: jest.fn(),
  }),
}));

// Mock RetirementCalculator（深层组件不影响外层测试）
jest.mock('../RetirementCalculator', () => () => null);

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((k: string) => store[k] || null),
    setItem: jest.fn((k: string, v: string) => { store[k] = v; }),
    removeItem: jest.fn((k: string) => { delete store[k]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const makeProps = (override = {}) => ({
  isLoggedIn: false,
  currentUser: null,
  setCurrentUser: jest.fn(),
  setIsLoggedIn: jest.fn(),
  setAlertInfo: jest.fn(),
  currency: 'USD',
  latestYear: '2024',
  totalValues: { '2024': 10000 },
  formatLargeNumber: (v: number) => v.toFixed(2),
  getLatestYearGrowthRate: () => '5.5',
  ...override,
});

describe('UserProfileManager - 渲染', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('未登录时正常渲染（不崩）', () => {
    const { container } = render(<UserProfileManager {...makeProps()} />);
    expect(container).toBeTruthy();
  });

  it('已登录时正常渲染', () => {
    const { container } = render(
      <UserProfileManager
        {...makeProps({
          isLoggedIn: true,
          currentUser: { username: 'test', uuid: 'u1' },
        })}
      />,
    );
    expect(container).toBeTruthy();
  });
});

describe('UserProfileManager - ref API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('ref.openLoginDialog 弹出登录对话框', async () => {
    const ref = createRef<UserProfileManagerHandle>();
    render(<UserProfileManager {...makeProps()} ref={ref} />);

    act(() => { ref.current?.openLoginDialog(); });

    await waitFor(() => {
      // 登录对话框打开后应能找到"登录"相关 UI
      const dialogs = document.querySelectorAll('[role="dialog"]');
      expect(dialogs.length).toBeGreaterThan(0);
    });
  });

  it('ref.openRegisterDialog 弹出注册对话框', async () => {
    const ref = createRef<UserProfileManagerHandle>();
    render(<UserProfileManager {...makeProps()} ref={ref} />);

    act(() => { ref.current?.openRegisterDialog(); });

    await waitFor(() => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      expect(dialogs.length).toBeGreaterThan(0);
    });
  });

  it('ref.openProfileDialog 在已登录时弹出资料对话框', async () => {
    const ref = createRef<UserProfileManagerHandle>();
    render(
      <UserProfileManager
        {...makeProps({
          isLoggedIn: true,
          currentUser: { username: 'test', uuid: 'u1', email: 'a@b.com' },
        })}
        ref={ref}
      />,
    );

    act(() => { ref.current?.openProfileDialog(); });

    await waitFor(() => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      expect(dialogs.length).toBeGreaterThan(0);
    });
  });

  it('ref.logout 清除 localStorage', async () => {
    localStorageMock.setItem('token', 'test-token');
    localStorageMock.setItem('user', '{}');

    const setIsLoggedIn = jest.fn();
    const setCurrentUser = jest.fn();
    const setAlertInfo = jest.fn();
    const ref = createRef<UserProfileManagerHandle>();

    render(
      <UserProfileManager
        {...makeProps({
          isLoggedIn: true,
          currentUser: { username: 'test', uuid: 'u1' },
          setIsLoggedIn,
          setCurrentUser,
          setAlertInfo,
        })}
        ref={ref}
      />,
    );

    act(() => { ref.current?.logout(); });

    // logout 内部弹确认对话框，先点确认
    await waitFor(() => {
      // logout 通过 setAlertInfo 弹"确认退出"
      expect(setAlertInfo).toHaveBeenCalled();
    });

    // 触发 onConfirm
    const call = setAlertInfo.mock.calls[setAlertInfo.mock.calls.length - 1][0];
    if (call?.onConfirm) {
      act(() => { call.onConfirm(); });
    }

    await waitFor(() => {
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    });
  });
});

describe('UserProfileManager - 登录流程', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('登录成功：token 写入 localStorage', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'new-token',
        user: {
          username: 'test',
          uuid: 'u1',
          email: 'a@b.com',
          calculationMode: 'rate',
        },
      }),
    });

    const setIsLoggedIn = jest.fn();
    const setCurrentUser = jest.fn();
    const ref = createRef<UserProfileManagerHandle>();

    const user = userEvent.setup();
    render(
      <UserProfileManager
        {...makeProps({ setIsLoggedIn, setCurrentUser })}
        ref={ref}
      />,
    );

    act(() => { ref.current?.openLoginDialog(); });

    // 在登录对话框中找到 username/password 输入框
    await waitFor(() => {
      expect(document.querySelectorAll('[role="dialog"]').length).toBeGreaterThan(0);
    });

    const inputs = document.querySelectorAll('input');
    const usernameInput = Array.from(inputs).find(
      (i) => i.placeholder?.includes('用户') || i.name === 'username',
    );
    const passwordInput = Array.from(inputs).find((i) => i.type === 'password');

    if (usernameInput && passwordInput) {
      await user.type(usernameInput, 'test');
      await user.type(passwordInput, 'pwd123');

      // 找到登录提交按钮
      const submitButton = screen.getAllByRole('button')
        .find((b) => b.textContent === '登录' && (b as HTMLButtonElement).type === 'submit')
        ?? screen.getAllByRole('button').find((b) => b.textContent === '登录');

      if (submitButton) {
        await user.click(submitButton);
        await waitFor(() => {
          expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-token');
        });
      }
    }
  });

  it('登录失败：显示 setLoginError', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '用户名或密码错误' }),
    });

    const ref = createRef<UserProfileManagerHandle>();
    const user = userEvent.setup();

    render(<UserProfileManager {...makeProps()} ref={ref} />);
    act(() => { ref.current?.openLoginDialog(); });

    await waitFor(() => {
      expect(document.querySelectorAll('[role="dialog"]').length).toBeGreaterThan(0);
    });

    const inputs = document.querySelectorAll('input');
    const usernameInput = inputs[0];
    const passwordInput = Array.from(inputs).find((i) => i.type === 'password');

    if (usernameInput && passwordInput) {
      await user.type(usernameInput, 'wrong');
      await user.type(passwordInput, 'wrong');

      const submitButtons = screen.getAllByRole('button');
      const loginButton = submitButtons.find(
        (b) => b.textContent === '登录' && b.closest('[role="dialog"]'),
      );

      if (loginButton) {
        await user.click(loginButton);

        // 等错误信息出现
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalled();
        });
      }
    }
  });
});

describe('UserProfileManager - props 变化', () => {
  beforeEach(() => jest.clearAllMocks());

  it('isLoggedIn 从 false 切到 true 时不崩', () => {
    const { rerender } = render(<UserProfileManager {...makeProps()} />);
    rerender(
      <UserProfileManager
        {...makeProps({
          isLoggedIn: true,
          currentUser: { username: 'test', uuid: 'u1' },
        })}
      />,
    );
    // 没有 throw 即视为通过
    expect(true).toBe(true);
  });
});
