"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, EyeOff, RefreshCw, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { useCalendarData } from '@/hooks/useCalendarData';
import type { MonthlySummary } from '@/hooks/useCalendarData';
import { CalendarData } from '@/types/stock';
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
  // External data props — when provided, component uses them instead of internal hook
  externalCalendarData?: CalendarData[];
  externalMonthlySummary?: MonthlySummary | null;
  externalIsLoading?: boolean;
  externalError?: string | null;
  onExternalFetchCalendarData?: (year: number, month: number) => Promise<void>;
}

const ProfitLossCalendar: React.FC<ProfitLossCalendarProps> = ({
  selectedYear,
  formatLargeNumber,
  currency,
  years: parentYears,
  externalCalendarData,
  externalMonthlySummary,
  externalIsLoading,
  externalError,
  onExternalFetchCalendarData,
}) => {
  // 数据层（IO + 业务数据）— always called (hooks rules), used only in non-external mode
  const {
    calendarData: internalCalendarData,
    monthlySummary: internalMonthlySummary,
    yearlySummary,
    isLoading: internalIsLoading,
    error: internalError,
    fetchCalendarData: internalFetchCalendarData,
    fetchYearlySummary,
    generateDailySnapshot,
  } = useCalendarData();

  // Resolve effective values: external props take priority when provided
  const isExternalMode = externalCalendarData !== undefined;
  const calendarData = isExternalMode ? externalCalendarData : internalCalendarData;
  const monthlySummary = isExternalMode
    ? (externalMonthlySummary ?? null)
    : internalMonthlySummary;
  const isLoading = isExternalMode ? (externalIsLoading ?? false) : internalIsLoading;
  const error = isExternalMode ? (externalError ?? null) : internalError;
  const fetchCalendarData =
    isExternalMode && onExternalFetchCalendarData
      ? onExternalFetchCalendarData
      : internalFetchCalendarData;

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

  // 隐藏金额（月视图 + 年视图共享）
  const [hideAmount, setHideAmount] = useState(false);

  // 年度汇总独立 loading 状态（外部模式下 isLoading 绑定 externalIsLoading，
  // 无法反映 fetchYearlySummary 的内部加载状态，需单独跟踪）
  const [isYearlySummaryLoading, setIsYearlySummaryLoading] = useState(false);

  const fetchYearlySummaryWithLoading = useCallback(
    async (year: number) => {
      setIsYearlySummaryLoading(true);
      try {
        await fetchYearlySummary(year);
      } finally {
        setIsYearlySummaryLoading(false);
      }
    },
    [fetchYearlySummary],
  );

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
    if (viewMode === 'yearly') fetchYearlySummaryWithLoading(currentYear);
  }, [viewMode, currentYear, fetchYearlySummaryWithLoading]);

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
          <div className="flex items-center gap-2 text-sm text-fg-muted">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-success/20 border border-success/30 rounded"></div>
              <span>盈利</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-danger/20 border border-danger/30 rounded"></div>
              <span>亏损</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-brand rounded-full"></div>
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
          {/* 隐藏金额按钮 —— 月视图和年视图共享 */}
          <button
            type="button"
            onClick={() => setHideAmount((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors duration-[var(--motion-fast)]',
              hideAmount
                ? 'bg-brand/10 text-brand font-medium'
                : 'text-fg-muted hover:bg-bg-subtle hover:text-fg',
            )}
          >
            <EyeOff className="h-3.5 w-3.5" aria-hidden />
            {hideAmount ? '已隐藏金额' : '隐藏金额'}
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-fg-muted">
            可用年份: {availableYears.join(', ') || '加载中...'}
          </div>
        )}
      </div>

      {/* 美东时间 */}
      <div className="text-center py-2 bg-info/10 rounded-lg border border-info/30">
        <div className="text-sm text-info">
          🌍 当前美东时间: {usEasternTime ? usEasternTime.dateTime : '获取中...'}
        </div>
        <div className="text-xs text-info/80 mt-1">
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
            hideAmount={hideAmount}
            onChangeMonth={onChangeMonth}
            onMonthSelect={(m) => {
              setCurrentMonth(m);
              fetchCalendarData(currentYear, m);
            }}
            onDateClick={setGenerateDate}
          />

          {/* 手动操作区域 */}
          <div className="bg-info/10 border border-info/30 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-info min-w-[60px]">生成日期:</label>
                <div className="flex flex-col gap-1">
                  <input
                    type="date"
                    value={generateDate}
                    onChange={(e) => setGenerateDate(e.target.value)}
                    className="px-2 py-1 border border-border-default bg-bg-elevated text-fg rounded text-sm"
                  />
                  <span className="text-xs text-info/80">📍 基于美东时间 (避免时区混乱)</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={handleMonthlyGenerate}
                  disabled={isMonthlyGenerating || isLoading}
                  size="sm"
                  variant="outline"
                  className="border-brand/30 text-brand hover:bg-brand/10"
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
                  className="bg-brand hover:bg-brand/90"
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
            <div className="text-xs text-info/80 mt-3 space-y-1">
              <p>🔧 <strong>简单生成</strong>: 基于实际持仓和历史价格生成快照</p>
              <p>📅 <strong>点击日历日期</strong>: 自动更新生成日期字段</p>
            </div>
          </div>
        </>
      )}

      {/* 年视图 */}
      {viewMode === 'yearly' && !isYearlySummaryLoading && (
        <YearlySummaryView
          yearlySummary={yearlySummary}
          currentYear={currentYear}
          currency={currency}
          formatLargeNumber={formatLargeNumber}
          hideAmount={hideAmount}
          onMonthClick={(m) => {
            setCurrentMonth(m);
            setViewMode('monthly');
          }}
        />
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 text-danger">
          {error}
        </div>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        </div>
      )}
    </div>
  );
};

export default ProfitLossCalendar;
