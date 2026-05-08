"use client";
import React, { useEffect } from 'react';
import { Calendar, RefreshCw, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useCalendarView } from './calendar/hooks/useCalendarView';
import { useSnapshotGeneration } from './calendar/hooks/useSnapshotGeneration';
import { changeMonth as changeMonthUtil } from './calendar/calendarUtils';
import { MonthlyCalendarView } from './calendar/MonthlyCalendarView';
import { YearlySummaryView } from './calendar/YearlySummaryView';

interface ProfitLossCalendarProps {
  selectedYear: string;
  formatLargeNumber: (value: number, currency: string) => string;
  currency: string;
  years?: string[];
}

const ProfitLossCalendar: React.FC<ProfitLossCalendarProps> = ({
  selectedYear,
  formatLargeNumber,
  currency,
  years: parentYears,
}) => {
  // 数据层（IO + 业务数据）
  const {
    calendarData,
    monthlySummary,
    yearlySummary,
    isLoading,
    error,
    fetchCalendarData,
    fetchYearlySummary,
    generateDailySnapshot,
  } = useCalendarData();

  const toast = useToast();

  // 视图层状态
  const {
    usEasternTime,
    currentMonth,
    setCurrentMonth,
    currentYear,
    setCurrentYear,
    viewMode,
    setViewMode,
    generateDate,
    setGenerateDate,
    availableYears,
  } = useCalendarView({ selectedYear, parentYears });

  // 快照生成流程
  const {
    isGenerating,
    isMonthlyGenerating,
    handleGenerateSnapshot,
    handleMonthlyGenerate,
    handleRefreshData,
  } = useSnapshotGeneration({
    generateDailySnapshot,
    fetchCalendarData,
    toast,
    currentYear,
    currentMonth,
  });

  // 当年份或月份变化时加载日历数据
  useEffect(() => {
    fetchCalendarData(currentYear, currentMonth);
  }, [currentYear, currentMonth, fetchCalendarData]);

  // 切到年度视图时加载年度汇总
  useEffect(() => {
    if (viewMode === 'yearly') fetchYearlySummary(currentYear);
  }, [viewMode, currentYear, fetchYearlySummary]);

  // 切换月份（含跨年）
  const onChangeMonth = (delta: number) => {
    const { month, year } = changeMonthUtil(currentMonth, currentYear, delta);
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            每日盈亏日历
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
              <span>盈利</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
              <span>亏损</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>有交易</span>
            </div>
          </div>
        </div>
        <Select
          value={currentYear.toString()}
          onValueChange={(value) => setCurrentYear(parseInt(value))}
        >
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {availableYears.length > 0 ? (
              availableYears.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))
            ) : (
              <SelectItem value={new Date().getFullYear().toString()}>
                {new Date().getFullYear()}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-2">
          <Button
            variant={viewMode === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('monthly')}
          >
            按日
          </Button>
          <Button
            variant={viewMode === 'yearly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('yearly')}
          >
            年度（月度汇总）
          </Button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500">
            可用年份: {availableYears.join(', ') || '加载中...'}
          </div>
        )}
      </div>

      {/* 美东时间 */}
      <div className="text-center py-2 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-sm text-blue-700">
          🌍 当前美东时间: {usEasternTime ? usEasternTime.dateTime : '获取中...'}
        </div>
        <div className="text-xs text-blue-600 mt-1">
          📊 所有股票数据基于美东时间，避免时区混乱
          {usEasternTime && ` (独立于客户端时区计算)`}
        </div>
      </div>

      {/* 月视图 */}
      {viewMode === 'monthly' && (
        <>
          <MonthlyCalendarView
            calendarData={calendarData}
            monthlySummary={monthlySummary}
            currentYear={currentYear}
            currentMonth={currentMonth}
            isLoading={isLoading}
            currency={currency}
            formatLargeNumber={formatLargeNumber}
            onChangeMonth={onChangeMonth}
            onMonthSelect={(m) => {
              setCurrentMonth(m);
              fetchCalendarData(currentYear, m);
            }}
            onDateClick={setGenerateDate}
          />

          {/* 手动操作区域 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-blue-700 min-w-[60px]">生成日期:</label>
                <div className="flex flex-col gap-1">
                  <input
                    type="date"
                    value={generateDate}
                    onChange={(e) => setGenerateDate(e.target.value)}
                    className="px-2 py-1 border border-blue-300 rounded text-sm"
                  />
                  <span className="text-xs text-blue-600">📍 基于美东时间 (避免时区混乱)</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={handleMonthlyGenerate}
                  disabled={isMonthlyGenerating || isLoading}
                  size="sm"
                  variant="outline"
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  {isMonthlyGenerating ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />月度生成中...</>
                  ) : (
                    <><Calendar className="w-4 h-4 mr-2" />月度智能生成</>
                  )}
                </Button>
                <Button
                  onClick={() => handleGenerateSnapshot(generateDate)}
                  disabled={isGenerating || isLoading}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isGenerating ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />简单生成中...</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" />简单生成</>
                  )}
                </Button>
                <Button
                  onClick={handleRefreshData}
                  disabled={isLoading}
                  size="sm"
                  variant="outline"
                >
                  <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
                  刷新数据
                </Button>
              </div>
            </div>
            <div className="text-xs text-blue-600 mt-3 space-y-1">
              <p>🔧 <strong>简单生成</strong>: 基于实际持仓和历史价格生成快照</p>
              <p>📅 <strong>点击日历日期</strong>: 自动更新生成日期字段</p>
            </div>
          </div>
        </>
      )}

      {/* 年视图 */}
      {viewMode === 'yearly' && !isLoading && (
        <YearlySummaryView
          yearlySummary={yearlySummary}
          currentYear={currentYear}
          currency={currency}
          formatLargeNumber={formatLargeNumber}
          onMonthClick={(m) => {
            setCurrentMonth(m);
            setViewMode('monthly');
          }}
        />
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};

export default ProfitLossCalendar;
