"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign, Calendar, RefreshCw, Play, Zap, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/toast';
import { CalendarData } from '@/types/stock';
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
    // 美东时间状态
    const [usEasternTime, setUsEasternTime] = useState<{
        date: string;
        dateTime: string;
        weekday: string;
    } | null>(null);

    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(parseInt(selectedYear));

    // 使用自定义 hook
    const { calendarData, monthlySummary, yearlySummary, isLoading, error, fetchCalendarData, fetchYearlySummary, generateDailySnapshot } = useCalendarData();
    const { addToast } = useToast();

    // 手动操作状态
    const [isGenerating, setIsGenerating] = useState(false);
    const [isMonthlyGenerating, setIsMonthlyGenerating] = useState(false);
    // 使用美东时间作为默认日期
    // 视图模式：按日(日历) / 按年（月度汇总）
    const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');

    const getUSEasternDate = () => {
        const now = new Date();
        const usEastern = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
        return usEastern.toISOString().split('T')[0];
    };

    const [generateDate, setGenerateDate] = useState(getUSEasternDate());

    // 获取可靠的美东时间
    const fetchUSEasternTime = async () => {
        try {
            const backendDomain = "https://stock-backend-tau.vercel.app";
            const response = await fetch(`${backendDomain}/api/getUSEasternTime`);
            if (response.ok) {
                const data = await response.json();
                setUsEasternTime({
                    date: data.usEastern.date,
                    dateTime: data.usEastern.dateTime,
                    weekday: data.usEastern.weekday
                });

                // 更新当前月份为美东时间的月份
                const easternDate = new Date(data.usEastern.date);
                setCurrentMonth(easternDate.getMonth() + 1);
                setCurrentYear(easternDate.getFullYear());

                // 更新默认生成日期
                setGenerateDate(data.usEastern.date);
            }
        } catch (error) {
            console.error('获取美东时间失败:', error);
        }
    };

    // 组件加载时获取美东时间（去除定时轮询，仅初始化一次）
    useEffect(() => {
        fetchUSEasternTime();
    }, []);

    const [availableYears, setAvailableYears] = useState<string[]>([]);

    const months = [
        '一月', '二月', '三月', '四月', '五月', '六月',
        '七月', '八月', '九月', '十月', '十一月', '十二月'
    ];

    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

    // 获取可用年份 - 改为从用户的交易数据中获取
    const fetchAvailableYears = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setAvailableYears([new Date().getFullYear().toString()]);
                return;
            }

            // 从后端获取用户的所有数据来确定有数据的年份
            const backendDomain = "//stock-backend-tau.vercel.app";
            const response = await fetch(`${backendDomain}/api/data`, {
                headers: {
                    'Authorization': token,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const years = new Set<string>();

                // 从股票数据中提取年份
                Object.keys(data.stocks || {}).forEach(year => {
                    if (data.stocks[year] && data.stocks[year].length > 0) {
                        years.add(year);
                    }
                });

                // 从交易数据中提取年份
                Object.keys(data.stockTransactions || {}).forEach(year => {
                    if (data.stockTransactions[year] && data.stockTransactions[year].length > 0) {
                        years.add(year);
                    }
                });

                // 从现金交易中提取年份
                Object.keys(data.cashTransactions || {}).forEach(year => {
                    if (data.cashTransactions[year] && data.cashTransactions[year].length > 0) {
                        years.add(year);
                    }
                });

                const sortedYears = Array.from(years).sort();
                console.log('找到的可用年份:', sortedYears);
                if (sortedYears.length > 0) {
                    setAvailableYears(sortedYears);
                } else {
                    setAvailableYears([new Date().getFullYear().toString()]);
                }
            } else {
                setAvailableYears([new Date().getFullYear().toString()]);
            }
        } catch (error) {
            console.error('获取可用年份失败:', error);
            setAvailableYears([new Date().getFullYear().toString()]);
        }
    }, []); // 移除依赖，避免无限循环

    // 初始化时获取可用年份
    useEffect(() => {
        fetchAvailableYears();
    }, []); // 只在组件挂载时执行一次

    // 当年份或月份变化时获取数据
    useEffect(() => {
        fetchCalendarData(currentYear, currentMonth);
    }, [currentYear, currentMonth, fetchCalendarData]); // 现在 fetchCalendarData 是稳定的

    // 当选中年份变化时更新当前年份
    useEffect(() => {
        setCurrentYear(parseInt(selectedYear));
    }, [selectedYear]);

    // 年度汇总数据加载：当切到年度视图或年份变化时加载
    useEffect(() => {
        if (viewMode === 'yearly') {
            fetchYearlySummary(currentYear);
        }
    }, [viewMode, currentYear, fetchYearlySummary]);

    // 手动生成快照
    const handleGenerateSnapshot = async () => {
        setIsGenerating(true);
        try {
            await generateDailySnapshot(generateDate);
            // 生成成功后刷新当前月份的数据
            await fetchCalendarData(currentYear, currentMonth);
            addToast({
                title: "快照生成成功",
                description: `${generateDate} 的快照已生成`,
                variant: "success",
                duration: 3000,
            });
        } catch (error) {
            addToast({
                title: "快照生成失败",
                description: error instanceof Error ? error.message : '未知错误',
                variant: "error",
                duration: 5000,
            });
        } finally {
            setIsGenerating(false);
        }
    };



    // 为整个月份生成快照（从1号开始重新生成，基于美东时间）
    const handleMonthlyGenerate = async () => {
        const usEasternDate = getUSEasternDate();
        const currentMonthStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

        // 如果不是当前月份，生成整个月；如果是当前月份，只生成到美东时间的今天
        const isCurrentMonth = usEasternDate.startsWith(currentMonthStr);
        const endDay = isCurrentMonth ?
            new Date(usEasternDate).getDate() :
            getDaysInMonth(currentYear, currentMonth);

        const confirmMessage = `确定要为 ${currentYear}年${currentMonth}月 ${isCurrentMonth ? `(1日-${endDay}日，基于美东时间)` : '的所有日期'} 重新生成快照吗？\n\n` +
            `⚠️ 注意：\n` +
            `- 这将覆盖已存在的快照数据\n` +
            `- 使用美东时间避免时区混乱\n` +
            `- 可能需要几分钟时间\n` +
            `- 建议在美股收盘后执行`;

        if (!confirm(confirmMessage)) {
            return;
        }

        setIsMonthlyGenerating(true);

        try {
            const results = [];

            // 从1号开始生成到指定结束日期
            for (let day = 1; day <= endDay; day++) {
                const date = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

                // 确保不生成未来日期的快照（基于美东时间）
                if (new Date(date) <= new Date(usEasternDate)) {
                    try {
                        await generateDailySnapshot(date);
                        results.push({
                            date,
                            success: true,
                            message: '生成成功'
                        });

                        // 添加延迟避免API限制
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } catch (error) {
                        results.push({
                            date,
                            success: false,
                            message: error instanceof Error ? error.message : 'API错误'
                        });
                    }
                }
            }

            // 5. 生成完成后刷新数据
            await fetchCalendarData(currentYear, currentMonth);

            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            addToast({
                title: "月度生成完成！",
                description: `成功生成: ${successful}个，失败: ${failed}个`,
                variant: "success",
                duration: 5000,
            });

        } catch (error) {
            addToast({
                title: "月度生成失败",
                description: error instanceof Error ? error.message : '未知错误',
                variant: "error",
                duration: 5000,
            });
        } finally {
            setIsMonthlyGenerating(false);
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

    // 处理日历日期点击
    const handleDateClick = (dateStr: string) => {
        setGenerateDate(dateStr);
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
                                "relative h-20 p-2 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md",
                                getProfitLossColor(dayData?.totalGainPercent || 0, hasData)
                            )}
                            onClick={() => handleDateClick(dateStr)}
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
                                        <span>当日盈亏: {formatLargeNumber(dayData.totalGain, currency)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        <span>当日收益率: {dayData.totalGainPercent.toFixed(2)}%</span>
                                    </div>

                                    {hasTransaction && (
                                        <div className="text-blue-600 text-sm">📈 当日有交易</div>
                                    )}
                                    {dayData.stocks && dayData.stocks.length > 0 && (
                                        <div className="border-t pt-2 mt-2">
                                            <div className="text-sm font-medium mb-1">股票详情:</div>
                                            <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
                                                {dayData.stocks.map((stock, index) => (
                                                    <div key={index} className="text-xs">
                                                        <div className="flex justify-between items-start">
                                                            <span className="truncate mr-2 flex-1">{stock.name}</span>
                                                            <div className="text-right">
                                                                <div className={cn(
                                                                    "font-medium",
                                                                    stock.gainPercent > 0 ? "text-green-600" :
                                                                    stock.gainPercent < 0 ? "text-red-600" : "text-gray-600"
                                                                )}>
                                                                    {stock.gainPercent > 0 ? '+' : ''}
                                                                    {stock.gainPercent.toFixed(2)}%
                                                                </div>
                                                                <div className={cn(
                                                                    "text-xs",
                                                                    stock.gain > 0 ? "text-green-500" :
                                                                    stock.gain < 0 ? "text-red-500" : "text-gray-500"
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

    // 0000000 00

            days.push(<div key={`empty-${i}`} className="h-20"></div>);
        }

        // 添加月份的每一天
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(renderCalendarDay(day));
        }

        return days;
    };


    // 年度（月度汇总）网格
    const renderYearlyGrid = () => {
        const monthsData = yearlySummary || Array.from({ length: 12 }, (_, i) => ({
            month: (i + 1).toString().padStart(2, '0'),
            totalGain: 0,
            totalGainPercent: 0,
            tradingDaysCount: 0,
            profitDays: 0,
            lossDays: 0,
            winRate: 0,
        }));

        const monthLabel = (m: string) => months[parseInt(m) - 1];

        // 计算年度总计
        const yearlyTotal = monthsData.reduce((acc, month) => {
            return {
                totalGain: acc.totalGain + (month.totalGain || 0),
                tradingDaysCount: acc.tradingDaysCount + (month.tradingDaysCount || 0),
                profitDays: acc.profitDays + (month.profitDays || 0),
                lossDays: acc.lossDays + (month.lossDays || 0),
            };
        }, {
            totalGain: 0,
            tradingDaysCount: 0,
            profitDays: 0,
            lossDays: 0,
        });

        // 计算年度胜率
        const yearlyWinRate = yearlyTotal.tradingDaysCount > 0
            ? (yearlyTotal.profitDays / yearlyTotal.tradingDaysCount) * 100
            : 0;

        return (
            <div className="space-y-4">
                {/* 年度总计统计区域 */}
                <div className={cn(
                    "p-4 rounded-lg border-2",
                    yearlyTotal.totalGain >= 0
                        ? "bg-green-50 border-green-300"
                        : "bg-red-50 border-red-300"
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
                        {/* 年度收益 */}
                        <div>
                            <div className={cn(
                                "text-2xl font-bold",
                                yearlyTotal.totalGain >= 0 ? "text-green-700" : "text-red-700"
                            )}>
                                {yearlyTotal.totalGain >= 0 ? '+' : ''}
                                {formatLargeNumber(yearlyTotal.totalGain, currency)}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                                年度盈亏总额
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                                * 收益率需结合总资产计算
                            </div>
                        </div>
                        
                        {/* 年度交易统计 */}
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
                                    "font-bold",
                                    yearlyWinRate >= 50 ? "text-green-600" : "text-red-600"
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
                                "p-3 rounded-lg border cursor-pointer transition-all",
                                positive ? "bg-green-50 border-green-200 hover:bg-green-100" : negative ? "bg-red-50 border-red-200 hover:bg-red-100" : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                            )}
                            onClick={() => { setCurrentMonth(parseInt(m.month)); setViewMode('monthly'); }}
                            title="点击切换到该月的每日视图"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-semibold">{currentYear}年{monthLabel(m.month)}</div>
                                {positive ? <TrendingUp className="w-4 h-4 text-green-600" /> : negative ? <TrendingDown className="w-4 h-4 text-red-600" /> : <Calendar className="w-4 h-4 text-gray-500" />}
                            </div>
                            <div className={cn("text-base font-bold", positive ? "text-green-700" : negative ? "text-red-700" : "text-gray-700")}
                            >
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
        );
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
                        {availableYears.length > 0 ? (
                            availableYears.map(year => (
                                <SelectItem key={year} value={year}>
                                    {year}
                                </SelectItem>
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

                {/* 调试信息 */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-gray-500">
                        可用年份: {availableYears.join(', ') || '加载中...'}
                    </div>
                )}
            </div>

            {/* 美东时间显示 */}
            <div className="text-center py-2 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-700">
                    🌍 当前美东时间: {usEasternTime ? usEasternTime.dateTime : '获取中...'}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                    📊 所有股票数据基于美东时间，避免时区混乱
                    {usEasternTime && ` (独立于客户端时区计算)`}
                </div>
            </div>

            {/* 月份导航 - 仅在月视图显示 */}
            {viewMode === 'monthly' && (
                <div className="flex items-center justify-between">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => changeMonth(-1)}
                        disabled={isLoading}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <h4 className="text-xl font-semibold">
                                {currentYear}年
                            </h4>
                            <Select
                                value={currentMonth.toString()}
                                onValueChange={(value) => {
                                    const newMonth = parseInt(value);
                                    setCurrentMonth(newMonth);
                                    fetchCalendarData(currentYear, newMonth);
                                }}
                            >
                                <SelectTrigger className="w-20 h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map((month, index) => (
                                        <SelectItem key={index + 1} value={(index + 1).toString()}>
                                            {month}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {monthlySummary && (
                            <div className="text-sm mt-1 space-y-1">
                                <div className={`font-medium ${monthlySummary.totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    月度收益: {formatLargeNumber(monthlySummary.totalGain, currency)}
                                    ({monthlySummary.totalGain >= 0 ? '+' : ''}{monthlySummary.totalGainPercent.toFixed(2)}%)
                                </div>
                                <div className="text-gray-600 text-xs">
                                    交易日: {monthlySummary.tradingDaysCount}天 |
                                    盈利: {monthlySummary.profitDays}天 |
                                    亏损: {monthlySummary.lossDays}天 |
                                    胜率: {monthlySummary.winRate.toFixed(1)}%
                                </div>
                            </div>
                        )}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => changeMonth(1)}
                        disabled={isLoading}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* 手动操作区域 - 仅在月视图显示 */}
            {viewMode === 'monthly' && (
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
                            <span className="text-xs text-blue-600">
                                📍 基于美东时间 (避免时区混乱)
                            </span>
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
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    月度生成中...
                                </>
                            ) : (
                                <>
                                    <Calendar className="w-4 h-4 mr-2" />
                                    月度智能生成
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
                    <p>🔧 <strong>简单生成</strong>: 基于实际持仓和历史价格生成快照</p>
                    <p>📅 <strong>点击日历日期</strong>: 自动更新生成日期字段</p>
                </div>
            </div>
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

            {/* 日历网格 */}
            {!isLoading && viewMode === 'monthly' && (
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
            {!isLoading && viewMode === 'yearly' && (
                <div className="bg-white rounded-lg border p-4">
                    {renderYearlyGrid()}
                </div>
            )}
        </div>
    );
};

export default ProfitLossCalendar;
