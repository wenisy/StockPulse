"use client";
import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
    Tooltip as UITooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from 'lucide-react';
import { YearData } from '@/types/stock';

interface GrowthInfoProps {
    year: string;
    years: string[];
    yearData: { [year: string]: YearData };
    formatLargeNumber: (num: number, targetCurrency: string) => string;
    currency: string;
}

const GrowthInfo: React.FC<GrowthInfoProps> = ({
    year,
    years,
    yearData,
    formatLargeNumber,
    currency,
}) => {
    const calculateYearGrowth = useCallback((currentYear: string) => {
        // 年份数组已经按照降序排列（最新的在前）
        // 所以需要找到比当前年份小的年份中最大的那一个
        const currentYearInt = parseInt(currentYear);
        const previousYears = years.filter(y => parseInt(y) < currentYearInt);
        if (previousYears.length === 0) return null;

        // 按照降序排列，所以第一个就是最大的
        const previousYear = previousYears[0];
        const calculateTotalValue = (year: string) => {
            if (!yearData[year]?.stocks) return 0;
            const stockValue = yearData[year].stocks.reduce((acc, stock) => acc + stock.shares * stock.price, 0);
            return stockValue + (yearData[year].cashBalance || 0);
        };

        const currentValue = calculateTotalValue(currentYear);
        const previousValue = calculateTotalValue(previousYear);

        const yearDeposits = yearData[currentYear]?.cashTransactions
            .reduce((sum, tx) => sum + (tx.type === 'deposit' ? tx.amount : 0), 0) || 0;

        const actualGrowth = currentValue - previousValue;
        const actualGrowthRate = ((currentValue / previousValue) - 1) * 100;

        const investmentGrowth = actualGrowth - yearDeposits;
        const investmentGrowthRate = ((currentValue - yearDeposits) / previousValue - 1) * 100;

        return {
            actualGrowth,
            actualGrowthRate,
            investmentGrowth,
            investmentGrowthRate,
            yearDeposits
        };
    }, [years, yearData]);

    // 检查是否是最早的年份
    const currentYearInt = parseInt(year);
    const earlierYears = years.filter(y => parseInt(y) < currentYearInt);

    if (earlierYears.length === 0) {
        const initialInvestment = yearData[year]?.cashTransactions
            .reduce((sum, tx) => sum + (tx.type === 'deposit' ? tx.amount : tx.type === 'withdraw' ? -tx.amount : 0), 0) || 0;

        return (
            <div className="space-y-1 text-sm">
                <p className="text-blue-500">
                    初始投入: {formatLargeNumber(initialInvestment, currency)}
                </p>
            </div>
        );
    }

    const growth = calculateYearGrowth(year);
    if (!growth) return null;

    return (
        <div className="space-y-1 text-sm">
            <div className="flex items-center gap-1">
                <p className={cn(growth.actualGrowth >= 0 ? 'text-green-500' : 'text-red-500')}>
                    较上年总增长: {formatLargeNumber(growth.actualGrowth, currency)}
                    ({growth.actualGrowthRate.toFixed(2)}%)
                </p>
                <TooltipProvider>
                    <UITooltip>
                        <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>包含入金在内的总体增长金额和比例，<br />计算公式：当年总资产 - 上年总资产</p>
                        </TooltipContent>
                    </UITooltip>
                </TooltipProvider>
            </div>

            <div className="flex items-center gap-1">
                <p className={cn(growth.investmentGrowth >= 0 ? 'text-green-500' : 'text-red-500')}>
                    投资回报: {formatLargeNumber(growth.investmentGrowth, currency)}
                    ({growth.investmentGrowthRate.toFixed(2)}%)
                </p>
                <TooltipProvider>
                    <UITooltip>
                        <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>扣除当年入金后的实际投资回报，<br />计算公式：(当年总资产 - 当年入金) - 上年总资产</p>
                        </TooltipContent>
                    </UITooltip>
                </TooltipProvider>
            </div>

            {growth.yearDeposits > 0 && (
                <div className="flex items-center gap-1">
                    <p className="text-blue-500">
                        当年入金: {formatLargeNumber(growth.yearDeposits, currency)}
                    </p>
                    <TooltipProvider>
                        <UITooltip>
                            <TooltipTrigger>
                                <HelpCircle className="h-4 w-4 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>当年新增投入的资金总额，<br />不包括股票交易产生的现金流动</p>
                            </TooltipContent>
                        </UITooltip>
                    </TooltipProvider>
                </div>
            )}
        </div>
    );
};

const calculateTotalValue = (yearData?: YearData) => {
    if (!yearData) return 0;
    const stocksValue = yearData.stocks.reduce((acc, stock) => acc + stock.shares * stock.price, 0);
    return stocksValue + (yearData.cashBalance || 0);
};

export default GrowthInfo;