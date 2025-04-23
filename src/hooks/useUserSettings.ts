import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types/stock';

interface UserSettings {
  retirementGoal: string;
  annualReturn: string;
  targetYears: string;
  calculationMode: 'rate' | 'years';
}

interface UseUserSettingsReturn extends UserSettings {
  updateRetirementGoal: (value: string) => void;
  updateAnnualReturn: (value: string) => void;
  updateTargetYears: (value: string) => void;
  updateCalculationMode: (value: 'rate' | 'years') => void;
  updateAllSettings: (settings: Partial<UserSettings>) => void;
  loadUserSettings: (user: User | null) => void;
}

/**
 * 自定义Hook，用于管理用户的退休目标计算器设置
 */
export const useUserSettings = (
  currentUser: User | null,
  isLoggedIn: boolean,
  setCurrentUser?: (user: User | null) => void
): UseUserSettingsReturn => {
  // 退休目标计算器相关状态
  const [retirementGoal, setRetirementGoal] = useState(() => {
    // 如果用户已登录，使用用户信息中的退休目标金额
    if (typeof window !== 'undefined') {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          if (user.retirementGoal) {
            return user.retirementGoal;
          }
        } catch (error) {
          console.error('解析用户数据失败:', error);
        }
      }
      // 如果用户未登录或没有设置退休目标金额，使用 localStorage
      const savedGoal = localStorage.getItem('retirementGoal');
      return savedGoal || '';
    }
    return '';
  });

  const [annualReturn, setAnnualReturn] = useState(() => {
    // 如果用户已登录，使用用户信息中的预期年回报率
    if (typeof window !== 'undefined') {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          if (user.annualReturn) {
            return user.annualReturn;
          }
        } catch (error) {
          console.error('解析用户数据失败:', error);
        }
      }
      // 如果用户未登录或没有设置预期年回报率，使用 localStorage
      const savedReturn = localStorage.getItem('annualReturn');
      return savedReturn || '';
    }
    return '';
  });

  const [targetYears, setTargetYears] = useState(() => {
    // 如果用户已登录，使用用户信息中的目标年限
    if (typeof window !== 'undefined') {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          if (user.targetYears) {
            return user.targetYears;
          }
        } catch (error) {
          console.error('解析用户数据失败:', error);
        }
      }
      // 如果用户未登录或没有设置目标年限，使用 localStorage
      const savedYears = localStorage.getItem('targetYears');
      return savedYears || '';
    }
    return '';
  });

  const [calculationMode, setCalculationMode] = useState<'rate' | 'years'>(() => {
    // 如果用户已登录，使用用户信息中的计算模式
    if (typeof window !== 'undefined') {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          if (user.calculationMode) {
            return user.calculationMode as 'rate' | 'years';
          }
        } catch (error) {
          console.error('解析用户数据失败:', error);
        }
      }
      // 如果用户未登录或没有设置计算模式，使用 localStorage
      const savedMode = localStorage.getItem('calculationMode');
      return (savedMode as 'rate' | 'years') || 'rate';
    }
    return 'rate';
  });

  // 更新退休目标金额
  const updateRetirementGoal = useCallback((value: string) => {
    setRetirementGoal(value);

    // 如果用户已登录，更新用户信息
    if (currentUser && isLoggedIn && setCurrentUser) {
      const updatedUser: User = {
        ...currentUser,
        retirementGoal: value,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
    } else {
      // 如果用户未登录，保存到 localStorage
      localStorage.setItem('retirementGoal', value);
    }
  }, [currentUser, isLoggedIn, setCurrentUser]);

  // 更新预期年回报率
  const updateAnnualReturn = useCallback((value: string) => {
    setAnnualReturn(value);

    // 如果用户已登录，更新用户信息
    if (currentUser && isLoggedIn && setCurrentUser) {
      const updatedUser: User = {
        ...currentUser,
        annualReturn: value,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
    } else {
      // 如果用户未登录，保存到 localStorage
      localStorage.setItem('annualReturn', value);
    }
  }, [currentUser, isLoggedIn, setCurrentUser]);

  // 更新目标年限
  const updateTargetYears = useCallback((value: string) => {
    setTargetYears(value);

    // 如果用户已登录，更新用户信息
    if (currentUser && isLoggedIn && setCurrentUser) {
      const updatedUser: User = {
        ...currentUser,
        targetYears: value,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
    } else {
      // 如果用户未登录，保存到 localStorage
      localStorage.setItem('targetYears', value);
    }
  }, [currentUser, isLoggedIn, setCurrentUser]);

  // 更新计算模式
  const updateCalculationMode = useCallback((value: 'rate' | 'years') => {
    setCalculationMode(value);

    // 如果用户已登录，更新用户信息
    if (currentUser && isLoggedIn && setCurrentUser) {
      const updatedUser: User = {
        ...currentUser,
        calculationMode: value,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
    } else {
      // 如果用户未登录，保存到 localStorage
      localStorage.setItem('calculationMode', value);
    }
  }, [currentUser, isLoggedIn, setCurrentUser]);

  // 批量更新所有设置
  const updateAllSettings = useCallback((settings: Partial<UserSettings>) => {
    if (settings.retirementGoal !== undefined) setRetirementGoal(settings.retirementGoal);
    if (settings.annualReturn !== undefined) setAnnualReturn(settings.annualReturn);
    if (settings.targetYears !== undefined) setTargetYears(settings.targetYears);
    if (settings.calculationMode !== undefined) setCalculationMode(settings.calculationMode);

    // 如果用户已登录，更新用户信息
    if (currentUser && isLoggedIn && setCurrentUser) {
      const updatedUser: User = {
        ...currentUser,
        ...(settings.retirementGoal !== undefined && { retirementGoal: settings.retirementGoal }),
        ...(settings.annualReturn !== undefined && { annualReturn: settings.annualReturn }),
        ...(settings.targetYears !== undefined && { targetYears: settings.targetYears }),
        ...(settings.calculationMode !== undefined && { calculationMode: settings.calculationMode }),
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
    } else {
      // 如果用户未登录，保存到 localStorage
      if (settings.retirementGoal !== undefined) localStorage.setItem('retirementGoal', settings.retirementGoal);
      if (settings.annualReturn !== undefined) localStorage.setItem('annualReturn', settings.annualReturn);
      if (settings.targetYears !== undefined) localStorage.setItem('targetYears', settings.targetYears);
      if (settings.calculationMode !== undefined) localStorage.setItem('calculationMode', settings.calculationMode);
    }
  }, [currentUser, isLoggedIn, setCurrentUser]);

  // 从用户对象加载设置
  const loadUserSettings = useCallback((user: User | null) => {
    if (user) {
      if (user.retirementGoal) setRetirementGoal(user.retirementGoal);
      if (user.annualReturn) setAnnualReturn(user.annualReturn);
      if (user.targetYears) setTargetYears(user.targetYears);
      if (user.calculationMode) setCalculationMode(user.calculationMode);
    }
  }, [setRetirementGoal, setAnnualReturn, setTargetYears, setCalculationMode]);

  // 监听 currentUser 变化，自动加载用户设置
  useEffect(() => {
    if (currentUser && isLoggedIn) {
      loadUserSettings(currentUser);
    }
  }, [currentUser, isLoggedIn, loadUserSettings]);

  return {
    retirementGoal,
    annualReturn,
    targetYears,
    calculationMode,
    updateRetirementGoal,
    updateAnnualReturn,
    updateTargetYears,
    updateCalculationMode,
    updateAllSettings,
    loadUserSettings
  };
};
