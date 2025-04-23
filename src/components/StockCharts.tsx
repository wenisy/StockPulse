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
  XAxis,
  YAxis
} from 'recharts';
import { StockChartData } from '@/types/stock';

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
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">图表类型</h2>
      <div className="flex gap-4 mb-4">
        <Button
          onClick={() => setShowPositionChart(true)}
          className={cn('px-4 py-2 rounded', showPositionChart ? 'bg-blue-500 text-white' : 'bg-gray-200')}
        >
          仓位变化图（折线图）
        </Button>
        <Button
          onClick={() => setShowPositionChart(false)}
          className={cn('px-4 py-2 rounded', !showPositionChart ? 'bg-blue-500 text-white' : 'bg-gray-200')}
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis
                tickCount={5}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                  return value.toFixed(0);
                }}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatLargeNumber(value, currency),
                  name === 'total' ? '总计' : name
                ]}
                labelFormatter={(label) => `${label}年`}
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
                    stroke={['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'][index % 5]}
                    strokeWidth={stock === 'total' ? 3 : 1.5}
                  />
                ))}
            </LineChart>
          ) : (
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis
                tickFormatter={(value: number) => `${value.toFixed(0)}%`}
                domain={[0, 100]}
              />
              <Tooltip
                formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, `${name}年占比`]}
                labelFormatter={(label) => `${label}`}
              />
              <Legend
                onClick={handleLegendClick}
                formatter={(value) => {
                  // 处理年份标签，显示为 'XXXX年占比'
                  if (value.endsWith('年占比')) {
                    return value;
                  }
                  return value === 'total' ? '总计' : value;
                }}
              />
              {(() => {
                // 检查哪些年份有实际数据
                const yearsWithData = years.filter(year => {
                  // 检查是否至少有一个股票在这一年有数据
                  return barChartData.some(stock => {
                    const value = stock[year] as number;
                    return value !== undefined && value > 0;
                  });
                });

                return yearsWithData
                  .slice() // 创建副本以避免修改原数组
                  .sort((a, b) => parseInt(a) - parseInt(b)) // 按年份从小到大排序
                  .map((year, index) => (
                    <Bar
                      key={year}
                      dataKey={year}
                      name={`${year}年占比`}
                      hide={!!hiddenSeries[year]}
                      fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'][index % 5]}
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
