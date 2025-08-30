"use client";
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts';
import { YearData, User } from '@/types/stock';
import ProfitLossCalendar from './ProfitLossCalendar';

interface ReportDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    selectedYear: string | null;
    yearData: { [year: string]: YearData };
    hiddenStocks: { [stockName: string]: boolean };
    formatLargeNumber: (num: number, targetCurrency: string) => string;
    currency: string;
    totalPortfolioValue: number;
    cumulativeInvested: number;
    currentUser?: User | null;
}

const ReportDialog: React.FC<ReportDialogProps> = ({
    isOpen,
    onOpenChange,
    selectedYear,
    yearData,
    hiddenStocks,
    formatLargeNumber,
    currency,
    totalPortfolioValue,
    cumulativeInvested,
    currentUser,
}) => {
    if (!selectedYear || !yearData[selectedYear]) return null;

    const yearDataItem = yearData[selectedYear];
    const growth = totalPortfolioValue - cumulativeInvested;
    const growthRate = cumulativeInvested > 0 ? (growth / cumulativeInvested) * 100 : 0;

    const preparePieChartData = () => {
        const stocks = yearDataItem.stocks.filter(stock => !hiddenStocks[stock.name]);
        const totalValue = stocks.reduce((acc, stock) => acc + stock.shares * stock.price, 0) + (yearDataItem.cashBalance || 0);
        const data = stocks.map(stock => ({
            name: stock.name,
            value: stock.shares * stock.price,
        }));
        return { data, totalValue };
    };

    const { data: pieData, totalValue: pieTotalValue } = preparePieChartData();

    const prepareBarChartData = () => {
        const stocks = yearDataItem.stocks.filter(stock => !hiddenStocks[stock.name]);
        return stocks
            .map(stock => ({
                name: stock.name,
                profitLoss: stock.costPrice > 0 ? ((stock.price - stock.costPrice) / stock.costPrice) * 100 : 0,
            }))
            .sort((a, b) => b.profitLoss - a.profitLoss);
    };

    const prepareTopPerformersData = () => {
        const stocks = yearDataItem.stocks.filter(stock => !hiddenStocks[stock.name]);
        return stocks
            .map(stock => ({
                name: stock.name,
                symbol: stock.symbol || 'N/A',
                profitLoss: stock.costPrice > 0 ? ((stock.price - stock.costPrice) / stock.costPrice) * 100 : 0,
            }))
            .sort((a, b) => b.profitLoss - a.profitLoss)
            .map((stock, index) => ({ rank: index + 1, ...stock }));
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[40vw] max-h-[90vh] overflow-y-auto w-[95vw] min-w-[800px]" style={{width: '40vw', maxWidth: '95vw'}}>
                <DialogHeader>
                    <DialogTitle>投资报表</DialogTitle>
                    <div className="text-lg font-semibold mt-2">
                        {currentUser ? `${currentUser.nickname || currentUser.username}的` : ''}{selectedYear}年详细报表
                    </div>
                </DialogHeader>
                <Tabs defaultValue="summary" className="w-full">
                    <TabsList>
                        <TabsTrigger value="summary">概览</TabsTrigger>
                        <TabsTrigger value="portfolio">投资组合分布</TabsTrigger>
                        <TabsTrigger value="performance">盈亏表现</TabsTrigger>
                        <TabsTrigger value="calendar">每日盈亏日历</TabsTrigger>
                        <TabsTrigger value="top">最佳排名</TabsTrigger>
                        <TabsTrigger value="cash">现金历史</TabsTrigger>
                        <TabsTrigger value="trades">买卖历史</TabsTrigger>
                    </TabsList>
                    <TabsContent value="summary">
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-semibold">当年总持仓</h3>
                                <p>{formatLargeNumber(totalPortfolioValue, currency)}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-semibold">累计投入现金</h3>
                                <p>{formatLargeNumber(cumulativeInvested, currency)}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-semibold">投资增长</h3>
                                <p className={growth >= 0 ? 'text-green-500' : 'text-red-500'}>
                                    {formatLargeNumber(growth, currency)} ({growthRate.toFixed(2)}%)
                                </p>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="portfolio">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label={({ name, value }) => `${name} (${((value / pieTotalValue) * 100).toFixed(2)}%)`}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `${((value / pieTotalValue) * 100).toFixed(2)}%`} />
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
                                <Tooltip formatter={(value: number | string) => `${Number(value).toFixed(2)}%`} />
                                <Bar dataKey="profitLoss" fill="#82ca9d">
                                    {prepareBarChartData().map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.profitLoss >= 0 ? '#82ca9d' : '#ff7300'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </TabsContent>
                    <TabsContent value="calendar">
                        <ProfitLossCalendar
                            selectedYear={selectedYear || new Date().getFullYear().toString()}
                            formatLargeNumber={formatLargeNumber}
                            currency={currency}
                        />
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
                                {yearDataItem.cashTransactions && [...yearDataItem.cashTransactions]
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map((tx, index) => {
                                        if (tx.stockName && hiddenStocks[tx.stockName]) {
                                            return null;
                                        }
                                        const isIncrease = tx.type === 'deposit' || tx.type === 'sell';
                                        const colorClass = isIncrease ? 'text-green-500' : 'text-red-500';
                                        const description = tx.description || (tx.type === 'deposit' ? '存入' : tx.type === 'withdraw' ? '取出' : tx.type === 'buy' ? `买入${tx.stockName}` : `卖出${tx.stockName}`);
                                        return (
                                            <li key={index} className={colorClass}>
                                                {tx.date}: {description} {formatLargeNumber(Math.abs(tx.amount), currency)}
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
                                {yearDataItem.stockTransactions && [...yearDataItem.stockTransactions]
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map((tx, index) => {
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
                                                {tx.date}: {tx.type === 'buy' ? '买入' : '卖出'} {tx.stockName} {tx.shares}股，价格 {formatLargeNumber(tx.price, currency)}
                                                {tx.beforeCostPrice !== undefined && tx.afterCostPrice !== undefined && (
                                                    <>
                                                        ，交易前成本价 {formatLargeNumber(tx.beforeCostPrice, currency)}，
                                                        交易后成本价 <span className={tx.afterCostPrice < tx.beforeCostPrice ? 'text-green-500' : tx.afterCostPrice > tx.beforeCostPrice ? 'text-red-500' : ''}>
                                                            {formatLargeNumber(tx.afterCostPrice, currency)}
                                                            {tx.afterCostPrice !== tx.beforeCostPrice && (
                                                                <> ({tx.afterCostPrice < tx.beforeCostPrice ? '↓' : '↑'})</>
                                                            )}
                                                        </span>
                                                    </>
                                                )}
                                                {tx.type === 'sell' && (
                                                    <>
                                                        ，当前价格 {formatLargeNumber(currentPrice, currency)}，
                                                        盈利 {formatLargeNumber(profit, currency)} ({profitPercentage.toFixed(2)}%)
                                                    </>
                                                )}
                                            </li>
                                        );
                                    })}
                            </ul>
                        </div>
                    </TabsContent>
                </Tabs>
                <Button onClick={() => onOpenChange(false)} className="mt-4">关闭</Button>
            </DialogContent>
        </Dialog>
    );
};

export default ReportDialog;