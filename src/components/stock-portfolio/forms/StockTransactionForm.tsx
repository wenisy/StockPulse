"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StockSymbol } from '../types';

interface StockTransactionFormProps {
  transactionType: 'buy' | 'sell';
  setTransactionType: (type: 'buy' | 'sell') => void;
  newStockName: string;
  setNewStockName: (name: string) => void;
  newShares: string;
  setNewShares: (shares: string) => void;
  newPrice: string;
  setNewPrice: (price: string) => void;
  newYearEndPrice: string;
  setNewYearEndPrice: (price: string) => void;
  newStockSymbol: string;
  setNewStockSymbol: (symbol: string) => void;
  onAddStock: () => void;
  stockSymbols: StockSymbol[];
}

// 股票交易表单组件
const StockTransactionForm = ({
  transactionType,
  setTransactionType,
  newStockName,
  setNewStockName,
  newShares,
  setNewShares,
  newPrice,
  setNewPrice,
  newYearEndPrice,
  setNewYearEndPrice,
  newStockSymbol,
  setNewStockSymbol,
  onAddStock,
  stockSymbols
}: StockTransactionFormProps) => {
  // 处理股票代码选择
  const handleSymbolSelect = (symbol: string) => {
    setNewStockSymbol(symbol);
    const selectedStock = stockSymbols.find(s => s.symbol === symbol);
    if (selectedStock) {
      setNewStockName(selectedStock.name);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <h2 className="text-xl font-semibold">添加股票交易</h2>
      <div className="flex gap-2 mb-4">
        <Button
          onClick={() => setTransactionType('buy')}
          className={`px-4 py-2 rounded ${transactionType === 'buy' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          买入
        </Button>
        <Button
          onClick={() => setTransactionType('sell')}
          className={`px-4 py-2 rounded ${transactionType === 'sell' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          卖出
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">股票代码</label>
          <Select value={newStockSymbol} onValueChange={handleSymbolSelect}>
            <SelectTrigger>
              <SelectValue placeholder="选择股票代码" />
            </SelectTrigger>
            <SelectContent>
              {stockSymbols.map((stock) => (
                <SelectItem key={stock.symbol} value={stock.symbol}>
                  {stock.symbol} - {stock.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">股票名称</label>
          <Input
            type="text"
            value={newStockName}
            onChange={(e) => setNewStockName(e.target.value)}
            placeholder="输入股票名称"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">股数</label>
          <Input
            type="number"
            value={newShares}
            onChange={(e) => setNewShares(e.target.value)}
            placeholder="输入股数"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">交易价格</label>
          <Input
            type="number"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            placeholder="输入交易价格"
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">年末价格（可选）</label>
          <Input
            type="number"
            value={newYearEndPrice}
            onChange={(e) => setNewYearEndPrice(e.target.value)}
            placeholder="输入年末价格（可选）"
            step="0.01"
          />
        </div>
      </div>
      <Button onClick={onAddStock} className="w-full">
        添加交易
      </Button>
    </div>
  );
};

export default StockTransactionForm;
