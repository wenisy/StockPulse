"use client";
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign, Calendar, RefreshCw, Play, Zap, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarData, CalendarStockData } from '@/types/stock';
import { cn } from '@/lib/utils';
import { useCalendarData } from '@/hooks/useCalendarData';

interface ProfitLossCalendarProps {
    selectedYear: string;
    formatLargeNumber: (value: number, currency: string) => string;
    currency: string;
}

const ProfitLossCalendar: React.FC<ProfitLossCalendarProps> = ({
    selectedYear,
    formatLargeNumber,
    currency
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(parseInt(selectedYear));

    // 使用自定义 hook
    const { calendarData, isLoading, error, fetchCalendarData, generateDailySnapshot, generateSmartSnapshot } = useCalendarData();

    // 手动操作状态
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSmartGenerating, setIsSmartGenerating] = useState(false);
    const [generateDate, setGenerateDate] = useState(new Date().toISOString().split('T')[0]);

    const months = [
        '一月', '二月', '三月', '四月', '五月', '六月',
        '七月', '八月', '九月', '十月', '十一月', '十二月'
    ];

    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

    // 当年份或月份变化时获取数据
    useEffect(() => {
        fetchCalendarData(currentYear, currentMonth);
    }, [currentYear, currentMonth, fetchCalendarData]);

    // 当选中年份变化时更新当前年份
    useEffect(() => {
        setCurrentYear(parseInt(selectedYear));
    }, [selectedYear]);

    // 手动生成快照
    const handleGenerateSnapshot = async () => {
        setIsGenerating(true);
        try {
            await generateDailySnapshot(generateDate);
            // 生成成功后刷新当前月份的数据
            await fetchCalendarData(currentYear, currentMonth);
            alert(`✅ ${generateDate} 的快照生成成功！`);
        } catch (error) {
            alert(`❌ 快照生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // 智能生成快照
    const handleSmartSnapshot = async (forceGenerate: boolean = false) => {
        setIsSmartGenerating(true);
        try {
            const result = await generateSmartSnapshot(generateDate, forceGenerate);

            if (result.success) {
                // 生成成功后刷新当前月份的数据
                await fetchCalendarData(currentYear, currentMonth);

                let message = `✅ ${generateDate} 的快照${result.isUpdate ? '更新' : '创建'}成功！`;
                if (result.changeAmount) {
                    message += `\n💰 盈亏变化: $${result.changeAmount.toFixed(2)}`;
                }
                if (result.updateCount > 1) {
                    message += `\n🔄 第${result.updateCount}次更新`;
                }
                alert(message);
            } else {
                let message = '';
                switch (result.reason) {
                    case 'non_trading_day':
                        message = `ℹ️ ${generateDate} 是非交易日，已跳过快照生成`;
                        break;
                    case 'no_significant_change':
                        message = `ℹ️ ${generateDate} 数据无显著变化，已跳过快照生成\n💡 如需强制生成，请使用"强制生成"按钮`;
                        break;
                    default:
                        message = `ℹ️ ${result.message}`;
                }
                alert(message);
            }
        } catch (error) {
            alert(`❌ 智能快照生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
            setIsSmartGenerating(false);
        }
    };

    // 刷新当前数据
    const handleRefreshData = async () => {
        await fetchCalendarData(currentYear, currentMonth);
    };

    // 获取月份的第一天是星期几
    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month - 1, 1).getDay();
    };

    // 获取月份的天数
    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month, 0).getDate();
    };

    // 根据日期获取日历数据
    const getDataForDate = (date: string): CalendarData | null => {
        return calendarData.find(data => data.date === date) || null;
    };

    // 获取盈亏颜色类名
    const getProfitLossColor = (gainPercent: number, hasData: boolean) => {
        if (!hasData) return 'bg-gray-100 text-gray-400';
        if (gainPercent > 0) return 'bg-green-100 text-green-800 border-green-200';
        if (gainPercent < 0) return 'bg-red-100 text-red-800 border-red-200';
        return 'bg-gray-100 text-gray-600 border-gray-200';
    };

    // 切换月份
    const changeMonth = (delta: number) => {
        let newMonth = currentMonth + delta;
        let newYear = currentYear;

        if (newMonth > 12) {
            newMonth = 1;
            newYear += 1;
        } else if (newMonth < 1) {
            newMonth = 12;
            newYear -= 1;
        }

        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
    };

    // 渲染日历格子
    const renderCalendarDay = (day: number) => {
        const dateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dayData = getDataForDate(dateStr);
        const hasData = dayData?.hasData || false;
        const hasTransaction = dayData?.hasTransaction || false;

        return (
            <TooltipProvider key={day}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            className={cn(
                                "relative h-16 p-2 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md",
                                getProfitLossColor(dayData?.totalGainPercent || 0, hasData)
                            )}
                        >
                            {/* 日期数字 */}
                            <div className="text-sm font-medium">{day}</div>
                            
                            {/* 盈亏百分比 */}
                            {hasData && dayData && (
                                <div className="text-xs font-bold mt-1">
                                    {dayData.totalGainPercent > 0 ? '+' : ''}
                                    {dayData.totalGainPercent.toFixed(2)}%
                                </div>
                            )}

                            {/* 交易标识 */}
                            {hasTransaction && (
                                <div className="absolute top-1 right-1">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                </div>
                            )}

                            {/* 盈亏趋势图标 */}
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
                                        <span>总盈亏: {formatLargeNumber(dayData.totalGain, currency)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        <span>盈亏率: {dayData.totalGainPercent.toFixed(2)}%</span>
                                    </div>
                                    {hasTransaction && (
                                        <div className="text-blue-600 text-sm">📈 当日有交易</div>
                                    )}
                                    {dayData.stocks && dayData.stocks.length > 0 && (
                                        <div className="border-t pt-2 mt-2">
                                            <div className="text-sm font-medium mb-1">股票详情:</div>
                                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                                {dayData.stocks.map((stock, index) => (
                                                    <div key={index} className="text-xs flex justify-between">
                                                        <span className="truncate mr-2">{stock.name}</span>
                                                        <span className={cn(
                                                            "font-medium",
                                                            stock.gainPercent > 0 ? "text-green-600" : 
                                                            stock.gainPercent < 0 ? "text-red-600" : "text-gray-600"
                                                        )}>
                                                            {stock.gainPercent > 0 ? '+' : ''}
                                                            {stock.gainPercent.toFixed(2)}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-gray-500">暂无数据</div>
                            )}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    };

    // 渲染日历
    const renderCalendar = () => {
        const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const days = [];

        // 添加空白格子（月份开始前的空白）
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-16"></div>);
        }

        // 添加月份的每一天
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(renderCalendarDay(day));
        }

        return days;
    };

    return (
        <div className="space-y-4">
            {/* 日历头部 */}
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

                {/* 年份选择器 */}
                <Select 
                    value={currentYear.toString()} 
                    onValueChange={(value) => setCurrentYear(parseInt(value))}
                >
                    <SelectTrigger className="w-24">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => {
                            const year = new Date().getFullYear() - 5 + i;
                            return (
                                <SelectItem key={year} value={year.toString()}>
                                    {year}
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>

            {/* 月份导航 */}
            <div className="flex items-center justify-between">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changeMonth(-1)}
                    disabled={isLoading}
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>

                <h4 className="text-xl font-semibold">
                    {currentYear}年 {months[currentMonth - 1]}
                </h4>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changeMonth(1)}
                    disabled={isLoading}
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>

            {/* 手动操作区域 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-3">🧪 测试功能</h4>
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-blue-700 min-w-[60px]">生成日期:</label>
                        <input
                            type="date"
                            value={generateDate}
                            onChange={(e) => setGenerateDate(e.target.value)}
                            className="px-2 py-1 border border-blue-300 rounded text-sm"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            onClick={() => handleSmartSnapshot(false)}
                            disabled={isSmartGenerating || isLoading}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isSmartGenerating ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    智能生成中...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4 mr-2" />
                                    智能生成
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={() => handleSmartSnapshot(true)}
                            disabled={isSmartGenerating || isLoading}
                            size="sm"
                            variant="outline"
                            className="border-orange-300 text-orange-700 hover:bg-orange-50"
                        >
                            {isSmartGenerating ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    强制生成中...
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    强制生成
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={handleGenerateSnapshot}
                            disabled={isGenerating || isLoading}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isGenerating ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    简单生成中...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    简单生成
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={handleRefreshData}
                            disabled={isLoading}
                            size="sm"
                            variant="outline"
                        >
                            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                            刷新数据
                        </Button>
                    </div>
                </div>

                <div className="text-xs text-blue-600 mt-3 space-y-1">
                    <p>💡 <strong>智能生成</strong>: 自动检查交易日和数据变化，跳过无意义的快照</p>
                    <p>⚠️ <strong>强制生成</strong>: 忽略交易日和数据变化检查，强制生成快照</p>
                    <p>🔧 <strong>简单生成</strong>: 基础快照生成，不做智能判断</p>
                </div>
            </div>

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

            {/* 日历网格 */}
            {!isLoading && (
                <div className="bg-white rounded-lg border p-4">
                    {/* 星期标题 */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {weekdays.map((day) => (
                            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* 日历格子 */}
                    <div className="grid grid-cols-7 gap-2">
                        {renderCalendar()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfitLossCalendar;
