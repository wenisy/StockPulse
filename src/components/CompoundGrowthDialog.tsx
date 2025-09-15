"use client";
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';

interface CompoundGrowthData {
  year: number;
  totalValue: number;
  principal: number;
  interest: number;
  isAfterGoal?: boolean; // 标记是否为目标达成后的年份
  beforeGoalValue?: number; // 达成目标前的值
  afterGoalValue?: number; // 达成目标后的值
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

/**
 * 复利增长可视化对话框 - 轻量版
 * 只显示表格和简单可视化，避免引入重型图表库导致构建内存问题
 */
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
  // 生成复利增长数据
  const generateCompoundGrowthData = (): CompoundGrowthData[] => {
    const data: CompoundGrowthData[] = [];

    // 防止无效的年数值
    if (!yearsNeeded || yearsNeeded === Infinity || yearsNeeded <= 0 || yearsNeeded > 100) {
      return data;
    }

    // 计算达到目标的年数
    const goalYear = Math.ceil(yearsNeeded);
    // 在目标达成后再展示20年，激励继续存钱
    const totalYears = goalYear + 20;
    // 限制最大年数为70年
    const maxYears = Math.min(totalYears, 70);

    // 找到第一个达到目标的年份
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
      const hasReachedGoal = totalValue >= goalAmount;

      data.push({
        year,
        totalValue: Math.round(totalValue),
        principal: currentAmount,
        interest: Math.round(interest),
        isAfterGoal,
        // 分别设置达成目标前后的值，用于不同颜色的线条
        // 在目标达成的那一年，两条线都有值，确保连接
        beforeGoalValue: year <= goalReachedYear ? Math.round(totalValue) : null,
        afterGoalValue: year >= goalReachedYear ? Math.round(totalValue) : null
      });
    }

    return data;
  };

  const chartData = generateCompoundGrowthData();

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
          <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">起始金额</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatLargeNumber(currentAmount, currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">目标金额</p>
                <p className="text-lg font-bold text-green-600">
                  {formatLargeNumber(goalAmount, currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">年回报率</p>
                <p className="text-lg font-bold text-purple-600">{returnRate}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">所需年数</p>
                <p className="text-lg font-bold text-orange-600">{yearsNeeded.toFixed(1)} 年</p>
              </div>
            </div>
          </div>

          {/* 复利增长折线图 */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4 text-center">复利增长进度 - 感受时间的力量！</h3>
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="year"
                    tickFormatter={(value) => `第${value}年`}
                  />
                  <YAxis
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                      return value.toFixed(0);
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      formatLargeNumber(value, currency),
                      '总价值'
                    ]}
                    labelFormatter={(label) => `第${label}年`}
                  />
                  <Legend />

                  {/* 目标线 */}
                  <ReferenceLine
                    y={goalAmount}
                    stroke="#ff6b6b"
                    strokeDasharray="5 5"
                    label={{ value: `目标: ${formatLargeNumber(goalAmount, currency)}`, position: "topRight" }}
                  />

                  {/* 达成目标前的增长线 */}
                  <Line
                    type="monotone"
                    dataKey="beforeGoalValue"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    name="达成目标前"
                    connectNulls={false}
                  />

                  {/* 达成目标后的延伸线 */}
                  <Line
                    type="monotone"
                    dataKey="afterGoalValue"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    name="继续增长的力量"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 激励文字 */}
            <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
              <p className="text-sm text-center text-gray-700">
                <span className="text-blue-600 font-semibold">蓝色线</span>：达成目标的路径 |
                <span className="text-green-600 font-semibold ml-2">绿色线</span>：继续存钱的无限可能！
              </p>
              <p className="text-xs text-center text-gray-600 mt-1">
                坚持投资，让复利成为你最好的朋友 💪
              </p>
            </div>
          </div>

          {/* 表格部分 */}
          <div className="bg-white rounded-lg border">
            <h3 className="text-lg font-semibold p-4 border-b text-center">复利增长明细表</h3>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">年份</th>
                    <th className="px-4 py-2 text-right">本金</th>
                    <th className="px-4 py-2 text-right">复利收益</th>
                    <th className="px-4 py-2 text-right">总价值</th>
                    <th className="px-4 py-2 text-right">年增长率</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, index) => {
                    const prevValue = index > 0 ? chartData[index - 1].totalValue : currentAmount;
                    const growthRate = index > 0 ? ((row.totalValue - prevValue) / prevValue * 100) : 0;
                    const isGoalReached = row.totalValue >= goalAmount;

                    return (
                      <tr key={row.year} className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } ${isGoalReached ? 'bg-green-50' : ''}`}>
                        <td className="px-4 py-2 font-medium">
                          第 {row.year} 年
                          {isGoalReached && index === chartData.findIndex(d => d.totalValue >= goalAmount) && (
                            <span className="ml-2 text-green-600 text-xs">🎯 达标</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatLargeNumber(row.principal, currency)}
                        </td>
                        <td className="px-4 py-2 text-right text-orange-600">
                          {formatLargeNumber(row.interest, currency)}
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-green-600">
                          {formatLargeNumber(row.totalValue, currency)}
                        </td>
                        <td className="px-4 py-2 text-right text-blue-600">
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
          <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
            <h4 className="font-semibold text-yellow-800 mb-2">💡 复利的力量</h4>
            <p className="text-sm text-yellow-700 mb-2">
              从表格中可以看到，随着时间的推移，复利收益增长越来越快，这就是"时间的力量"！
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-yellow-800">关键观察：</p>
                <ul className="list-disc list-inside text-yellow-700 space-y-1">
                  <li>前期增长缓慢，后期呈指数级增长</li>
                  <li>时间越长，复利效应越明显</li>
                  <li>坚持长期投资是关键</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-yellow-800">投资启示：</p>
                <ul className="list-disc list-inside text-yellow-700 space-y-1">
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
