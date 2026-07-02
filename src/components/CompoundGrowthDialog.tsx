"use client";
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { useResolvedColors } from '@/hooks/useResolvedColors';

interface CompoundGrowthData {
  year: number;
  totalValue: number;
  principal: number;
  interest: number;
  isAfterGoal?: boolean;
  beforeGoalValue?: number;
  afterGoalValue?: number;
}

interface CompoundGrowthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentAmount: number;
  goalAmount: number;
  returnRate: number;
  yearsNeeded: number;
  currency: string;
  formatLargeNumber: (value: number, currency?: string) => string;
}

const CompoundGrowthDialog: React.FC<CompoundGrowthDialogProps> = ({
  isOpen,
  onClose,
  currentAmount,
  goalAmount,
  returnRate,
  yearsNeeded,
  currency,
  formatLargeNumber
}) => {
  const colors = useResolvedColors();

  const generateCompoundGrowthData = (): CompoundGrowthData[] => {
    const data: CompoundGrowthData[] = [];
    if (!yearsNeeded || yearsNeeded === Infinity || yearsNeeded <= 0 || yearsNeeded > 100) {
      return data;
    }
    const goalYear = Math.ceil(yearsNeeded);
    const totalYears = goalYear + 20;
    const maxYears = Math.min(totalYears, 70);

    let goalReachedYear = -1;
    for (let year = 0; year <= maxYears; year++) {
      const totalValue = currentAmount * Math.pow(1 + returnRate / 100, year);
      if (totalValue >= goalAmount && goalReachedYear === -1) {
        goalReachedYear = year;
        break;
      }
    }

    for (let year = 0; year <= maxYears; year++) {
      const totalValue = currentAmount * Math.pow(1 + returnRate / 100, year);
      const interest = totalValue - currentAmount;
      const isAfterGoal = year > goalYear;

      data.push({
        year,
        totalValue: Math.round(totalValue),
        principal: currentAmount,
        interest: Math.round(interest),
        isAfterGoal,
        beforeGoalValue: year <= goalReachedYear ? Math.round(totalValue) : undefined,
        afterGoalValue: year >= goalReachedYear ? Math.round(totalValue) : undefined
      });
    }
    return data;
  };

  const chartData = generateCompoundGrowthData();

  const tooltipStyle = {
    background: colors.bgElevated,
    border: `1px solid ${colors.borderDefault}`,
    color: colors.fg,
    borderRadius: 8,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] max-h-[90vh] overflow-y-auto sm:max-w-[40vw] sm:min-w-[800px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            复利增长可视化 - 感受时间的力量！
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 关键信息摘要 */}
          <div className="bg-bg-subtle p-4 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-fg-muted">起始金额</p>
                <p className="text-lg font-bold text-brand">
                  {formatLargeNumber(currentAmount, currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-fg-muted">目标金额</p>
                <p className="text-lg font-bold text-success">
                  {formatLargeNumber(goalAmount, currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-fg-muted">年回报率</p>
                <p className="text-lg font-bold text-brand">{returnRate}%</p>
              </div>
              <div>
                <p className="text-sm text-fg-muted">所需年数</p>
                <p className="text-lg font-bold text-warning">{yearsNeeded.toFixed(1)} 年</p>
              </div>
            </div>
          </div>

          {/* 复利增长折线图 */}
          <div className="bg-bg-elevated p-4 rounded-lg border border-border-subtle">
            <h3 className="text-lg font-semibold mb-4 text-center">复利增长进度 - 感受时间的力量！</h3>
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.borderSubtle} />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: colors.fgMuted, fontSize: 12 }}
                    tickFormatter={(value) => `第${value}年`}
                  />
                  <YAxis
                    tick={{ fill: colors.fgMuted, fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                      return value.toFixed(0);
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatLargeNumber(value, currency), '总价值']}
                    labelFormatter={(label) => `第${label}年`}
                    contentStyle={tooltipStyle}
                  />
                  <Legend />
                  <ReferenceLine
                    y={goalAmount}
                    stroke={colors.danger}
                    strokeDasharray="5 5"
                    label={{ value: `目标: ${formatLargeNumber(goalAmount, currency)}`, position: "insideTopRight", fill: colors.fg }}
                  />
                  <Line
                    type="monotone"
                    dataKey="beforeGoalValue"
                    stroke={colors.brand}
                    strokeWidth={3}
                    dot={{ fill: colors.brand, strokeWidth: 2, r: 4 }}
                    name="达成目标前"
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="afterGoalValue"
                    stroke={colors.success}
                    strokeWidth={3}
                    dot={{ fill: colors.success, strokeWidth: 2, r: 4 }}
                    name="继续增长的力量"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 激励文字 */}
            <div className="mt-4 p-3 bg-bg-subtle rounded-lg">
              <p className="text-sm text-center text-fg-muted">
                <span className="text-brand font-semibold">蓝色线</span>：达成目标的路径 |
                <span className="text-success font-semibold ml-2">绿色线</span>：继续存钱的无限可能！
              </p>
              <p className="text-xs text-center text-fg-subtle mt-1">
                坚持投资，让复利成为你最好的朋友 💪
              </p>
            </div>
          </div>

          {/* 表格部分 */}
          <div className="bg-bg-elevated rounded-lg border border-border-subtle">
            <h3 className="text-lg font-semibold p-4 border-b border-border-subtle text-center">复利增长明细表</h3>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-bg-subtle sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-fg">年份</th>
                    <th className="px-4 py-2 text-right text-fg">本金</th>
                    <th className="px-4 py-2 text-right text-fg">复利收益</th>
                    <th className="px-4 py-2 text-right text-fg">总价值</th>
                    <th className="px-4 py-2 text-right text-fg">年增长率</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, index) => {
                    const prevValue = index > 0 ? chartData[index - 1].totalValue : currentAmount;
                    const growthRate = index > 0 ? ((row.totalValue - prevValue) / prevValue * 100) : 0;
                    const isGoalReached = row.totalValue >= goalAmount;

                    return (
                      <tr key={row.year} className={`${
                        isGoalReached ? 'bg-success/10' : index % 2 === 0 ? 'bg-bg-elevated' : 'bg-bg-subtle'
                      }`}>
                        <td className="px-4 py-2 font-medium text-fg">
                          第 {row.year} 年
                          {isGoalReached && index === chartData.findIndex(d => d.totalValue >= goalAmount) && (
                            <span className="ml-2 text-success text-xs">🎯 达标</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-fg-muted">
                          {formatLargeNumber(row.principal, currency)}
                        </td>
                        <td className="px-4 py-2 text-right text-warning">
                          {formatLargeNumber(row.interest, currency)}
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-success">
                          {formatLargeNumber(row.totalValue, currency)}
                        </td>
                        <td className="px-4 py-2 text-right text-brand">
                          {index > 0 ? `+${growthRate.toFixed(2)}%` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 复利效应说明 */}
          <div className="bg-warning/10 p-4 rounded-lg border-l-4 border-warning/40">
            <h4 className="font-semibold text-warning mb-2">💡 复利的力量</h4>
            <p className="text-sm text-fg-muted mb-2">
              从表格中可以看到，随着时间的推移，复利收益增长越来越快，这就是"时间的力量"！
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-fg">关键观察：</p>
                <ul className="list-disc list-inside text-fg-muted space-y-1">
                  <li>前期增长缓慢，后期呈指数级增长</li>
                  <li>时间越长，复利效应越明显</li>
                  <li>坚持长期投资是关键</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-fg">投资启示：</p>
                <ul className="list-disc list-inside text-fg-muted space-y-1">
                  <li>越早开始投资越好</li>
                  <li>保持耐心，让时间成为朋友</li>
                  <li>稳定的回报率比高波动更重要</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompoundGrowthDialog;
