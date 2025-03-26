"use client";
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface BarChartComponentProps {
  data: any[];
  years: string[];
}

// 柱状图组件
const BarChartComponent = ({ data, years }: BarChartComponentProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={(value) => `${value}%`} />
        <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
        <Legend />
        {years.map((year, index) => (
          <Bar
            key={year}
            dataKey={year}
            name={`${year}年`}
            fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'][index % 5]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BarChartComponent;
