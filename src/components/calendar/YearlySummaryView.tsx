import React from 'react';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MONTHS } from './calendarUtils';

interface MonthSummary {
  month: string;
  totalGain: number;
  totalGainPercent: number;
  tradingDaysCount: number;
  profitDays: number;
  lossDays: number;
  winRate: number;
}

interface Props {
  yearlySummary: MonthSummary[] | null;
  currentYear: number;
  currency: string;
  formatLargeNumber: (value: number, currency: string) => string;
  onMonthClick: (month: number) => void;
}

export const YearlySummaryView: React.FC<Props> = ({
  yearlySummary,
  currentYear,
  currency,
  formatLargeNumber,
  onMonthClick,
}) => {
  const monthsData = yearlySummary ?? Array.from({ length: 12 }, (_, i) => ({
    month: (i + 1).toString().padStart(2, '0'),
    totalGain: 0,
    totalGainPercent: 0,
    tradingDaysCount: 0,
    profitDays: 0,
    lossDays: 0,
    winRate: 0,
  }));

  const yearlyTotal = monthsData.reduce(
    (acc, m) => ({
      totalGain: acc.totalGain + (m.totalGain || 0),
      tradingDaysCount: acc.tradingDaysCount + (m.tradingDaysCount || 0),
      profitDays: acc.profitDays + (m.profitDays || 0),
      lossDays: acc.lossDays + (m.lossDays || 0),
    }),
    { totalGain: 0, tradingDaysCount: 0, profitDays: 0, lossDays: 0 },
  );

  const yearlyWinRate = yearlyTotal.tradingDaysCount > 0
    ? (yearlyTotal.profitDays / yearlyTotal.tradingDaysCount) * 100
    : 0;

  const monthLabel = (m: string) => MONTHS[parseInt(m) - 1];

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="space-y-4">
        {/* 年度总计 */}
        <div className={cn(
          'p-4 rounded-lg border-2',
          yearlyTotal.totalGain >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300',
        )}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {currentYear}年 年度总计
            </h4>
            {yearlyTotal.totalGain >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className={cn(
                'text-2xl font-bold',
                yearlyTotal.totalGain >= 0 ? 'text-green-700' : 'text-red-700',
              )}>
                {yearlyTotal.totalGain >= 0 ? '+' : ''}
                {formatLargeNumber(yearlyTotal.totalGain, currency)}
              </div>
              <div className="text-sm text-gray-600 mt-1">年度盈亏总额</div>
              <div className="text-xs text-gray-500 mt-2">* 收益率需结合总资产计算</div>
            </div>
            <div className="text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">总交易天数:</span>
                <span className="font-medium">{yearlyTotal.tradingDaysCount} 天</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">盈利天数:</span>
                <span className="font-medium text-green-600">{yearlyTotal.profitDays} 天</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">亏损天数:</span>
                <span className="font-medium text-red-600">{yearlyTotal.lossDays} 天</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">年度胜率:</span>
                <span className={cn(
                  'font-bold',
                  yearlyWinRate >= 50 ? 'text-green-600' : 'text-red-600',
                )}>
                  {yearlyWinRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 月度网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {monthsData.map((m) => {
            const positive = (m.totalGain || 0) > 0;
            const negative = (m.totalGain || 0) < 0;
            return (
              <div
                key={m.month}
                className={cn(
                  'p-3 rounded-lg border cursor-pointer transition-all',
                  positive ? 'bg-green-50 border-green-200 hover:bg-green-100'
                    : negative ? 'bg-red-50 border-red-200 hover:bg-red-100'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100',
                )}
                onClick={() => onMonthClick(parseInt(m.month))}
                title="点击切换到该月的每日视图"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold">{currentYear}年{monthLabel(m.month)}</div>
                  {positive ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : negative ? (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  ) : (
                    <Calendar className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                <div className={cn(
                  'text-base font-bold',
                  positive ? 'text-green-700' : negative ? 'text-red-700' : 'text-gray-700',
                )}>
                  {m.totalGain > 0 ? '+' : ''}{formatLargeNumber(m.totalGain, currency)}
                  <span className="ml-1 text-sm">({m.totalGainPercent.toFixed(2)}%)</span>
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  交易日 {m.tradingDaysCount} 天 · 胜率 {m.winRate.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
