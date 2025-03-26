"use client";
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { YearData } from '../types';
import { formatLargeNumber } from '../utils';

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedYear: string | null;
  yearData: { [year: string]: YearData };
  hiddenStocks: { [stockName: string]: boolean };
  currency: string;
  exchangeRates: { [key: string]: number };
  prepareBarChartData: () => any[];
  preparePieChartData: () => any[];
  prepareTopPerformersData: () => any[];
}

// 报告对话框组件
const ReportDialog = ({
  isOpen,
  onClose,
  selectedYear,
  yearData,
  hiddenStocks,
  currency,
  exchangeRates,
  prepareBarChartData,
  preparePieChartData,
  prepareTopPerformersData
}: ReportDialogProps) => {
  if (!isOpen || !selectedYear) return null;

  const yearDataItem = yearData[selectedYear];
  if (!yearDataItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{selectedYear}年投资报告</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="pie">分布</TabsTrigger>
            <TabsTrigger value="performance">表现</TabsTrigger>
            <TabsTrigger value="top">排名</TabsTrigger>
            <TabsTrigger value="cash">现金</TabsTrigger>
            <TabsTrigger value="trades">交易</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <div className="space-y-4">
              <h3 className="font-semibold">投资组合概览</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="text-sm font-medium text-gray-500">总资产</h4>
                  <p className="text-2xl font-bold">
                    {formatLargeNumber(
                      yearDataItem.stocks.reduce(
                        (sum, stock) => sum + stock.shares * stock.price,
                        0
                      ) + yearDataItem.cashBalance,
                      exchangeRates,
                      currency
                    )}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="text-sm font-medium text-gray-500">现金余额</h4>
                  <p className="text-2xl font-bold">
                    {formatLargeNumber(yearDataItem.cashBalance, exchangeRates, currency)}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="pie">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={preparePieChartData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(2)}%`}
                >
                  {preparePieChartData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="performance">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={prepareBarChartData()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[-100, 100]} tickFormatter={(value) => `${value}%`} />
                <YAxis type="category" dataKey="name" />
                <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                <Bar dataKey="profitLoss" fill="#82ca9d">
                  {prepareBarChartData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.profitLoss >= 0 ? '#82ca9d' : '#ff7300'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="top">
            <div>
              <h3 className="font-semibold">最佳表现排名</h3>
              <table className="w-full border-collapse border mt-2">
                <thead>
                  <tr>
                    <th className="border p-2">排名</th>
                    <th className="border p-2">股票名称</th>
                    <th className="border p-2">股票代码</th>
                    <th className="border p-2">盈亏比例</th>
                  </tr>
                </thead>
                <tbody>
                  {prepareTopPerformersData().map(stock => (
                    <tr key={stock.rank}>
                      <td className="border p-2 text-center">{stock.rank}</td>
                      <td className="border p-2">{stock.name}</td>
                      <td className="border p-2">{stock.symbol}</td>
                      <td className="border p-2 text-right">
                        <span className={stock.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {stock.profitLoss.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          <TabsContent value="cash">
            <div>
              <h3 className="font-semibold">现金变化历史</h3>
              <ul>
                {yearDataItem.cashTransactions && yearDataItem.cashTransactions.map((tx, index) => {
                  const isIncrease = tx.type === 'deposit' || tx.type === 'sell';
                  const colorClass = isIncrease ? 'text-green-500' : 'text-red-500';
                  const description = tx.description || (tx.type === 'deposit' ? '存入' : tx.type === 'withdraw' ? '取出' : tx.type === 'buy' ? `买入${tx.stockName}` : `卖出${tx.stockName}`);
                  if (tx.stockName && hiddenStocks[tx.stockName]) {
                    return null;
                  }
                  return (
                    <li key={index} className={colorClass}>
                      {tx.date}: {description} {formatLargeNumber(Math.abs(tx.amount), exchangeRates, currency)}
                    </li>
                  );
                })}
              </ul>
            </div>
          </TabsContent>
          <TabsContent value="trades">
            <div>
              <h3 className="font-semibold">股票买卖历史</h3>
              <ul>
                {yearDataItem.stockTransactions && yearDataItem.stockTransactions.map((tx, index) => {
                  if (hiddenStocks[tx.stockName]) {
                    return null;
                  }
                  const stock = yearDataItem.stocks.find(s => s.name === tx.stockName);
                  const costPrice = stock?.costPrice || 0;
                  const currentPrice = stock?.price || 0;
                  const profit = tx.type === 'sell' ? (tx.price - costPrice) * tx.shares : 0;
                  const profitPercentage = costPrice > 0 ? (profit / (costPrice * tx.shares)) * 100 : 0;
                  const colorClass = tx.type === 'buy' ? 'text-blue-500' : profit >= 0 ? 'text-green-500' : 'text-red-500';
                  return (
                    <li key={index} className={colorClass}>
                      {tx.date}: {tx.type === 'buy' ? '买入' : '卖出'} {tx.stockName} {tx.shares}股，价格 {formatLargeNumber(tx.price, exchangeRates, currency)}
                      {tx.type === 'sell' && (
                        <>
                          ，当前价格 {formatLargeNumber(currentPrice, exchangeRates, currency)}，
                          盈利 {formatLargeNumber(profit, exchangeRates, currency)} ({profitPercentage.toFixed(2)}%)
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </TabsContent>
        </Tabs>
        <Button onClick={onClose} className="mt-4">关闭</Button>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
