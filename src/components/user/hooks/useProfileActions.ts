import { useCallback } from 'react';
import type { User } from '@/types/stock';
import type { useAuthDialogs } from './useAuthDialogs';
import type { useUserAuthApi } from './useUserAuthApi';

type DialogsHook = ReturnType<typeof useAuthDialogs>;
type AuthApiHook = ReturnType<typeof useUserAuthApi>;

interface AlertInfo {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface UseProfileActionsProps {
  dialogs: DialogsHook;
  authApi: AuthApiHook;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  setIsLoggedIn: (v: boolean) => void;
  setAlertInfo: (info: AlertInfo | null) => void;
  loadUserSettings: (user: User | null) => void;
  onDataFetch?: (token: string) => Promise<void>;
  onRefreshPrices?: (showAlert: boolean) => Promise<void>;
  retirementGoal: string;
  annualReturn: string;
  targetYears: string;
  calculationMode: 'rate' | 'years';
}

/**
 * 聚合 UserProfileManager 中 4 个业务动作：
 * - handleLogin / handleRegister / handleUpdateProfile / handleLogout
 * 以及用于进入资料对话框时初始化字段的 openProfileDialogWithUserData。
 */
export function useProfileActions({
  dialogs,
  authApi,
  currentUser,
  setCurrentUser,
  setIsLoggedIn,
  setAlertInfo,
  loadUserSettings,
  onDataFetch,
  onRefreshPrices,
  retirementGoal,
  annualReturn,
  targetYears,
  calculationMode,
}: UseProfileActionsProps) {
  const handleLogin = useCallback(async () => {
    if (!dialogs.username || !dialogs.password) {
      dialogs.setLoginError('用户名和密码为必填项');
      return;
    }
    const result = await authApi.login({
      username: dialogs.username,
      password: dialogs.password,
    });

    if (result.success && result.token && result.user) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      setCurrentUser(result.user);
      loadUserSettings(result.user);
      setIsLoggedIn(true);
      dialogs.setIsLoginDialogOpen(false);
      dialogs.setLoginError('');

      if (onDataFetch) await onDataFetch(result.token);
      if (onRefreshPrices) await onRefreshPrices(false);

      setAlertInfo({
        isOpen: true,
        title: '登录成功',
        description: '数据已加载，价格已刷新',
        onConfirm: () => setAlertInfo(null),
      });
    } else {
      dialogs.setLoginError(result.message || '登录失败');
    }
  }, [dialogs, authApi, setCurrentUser, setIsLoggedIn, setAlertInfo, loadUserSettings, onDataFetch, onRefreshPrices]);

  const handleRegister = useCallback(async () => {
    if (!dialogs.username || !dialogs.password) {
      dialogs.setRegisterError('用户名和密码为必填项');
      return;
    }

    const result = await authApi.register({
      username: dialogs.username,
      password: dialogs.password,
      email: dialogs.email,
      nickname: dialogs.nickname,
      retirementGoal,
      annualReturn,
      targetYears,
      calculationMode,
    });

    if (!result.success) {
      dialogs.setRegisterError(result.message || '注册失败');
      return;
    }

    if (result.token && result.user) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      setCurrentUser(result.user);
      loadUserSettings(result.user);
      setIsLoggedIn(true);
      dialogs.setIsRegisterDialogOpen(false);
      dialogs.setRegisterError('');
      dialogs.setUsername('');
      dialogs.setPassword('');
      dialogs.setEmail('');

      if (onDataFetch) await onDataFetch(result.token);
      if (onRefreshPrices) await onRefreshPrices(false);

      setAlertInfo({
        isOpen: true,
        title: '注册成功',
        description: '您已经成功注册并登录，数据已加载',
        onConfirm: () => setAlertInfo(null),
      });
    } else {
      // 无 token：回到登录页
      dialogs.setIsRegisterDialogOpen(false);
      dialogs.setRegisterError('');
      dialogs.setUsername('');
      dialogs.setPassword('');
      dialogs.setEmail('');
      setAlertInfo({
        isOpen: true,
        title: '注册成功',
        description: '请使用您的新账号登录',
        onConfirm: () => {
          setAlertInfo(null);
          dialogs.setIsLoginDialogOpen(true);
        },
      });
    }
  }, [dialogs, authApi, retirementGoal, annualReturn, targetYears, calculationMode, setCurrentUser, setIsLoggedIn, setAlertInfo, loadUserSettings, onDataFetch, onRefreshPrices]);

  const handleUpdateProfile = useCallback(async () => {
    if (!dialogs.oldPassword) {
      dialogs.setProfileError('请输入当前密码以验证身份');
      return;
    }
    if (dialogs.newPassword && dialogs.newPassword !== dialogs.confirmPassword) {
      dialogs.setProfileError('新密码和确认密码不匹配');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      dialogs.setProfileError('您需要登录才能更新个人资料');
      return;
    }

    const result = await authApi.updateProfile(token, {
      nickname: dialogs.nickname,
      email: dialogs.email,
      oldPassword: dialogs.oldPassword,
      newPassword: dialogs.newPassword || undefined,
      retirementGoal,
      annualReturn,
      targetYears,
      calculationMode,
    });

    if (result.success) {
      if (currentUser) {
        const updatedUser: User = {
          ...currentUser,
          nickname: dialogs.nickname || currentUser.nickname,
          email: dialogs.email || currentUser.email,
          retirementGoal,
          annualReturn,
          targetYears,
          calculationMode,
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
      }
      dialogs.setIsProfileDialogOpen(false);
      dialogs.resetProfileEdits();
      setAlertInfo({
        isOpen: true,
        title: '更新成功',
        description: '您的个人资料已成功更新',
        onConfirm: () => setAlertInfo(null),
      });
    } else {
      dialogs.setProfileError(result.message || '更新失败');
    }
  }, [dialogs, authApi, retirementGoal, annualReturn, targetYears, calculationMode, currentUser, setCurrentUser, setAlertInfo]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setAlertInfo({
      isOpen: true,
      title: '已登出',
      description: '您已成功登出系统',
      onConfirm: () => setAlertInfo(null),
    });
  }, [setIsLoggedIn, setCurrentUser, setAlertInfo]);

  const openProfileDialogWithUserData = useCallback(() => {
    dialogs.setNickname(currentUser?.nickname || '');
    dialogs.setEmail(currentUser?.email || '');
    dialogs.setNewPassword('');
    dialogs.setConfirmPassword('');
    dialogs.setProfileError('');
    loadUserSettings(currentUser);
    dialogs.setIsProfileDialogOpen(true);
  }, [dialogs, currentUser, loadUserSettings]);

  const handleProfileCancel = useCallback(() => {
    dialogs.setIsProfileDialogOpen(false);
    dialogs.resetProfileEdits();
    dialogs.setNickname(currentUser?.nickname || '');
    dialogs.setEmail(currentUser?.email || '');
  }, [dialogs, currentUser]);

  return {
    handleLogin,
    handleRegister,
    handleUpdateProfile,
    handleLogout,
    openProfileDialogWithUserData,
    handleProfileCancel,
  };
}
