import { useCallback } from 'react';
import type { User } from '@/types/stock';

const BACKEND_DOMAIN = '//stock-backend-tau.vercel.app';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  email?: string;
  nickname?: string;
  retirementGoal?: string;
  annualReturn?: string;
  targetYears?: string;
  calculationMode?: 'rate' | 'years';
}

export interface UpdateProfileData {
  nickname?: string;
  email?: string;
  oldPassword: string;
  newPassword?: string;
  retirementGoal?: string;
  annualReturn?: string;
  targetYears?: string;
  calculationMode?: 'rate' | 'years';
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

/**
 * 封装与用户认证相关的三个后端 API 调用。
 * 所有方法都统一返回 `{ success, ... }` 结构，由调用方决定 UI 反馈。
 */
export function useUserAuthApi() {
  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${BACKEND_DOMAIN}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await response.json();
      if (response.ok) {
        return {
          success: true,
          token: data.token,
          user: data.user
            ? {
                username: data.user.username,
                nickname: data.user.nickname,
                email: data.user.email,
                uuid: data.user.uuid,
                retirementGoal: data.user.retirementGoal,
                annualReturn: data.user.annualReturn,
                targetYears: data.user.targetYears,
                calculationMode: (data.user.calculationMode as 'rate' | 'years') || 'rate',
              }
            : undefined,
        };
      }
      return { success: false, message: data.message || '登录失败' };
    } catch {
      return { success: false, message: '网络错误，请稍后再试' };
    }
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${BACKEND_DOMAIN}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          retirementGoal: data.retirementGoal || '',
          annualReturn: data.annualReturn || '',
          targetYears: data.targetYears || '',
          calculationMode: data.calculationMode || 'rate',
        }),
      });
      const result = await response.json();
      if (response.ok) {
        return {
          success: true,
          token: result.token,
          user: result.user
            ? {
                username: result.user.username,
                nickname: result.user.nickname,
                email: result.user.email,
                uuid: result.user.uuid,
                retirementGoal: result.user.retirementGoal,
                annualReturn: result.user.annualReturn,
                targetYears: result.user.targetYears,
                calculationMode: (result.user.calculationMode as 'rate' | 'years') || 'rate',
              }
            : undefined,
        };
      }
      return { success: false, message: result.message || '注册失败' };
    } catch {
      return { success: false, message: '网络错误，请稍后再试' };
    }
  }, []);

  const updateProfile = useCallback(
    async (token: string, data: UpdateProfileData): Promise<AuthResponse> => {
      try {
        const body: Record<string, unknown> = { oldPassword: data.oldPassword };
        if (data.nickname) body.nickname = data.nickname;
        if (data.email) body.email = data.email;
        if (data.newPassword) body.newPassword = data.newPassword;
        body.retirementGoal = data.retirementGoal;
        body.annualReturn = data.annualReturn;
        body.targetYears = data.targetYears;
        body.calculationMode = data.calculationMode;

        const response = await fetch(`${BACKEND_DOMAIN}/api/updateProfile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
          },
          body: JSON.stringify(body),
        });
        const result = await response.json();
        if (response.ok) {
          return { success: true };
        }
        return { success: false, message: result.message || '更新失败' };
      } catch {
        return { success: false, message: '网络错误，请稍后再试' };
      }
    },
    [],
  );

  return { login, register, updateProfile };
}
