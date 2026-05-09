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

export interface RegisterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  nickname: string;
  setNickname: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  error: string;
  onSubmit: () => void;
  onSwitchToLogin: () => void;

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

export const RegisterDialog: React.FC<RegisterDialogProps> = ({
  isOpen,
  onOpenChange,
  username,
  setUsername,
  password,
  setPassword,
  nickname,
  setNickname,
  email,
  setEmail,
  error,
  onSubmit,
  onSwitchToLogin,
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
          <DialogTitle>注册新账号</DialogTitle>
          <DialogDescription>请填写以下信息创建新账号</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            type="text"
            placeholder="昵称（可选）"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <Input
            type="email"
            placeholder="电子邮箱（可选）"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div>
            <label className="text-sm font-medium">退休目标计算器设置（可选）</label>
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
          {error && <p className="text-danger">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={onSubmit}>注册</Button>
          <Button variant="outline" onClick={onSwitchToLogin}>
            返回登录
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
