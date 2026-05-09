"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis
} from 'recharts';
import { StockChartData } from '@/types/stock';
import { useResolvedColors } from '@/hooks/useResolvedColors';

interface StockChartsProps {
  showPositionChart: boolean;
  setShowPositionChart: (show: boolean) => void;
  lineChartData: Array<{ [key: string]: string | number }>;
  barChartData: StockChartData[];
  years: string[];
  hiddenStocks: { [stockName: string]: boolean };
  hiddenSeries: { [dataKey: string]: boolean };
  handleLegendClick: (data: { value: string }) => void;
  formatLargeNumber: (value: number, currency: string) => string;
  currency: string;
}

/**
 * 自定义Tooltip组件 - 按金额排序显示股票信息
 */
const CustomLineChartTooltip: React.FC<TooltipProps<number, string> & {
  formatLargeNumber: (value: number, currency: string) => string;
  currency: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}> = ({ active, payload, label, formatLargeNumber, currency, bgColor, borderColor, textColor }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const sortedPayload = [...payload].sort((a, b) => {
    const valueA = typeof a.value === 'number' ? a.value : 0;
    const valueB = typeof b.value === 'number' ? b.value : 0;
    return valueB - valueA;
  });

  return (
    <div style={{ background: bgColor, border: `1px solid ${borderColor}`, color: textColor }}
      className="p-3 rounded shadow-lg text-sm">
      <p className="font-semibold mb-2">{`${label}年`}</p>
      {sortedPayload.map((entry, index) => {
        const value = typeof entry.value === 'number' ? entry.value : 0;
        const name = entry.name === 'total' ? '总计' : entry.name;
        return (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {`${name}: ${formatLargeNumber(value, currency)}`}
          </p>
        );
      })}
    </div>
  );
};

/**
 * 股票图表组件
 * 显示股票仓位变化图（折线图）和股票占比图（柱状图）
 */
const StockCharts: React.FC<StockChartsProps> = ({
  showPositionChart,
  setShowPositionChart,
  lineChartData,
  barChartData,
  years,
  hiddenStocks,
  hiddenSeries,
  handleLegendClick,
  formatLargeNumber,
  currency
}) => {
  const colors = useResolvedColors();

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">图表类型</h2>
      <div className="flex gap-4 mb-4">
        <Button
          onClick={() => setShowPositionChart(true)}
          className={cn('px-4 py-2 rounded', showPositionChart ? 'bg-brand text-white' : 'bg-bg-subtle')}
        >
          仓位变化图（折线图）
        </Button>
        <Button
          onClick={() => setShowPositionChart(false)}
          className={cn('px-4 py-2 rounded', !showPositionChart ? 'bg-brand text-white' : 'bg-bg-subtle')}
        >
          股票占比图（柱状图）
        </Button>
      </div>
      <h2 className="text-xl font-semibold mb-4">
        {showPositionChart ? '各股票仓位变化（按年）' : '各股票仓位占比（按年）'}
      </h2>
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {showPositionChart ? (
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.borderSubtle} />
              <XAxis dataKey="year" tick={{ fill: colors.fgMuted, fontSize: 12 }} />
              <YAxis
                tickCount={5}
                tick={{ fill: colors.fgMuted, fontSize: 12 }}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                  return value.toFixed(0);
                }}
              />
              <Tooltip
                content={
                  <CustomLineChartTooltip
                    formatLargeNumber={formatLargeNumber}
                    currency={currency}
                    bgColor={colors.bgElevated}
                    borderColor={colors.borderDefault}
                    textColor={colors.fg}
                  />
                }
              />
              <Legend
                onClick={handleLegendClick}
                formatter={(value) => value === 'total' ? '总计' : value}
              />
              {Object.keys(lineChartData[0] || {})
                .filter((key) => key !== 'year')
                .filter((stockName) => !hiddenStocks[stockName])
                .map((stock, index) => (
                  <Line
                    key={stock}
                    type="monotone"
                    dataKey={stock}
                    name={stock === 'total' ? '总计' : stock}
                    hide={!!hiddenSeries[stock]}
                    stroke={colors.chartColors[index % 5]}
                    strokeWidth={stock === 'total' ? 3 : 1.5}
                  />
                ))}
            </LineChart>
          ) : (
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.borderSubtle} />
              <XAxis dataKey="name" tick={{ fill: colors.fgMuted, fontSize: 12 }} />
              <YAxis
                tick={{ fill: colors.fgMuted, fontSize: 12 }}
                tickFormatter={(value: number) => `${value.toFixed(0)}%`}
                domain={[0, 100]}
              />
              <Tooltip
                formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, `${name}年占比`]}
                labelFormatter={(label) => `${label}`}
                contentStyle={{
                  background: colors.bgElevated,
                  border: `1px solid ${colors.borderDefault}`,
                  color: colors.fg,
                  borderRadius: 8,
                }}
              />
              <Legend
                onClick={handleLegendClick}
                formatter={(value) => {
                  if (value.endsWith('年占比')) return value;
                  return value === 'total' ? '总计' : value;
                }}
              />
              {(() => {
                const yearsWithData = years.filter(year => {
                  return barChartData.some(stock => {
                    const value = stock[year] as number;
                    return value !== undefined && value > 0;
                  });
                });

                return yearsWithData
                  .slice()
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .map((year, index) => (
                    <Bar
                      key={year}
                      dataKey={year}
                      name={`${year}年占比`}
                      hide={!!hiddenSeries[year]}
                      fill={colors.chartColors[index % 5]}
                    />
                  ));
              })()}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StockCharts;
