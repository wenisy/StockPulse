"use client";
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipContent, TooltipProvider, TooltipTrigger, Tooltip as UITooltip } from "@/components/ui/tooltip";
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvestmentOverviewProps {
  years: string[];
  comparisonYear: string;
  setComparisonYear: (year: string) => void;
  calculateInvestmentReturn: (year: string) => {
    totalInvestment: number;
    portfolioValue: number;
    absoluteReturn: number;
    percentageReturn: number;
  };
  formatLargeNumber: (value: number, currency: string) => string;
  currency: string;
}

/**
 * 投资总览组件
 * 显示投资总览信息，包括累计投入、总持仓、总收益金额和总收益率
 */
const InvestmentOverview: React.FC<InvestmentOverviewProps> = ({
  years,
  comparisonYear,
  setComparisonYear,
  calculateInvestmentReturn,
  formatLargeNumber,
  currency
}) => {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">投资总览</h2>
      <div className="p-6 border rounded-lg bg-white shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-gray-600">选择对比年份：</span>
          <Select onValueChange={setComparisonYear} value={comparisonYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="选择年份" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(() => {
          const result = calculateInvestmentReturn(comparisonYear);
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-1">
                  <div className="text-sm text-gray-500">截至{comparisonYear}年累计投入</div>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>从最早记录年份至{comparisonYear}年的净投入金额<br />（所有存入金额减去取出金额）
                        </p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
                <div className="text-xl font-bold text-blue-600">
                  {formatLargeNumber(result.totalInvestment, currency)}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">{comparisonYear}年总持仓</div>
                <div className="text-xl font-bold text-blue-600">
                  {formatLargeNumber(result.portfolioValue, currency)}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">总收益金额</div>
                <div className={cn(
                  "text-xl font-bold",
                  result.absoluteReturn >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatLargeNumber(result.absoluteReturn, currency)}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">总收益率</div>
                <div className={cn(
                  "text-xl font-bold",
                  result.percentageReturn >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {result.percentageReturn.toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })()}

        <div className="text-sm text-gray-500 mt-2">
          * 总收益基于历史累计投入资金（存入减去取出）与选定年份的总持仓价值进行计算
        </div>
      </div>
    </div>
  );
};

export default InvestmentOverview;
