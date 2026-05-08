import React, { forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { User } from '@/types/stock';
import { useUserSettings } from '@/hooks/useUserSettings';
import { LoginDialog } from './user/LoginDialog';
import { RegisterDialog } from './user/RegisterDialog';
import { ProfileEditDialog } from './user/ProfileEditDialog';
import { useAuthDialogs } from './user/hooks/useAuthDialogs';
import { useUserAuthApi } from './user/hooks/useUserAuthApi';
import { useProfileActions } from './user/hooks/useProfileActions';

interface AlertInfo {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface UserProfileManagerProps {
  isLoggedIn: boolean;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  setAlertInfo: (alertInfo: AlertInfo | null) => void;
  onDataFetch?: (token: string) => Promise<void>;
  onRefreshPrices?: (showAlert: boolean) => Promise<void>;
  currency: string;
  latestYear: string;
  totalValues: { [year: string]: number };
  formatLargeNumber: (value: number, currency?: string) => string;
  getLatestYearGrowthRate: () => string | null;
  onCloseParentMenu?: () => void;
}

export interface UserProfileManagerHandle {
  openLoginDialog: () => void;
  openRegisterDialog: () => void;
  openProfileDialog: () => void;
  logout: () => void;
}

const UserProfileManager = forwardRef<UserProfileManagerHandle, UserProfileManagerProps>(
  (
    {
      isLoggedIn,
      currentUser,
      setCurrentUser,
      setIsLoggedIn,
      setAlertInfo,
      onDataFetch,
      onRefreshPrices,
      currency,
      latestYear,
      totalValues,
      formatLargeNumber,
      getLatestYearGrowthRate,
      onCloseParentMenu,
    },
    ref,
  ) => {
    const dialogs = useAuthDialogs();
    const authApi = useUserAuthApi();

    const settings = useUserSettings(currentUser, isLoggedIn, setCurrentUser);
    const {
      retirementGoal,
      annualReturn,
      targetYears,
      calculationMode,
      updateRetirementGoal,
      updateAnnualReturn,
      updateTargetYears,
      updateCalculationMode,
      loadUserSettings,
    } = settings;

    const actions = useProfileActions({
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
    });

    useImperativeHandle(ref, () => ({
      openLoginDialog: dialogs.openLoginDialog,
      openRegisterDialog: dialogs.openRegisterDialog,
      openProfileDialog: actions.openProfileDialogWithUserData,
      logout: actions.handleLogout,
    }));

    const useAverageReturn = () => {
      const latestRate = getLatestYearGrowthRate();
      if (latestRate) updateAnnualReturn(latestRate);
    };

    const currentAmount = totalValues[latestYear] || 0;
    const formatNumber = (value: number, curr?: string) => formatLargeNumber(value, curr || currency);

    return (
      <>
        <div className="space-x-2">
          {isLoggedIn ? (
            <>
              <Button onClick={actions.openProfileDialogWithUserData} variant="outline">
                个人资料
              </Button>
              <Button onClick={actions.handleLogout}>登出</Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => {
                  onCloseParentMenu?.();
                  setTimeout(() => dialogs.setIsLoginDialogOpen(true), 100);
                }}
              >
                登录
              </Button>
              <Button
                onClick={() => {
                  onCloseParentMenu?.();
                  setTimeout(() => dialogs.setIsRegisterDialogOpen(true), 100);
                }}
                variant="outline"
              >
                注册
              </Button>
            </>
          )}
        </div>

        <LoginDialog
          isOpen={dialogs.isLoginDialogOpen}
          onOpenChange={dialogs.setIsLoginDialogOpen}
          username={dialogs.username}
          setUsername={dialogs.setUsername}
          password={dialogs.password}
          setPassword={dialogs.setPassword}
          error={dialogs.loginError}
          onSubmit={actions.handleLogin}
          onSwitchToRegister={dialogs.switchToRegister}
        />

        <RegisterDialog
          isOpen={dialogs.isRegisterDialogOpen}
          onOpenChange={dialogs.setIsRegisterDialogOpen}
          username={dialogs.username}
          setUsername={dialogs.setUsername}
          password={dialogs.password}
          setPassword={dialogs.setPassword}
          nickname={dialogs.nickname}
          setNickname={dialogs.setNickname}
          email={dialogs.email}
          setEmail={dialogs.setEmail}
          error={dialogs.registerError}
          onSubmit={actions.handleRegister}
          onSwitchToLogin={dialogs.switchToLogin}
          retirementGoal={retirementGoal}
          annualReturn={annualReturn}
          targetYears={targetYears}
          calculationMode={calculationMode}
          currency={currency}
          currentAmount={currentAmount}
          onRetirementGoalChange={updateRetirementGoal}
          onAnnualReturnChange={updateAnnualReturn}
          onTargetYearsChange={updateTargetYears}
          onCalculationModeChange={updateCalculationMode}
          onUseAverageReturn={useAverageReturn}
          formatLargeNumber={formatNumber}
        />

        <ProfileEditDialog
          isOpen={dialogs.isProfileDialogOpen}
          onOpenChange={dialogs.setIsProfileDialogOpen}
          currentUsername={currentUser?.username || ''}
          nickname={dialogs.nickname}
          setNickname={dialogs.setNickname}
          email={dialogs.email}
          setEmail={dialogs.setEmail}
          oldPassword={dialogs.oldPassword}
          setOldPassword={dialogs.setOldPassword}
          newPassword={dialogs.newPassword}
          setNewPassword={dialogs.setNewPassword}
          confirmPassword={dialogs.confirmPassword}
          setConfirmPassword={dialogs.setConfirmPassword}
          error={dialogs.profileError}
          onSubmit={actions.handleUpdateProfile}
          onCancel={actions.handleProfileCancel}
          retirementGoal={retirementGoal}
          annualReturn={annualReturn}
          targetYears={targetYears}
          calculationMode={calculationMode}
          currency={currency}
          currentAmount={currentAmount}
          onRetirementGoalChange={updateRetirementGoal}
          onAnnualReturnChange={updateAnnualReturn}
          onTargetYearsChange={updateTargetYears}
          onCalculationModeChange={updateCalculationMode}
          onUseAverageReturn={useAverageReturn}
          formatLargeNumber={formatNumber}
        />
      </>
    );
  },
);

UserProfileManager.displayName = 'UserProfileManager';

export default UserProfileManager;
