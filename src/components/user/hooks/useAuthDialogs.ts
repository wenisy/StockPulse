import { useCallback, useState } from 'react';

/**
 * 管理登录/注册/资料三个对话框的状态。
 *
 * 注意：原 UserProfileManager 中 username/password/nickname/email 在登录与注册
 * 之间共享，这里保留该行为（避免改变外部观察到的状态）。三个 Dialog 都通过 props
 * 接收同一组字段。只有密码相关的字段（oldPassword/newPassword/confirmPassword）
 * 和各自的错误消息字段独立。
 */
export function useAuthDialogs() {
  // 对话框开关
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  // 共享表单字段
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');

  // 资料编辑对话框独有字段
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 错误消息
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [profileError, setProfileError] = useState('');

  // 打开各对话框（稳定引用）
  const openLoginDialog = useCallback(() => setIsLoginDialogOpen(true), []);
  const openRegisterDialog = useCallback(() => setIsRegisterDialogOpen(true), []);
  const openProfileDialog = useCallback(() => setIsProfileDialogOpen(true), []);

  // 切换对话框（登录 → 注册 / 注册 → 登录）
  const switchToRegister = useCallback(() => {
    setIsLoginDialogOpen(false);
    setIsRegisterDialogOpen(true);
  }, []);
  const switchToLogin = useCallback(() => {
    setIsRegisterDialogOpen(false);
    setIsLoginDialogOpen(true);
  }, []);

  // 重置个人资料对话框的临时字段
  const resetProfileEdits = useCallback(() => {
    setProfileError('');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }, []);

  return {
    // 对话框开关
    isLoginDialogOpen,
    setIsLoginDialogOpen,
    isRegisterDialogOpen,
    setIsRegisterDialogOpen,
    isProfileDialogOpen,
    setIsProfileDialogOpen,

    // 共享字段
    username,
    setUsername,
    password,
    setPassword,
    nickname,
    setNickname,
    email,
    setEmail,

    // 资料字段
    oldPassword,
    setOldPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,

    // 错误消息
    loginError,
    setLoginError,
    registerError,
    setRegisterError,
    profileError,
    setProfileError,

    // 动作
    openLoginDialog,
    openRegisterDialog,
    openProfileDialog,
    switchToRegister,
    switchToLogin,
    resetProfileEdits,
  };
}
