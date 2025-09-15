"use client";
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CompoundGrowthData {
  year: number;
  totalValue: number;
  principal: number;
  interest: number;
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

    const years = Math.min(Math.ceil(yearsNeeded), 50); // 限制最大50年

    for (let year = 0; year <= years; year++) {
      const totalValue = currentAmount * Math.pow(1 + returnRate / 100, year);
      const interest = totalValue - currentAmount;

      data.push({
        year,
        totalValue: Math.round(totalValue),
        principal: currentAmount,
        interest: Math.round(interest)
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

          {/* 简化的可视化 - 使用CSS进度条 */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4 text-center">复利增长进度</h3>
            <div className="space-y-3">
              {chartData.slice(0, Math.min(10, chartData.length)).map((item, index) => {
                const progress = (item.totalValue / goalAmount) * 100;
                const isGoalReached = item.totalValue >= goalAmount;

                return (
                  <div key={item.year} className="flex items-center space-x-3">
                    <div className="w-16 text-sm font-medium">第{item.year}年</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                      <div
                        className={`h-6 rounded-full transition-all duration-300 ${
                          isGoalReached ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                        {formatLargeNumber(item.totalValue, currency)}
                      </div>
                    </div>
                    <div className="w-20 text-sm text-right">
                      {progress.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
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
