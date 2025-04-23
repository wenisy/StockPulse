import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TooltipProvider, Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface RetirementCalculatorProps {
  retirementGoal: string;
  annualReturn: string;
  targetYears: string;
  calculationMode: 'rate' | 'years';
  currency: string;
  currentAmount: number;
  onRetirementGoalChange: (value: string) => void;
  onAnnualReturnChange: (value: string) => void;
  onTargetYearsChange: (value: string) => void;
  onCalculationModeChange: (value: 'rate' | 'years') => void;
  onUseAverageReturn?: () => void;
  formatLargeNumber: (value: number, currency?: string | undefined) => string;
  compact?: boolean;
}

/**
 * 退休目标计算器组件
 * 可以在主页面和个人资料对话框中重用
 */
const RetirementCalculator: React.FC<RetirementCalculatorProps> = ({
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
  compact = false
}) => {
  // 计算达到目标所需年数
  const calculateYearsToGoal = (currentAmount: number, goalAmount: number, returnRate: number) => {
    if (returnRate <= 0) return Infinity;
    const years = Math.log(goalAmount / currentAmount) / Math.log(1 + returnRate / 100);
    return Math.ceil(years);
  };

  // 计算达到目标所需年回报率
  const calculateRequiredReturnRate = (currentAmount: number, goalAmount: number, years: number) => {
    if (years <= 0) return Infinity;
    return (Math.pow(goalAmount / currentAmount, 1 / years) - 1) * 100;
  };

  // 渲染计算结果
  const renderCalculationResult = () => {
    const goalAmount = parseFloat(retirementGoal);

    if (!goalAmount || isNaN(goalAmount)) {
      return <p className="text-gray-500">请输入目标金额</p>;
    }

    if (calculationMode === 'rate') {
      const returnRate = parseFloat(annualReturn);
      if (!returnRate || isNaN(returnRate)) {
        return <p className="text-gray-500">请输入预期年回报率</p>;
      }
      const yearsNeeded = calculateYearsToGoal(currentAmount, goalAmount, returnRate);

      return (
        <div className="space-y-2">
          <p>当前总资产: <span className="font-semibold">{formatLargeNumber(currentAmount, currency)}</span></p>
          <p>目标金额: <span className="font-semibold">{formatLargeNumber(goalAmount, currency)}</span></p>
          <p>差距金额: <span className="font-semibold">{formatLargeNumber(goalAmount - currentAmount, currency)}</span></p>
          <p>预期年回报率: <span className="font-semibold">{returnRate}%</span></p>
          {yearsNeeded === Infinity ? (
            <p className="text-red-500">无法达到目标（回报率过低）</p>
          ) : yearsNeeded <= 0 ? (
            <p className="text-green-500">已达到目标！</p>
          ) : (
            <p>预计需要 <span className="font-semibold text-blue-600">{yearsNeeded.toFixed(1)}</span> 年可达到目标</p>
          )}
        </div>
      );
    } else {
      const years = parseInt(targetYears);
      if (!years || isNaN(years)) {
        return <p className="text-gray-500">请输入目标年限</p>;
      }
      const requiredRate = calculateRequiredReturnRate(currentAmount, goalAmount, years);

      return (
        <div className="space-y-2">
          <p>当前总资产: <span className="font-semibold">{formatLargeNumber(currentAmount, currency)}</span></p>
          <p>目标金额: <span className="font-semibold">{formatLargeNumber(goalAmount, currency)}</span></p>
          <p>差距金额: <span className="font-semibold">{formatLargeNumber(goalAmount - currentAmount, currency)}</span></p>
          <p>目标年限: <span className="font-semibold">{years}</span> 年</p>
          {currentAmount >= goalAmount ? (
            <p className="text-green-500">已达到目标！</p>
          ) : requiredRate > 100 ? (
            <p className="text-red-500">年限过短，需要的回报率过高（超过100%）</p>
          ) : (
            <p>需要年回报率: <span className="font-semibold text-blue-600">{requiredRate.toFixed(2)}%</span></p>
          )}
        </div>
      );
    }
  };

  return (
    <div className={cn("grid grid-cols-1", compact ? "gap-4" : "md:grid-cols-2 gap-6")}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">目标金额 ({currency})</label>
          <Input
            type="number"
            value={retirementGoal}
            onChange={(e) => onRetirementGoalChange(e.target.value)}
            placeholder="输入目标金额"
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">计算模式</label>
          <div className="flex space-x-2">
            <Button
              type="button"
              onClick={() => onCalculationModeChange('rate')}
              className={cn(calculationMode === 'rate' ? 'bg-blue-500 text-white' : 'bg-gray-200')}
            >
              输入预期回报率
            </Button>
            <Button
              type="button"
              onClick={() => onCalculationModeChange('years')}
              className={cn(calculationMode === 'years' ? 'bg-blue-500 text-white' : 'bg-gray-200')}
            >
              输入目标年限
            </Button>
          </div>
        </div>
        <div>
          {calculationMode === 'rate' ? (
            <div>
              <label className="block text-sm font-medium mb-1">预期年回报率 (%)</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={annualReturn}
                  onChange={(e) => onAnnualReturnChange(e.target.value)}
                  placeholder="输入预期年回报率"
                  className="w-full"
                  step="0.1"
                />
                {onUseAverageReturn && (
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={onUseAverageReturn}
                          type="button"
                          variant="outline"
                          className="whitespace-nowrap"
                        >
                          使用平均年化回报率
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>平均年化回报率是从最早投资年份到最新年份的复合年增长率(CAGR)。</p>
                        <p>计算公式：CAGR = ((1 + 总收益率)^(1/投资年数)) - 1</p>
                        <p>其中，总收益率 = (当前总持仓价值 - 累计投入现金) / 累计投入现金</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">目标年限 (年)</label>
              <Input
                type="number"
                value={targetYears}
                onChange={(e) => onTargetYearsChange(e.target.value)}
                placeholder="输入目标年限"
                className="w-full"
                step="1"
              />
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">计算结果</h3>
          {renderCalculationResult()}
        </div>
      )}
    </div>
  );
};

export default RetirementCalculator;
