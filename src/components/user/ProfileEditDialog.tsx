import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import RetirementCalculator from '../RetirementCalculator';

export interface ProfileEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;

  currentUsername: string;
  nickname: string;
  setNickname: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  oldPassword: string;
  setOldPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;

  error: string;
  onSubmit: () => void;
  onCancel: () => void;

  // RetirementCalculator 所需 props
  retirementGoal: string;
  annualReturn: string;
  targetYears: string;
  calculationMode: 'rate' | 'years';
  currency: string;
  currentAmount: number;
  onRetirementGoalChange: (v: string) => void;
  onAnnualReturnChange: (v: string) => void;
  onTargetYearsChange: (v: string) => void;
  onCalculationModeChange: (v: 'rate' | 'years') => void;
  onUseAverageReturn: () => void;
  formatLargeNumber: (value: number, curr?: string) => string;
}

export const ProfileEditDialog: React.FC<ProfileEditDialogProps> = ({
  isOpen,
  onOpenChange,
  currentUsername,
  nickname,
  setNickname,
  email,
  setEmail,
  oldPassword,
  setOldPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  error,
  onSubmit,
  onCancel,
  retirementGoal,
  annualReturn,
  targetYears,
  calculationMode,
  currency,
  currentAmount,
  onRetirementGoalChange,
  onAnnualReturnChange,
  onTargetYearsChange,
  onCalculationModeChange,
  onUseAverageReturn,
  formatLargeNumber,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>个人资料</DialogTitle>
          <DialogDescription>编辑您的个人信息</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">用户名</label>
            <Input type="text" value={currentUsername} disabled className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">昵称</label>
            <Input
              type="text"
              placeholder="设置昵称"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">电子邮箱</label>
            <Input
              type="email"
              placeholder="设置电子邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">当前密码</label>
            <Input
              type="password"
              placeholder="输入当前密码以验证身份"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">新密码</label>
            <Input
              type="password"
              placeholder="留空表示不修改"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">确认密码</label>
            <Input
              type="password"
              placeholder="再次输入新密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">退休目标计算器设置</label>
            <div className="mt-2">
              <RetirementCalculator
                retirementGoal={retirementGoal}
                annualReturn={annualReturn}
                targetYears={targetYears}
                calculationMode={calculationMode}
                currency={currency}
                currentAmount={currentAmount}
                onRetirementGoalChange={onRetirementGoalChange}
                onAnnualReturnChange={onAnnualReturnChange}
                onTargetYearsChange={onTargetYearsChange}
                onCalculationModeChange={onCalculationModeChange}
                onUseAverageReturn={onUseAverageReturn}
                formatLargeNumber={formatLargeNumber}
                compact={true}
              />
            </div>
          </div>
          {error && <p className="text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={onSubmit}>保存更改</Button>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
