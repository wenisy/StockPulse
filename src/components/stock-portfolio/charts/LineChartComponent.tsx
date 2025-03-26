"use client";
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatLargeNumber } from '../utils';

interface LineChartComponentProps {
  data: any[];
  hiddenSeries: { [dataKey: string]: boolean };
  hiddenStocks: { [stockName: string]: boolean };
  onLegendClick: (dataKey: string) => void;
  currency: string;
  exchangeRates: { [key: string]: number };
}

// 折线图组件
const LineChartComponent = ({
  data,
  hiddenSeries,
  hiddenStocks,
  onLegendClick,
  currency,
  exchangeRates
}: LineChartComponentProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
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
            formatLargeNumber(value, exchangeRates, currency),
            name === 'total' ? '总计' : name
          ]}
          labelFormatter={(label) => `${label}年`}
        />
        <Legend 
          onClick={(e) => onLegendClick(e.dataKey)} 
          formatter={(value) => value === 'total' ? '总计' : value} 
        />
        {Object.keys(data[0] || {})
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
    </ResponsiveContainer>
  );
};

export default LineChartComponent;
