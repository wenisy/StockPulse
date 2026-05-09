import React from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { CalendarData } from '@/types/stock';
import { cn } from '@/lib/utils';
import {
  MONTHS,
  WEEKDAYS,
  getFirstDayOfMonth,
  getDaysInMonth,
  getDataForDate,
  getProfitLossColor,
} from './calendarUtils';

interface MonthlySummary {
  totalGain: number;
  totalGainPercent: number;
  tradingDaysCount: number;
  profitDays: number;
  lossDays: number;
  winRate: number;
}

interface Props {
  calendarData: CalendarData[];
  monthlySummary: MonthlySummary | null;
  currentYear: number;
  currentMonth: number;
  isLoading: boolean;
  currency: string;
  formatLargeNumber: (value: number, currency: string) => string;
  onChangeMonth: (delta: number) => void;
  onMonthSelect: (month: number) => void;
  onDateClick: (date: string) => void;
}

const CalendarDay: React.FC<{
  day: number;
  currentYear: number;
  currentMonth: number;
  calendarData: CalendarData[];
  currency: string;
  formatLargeNumber: (value: number, currency: string) => string;
  onClick: (date: string) => void;
}> = ({ day, currentYear, currentMonth, calendarData, currency, formatLargeNumber, onClick }) => {
  const dateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  const dayData = getDataForDate(calendarData, dateStr);
  const hasData = dayData?.hasData || false;
  const hasTransaction = dayData?.hasTransaction || false;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'relative h-20 p-2 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md',
              getProfitLossColor(dayData?.totalGainPercent || 0, hasData),
            )}
            onClick={() => onClick(dateStr)}
          >
            <div className="text-sm font-medium">{day}</div>
            {hasData && dayData && (
              <div className="text-xs font-bold mt-1">
                {dayData.totalGainPercent > 0 ? '+' : ''}
                {dayData.totalGainPercent.toFixed(2)}%
              </div>
            )}
            {hasTransaction && (
              <div className="absolute top-1 right-1">
                <div className="w-2 h-2 bg-brand rounded-full"></div>
              </div>
            )}
            {hasData && dayData && (
              <div className="absolute bottom-1 right-1">
                {dayData.totalGain > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : dayData.totalGain < 0 ? (
                  <TrendingDown className="w-3 h-3" />
                ) : null}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-semibold">{dateStr}</div>
            {hasData && dayData ? (
              <>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>当日盈亏: {formatLargeNumber(dayData.totalGain, currency)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>当日收益率: {dayData.totalGainPercent.toFixed(2)}%</span>
                </div>
                {hasTransaction && (
                  <div className="text-brand text-sm">📈 当日有交易</div>
                )}
                {dayData.stocks && dayData.stocks.length > 0 && (
                  <div className="border-t pt-2 mt-2">
                    <div className="text-sm font-medium mb-1">股票详情:</div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {dayData.stocks.map((stock, index) => (
                        <div key={index} className="text-xs">
                          <div className="flex justify-between items-start">
                            <span className="truncate mr-2 flex-1">{stock.name}</span>
                            <div className="text-right">
                              <div className={cn(
                                'font-medium',
                                stock.gainPercent > 0 ? 'text-success' :
                                stock.gainPercent < 0 ? 'text-danger' : 'text-fg-muted',
                              )}>
                                {stock.gainPercent > 0 ? '+' : ''}
                                {stock.gainPercent.toFixed(2)}%
                              </div>
                              <div className={cn(
                                'text-xs',
                                stock.gain > 0 ? 'text-success' :
                                stock.gain < 0 ? 'text-danger' : 'text-fg-muted',
                              )}>
                                {stock.gain > 0 ? '+' : ''}
                                {formatLargeNumber(stock.gain, currency)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-fg-muted">暂无数据</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const MonthlyCalendarView: React.FC<Props> = ({
  calendarData,
  monthlySummary,
  currentYear,
  currentMonth,
  isLoading,
  currency,
  formatLargeNumber,
  onChangeMonth,
  onMonthSelect,
  onDateClick,
}) => {
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);

  return (
    <>
      {/* 月份导航 */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => onChangeMonth(-1)} disabled={isLoading}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h4 className="text-xl font-semibold">{currentYear}年</h4>
            <Select value={currentMonth.toString()} onValueChange={(v) => onMonthSelect(parseInt(v))}>
              <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, index) => (
                  <SelectItem key={index + 1} value={(index + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {monthlySummary && (
            <div className="text-sm mt-1 space-y-1">
              <div className={`font-medium ${monthlySummary.totalGain >= 0 ? 'text-success' : 'text-danger'}`}>
                月度收益: {formatLargeNumber(monthlySummary.totalGain, currency)}
                ({monthlySummary.totalGain >= 0 ? '+' : ''}{monthlySummary.totalGainPercent.toFixed(2)}%)
              </div>
              <div className="text-fg-muted text-xs">
                交易日: {monthlySummary.tradingDaysCount}天 |
                盈利: {monthlySummary.profitDays}天 |
                亏损: {monthlySummary.lossDays}天 |
                胜率: {monthlySummary.winRate.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => onChangeMonth(1)} disabled={isLoading}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* 日历网格 */}
      {!isLoading && (
        <div className="bg-bg-elevated rounded-lg border p-4">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-fg-muted py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20"></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => (
              <CalendarDay
                key={i + 1}
                day={i + 1}
                currentYear={currentYear}
                currentMonth={currentMonth}
                calendarData={calendarData}
                currency={currency}
                formatLargeNumber={formatLargeNumber}
                onClick={onDateClick}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};
