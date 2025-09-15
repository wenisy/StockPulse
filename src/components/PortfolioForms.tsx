import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { YearData } from "@/types/stock";

interface PortfolioFormsProps {
  // 年份管理
  newYear: string;
  setNewYear: (value: string) => void;
  addNewYear: () => void;
  years: string[];
  selectedYear: string;
  handleYearChange: (year: string) => void;

  // 现金交易
  cashTransactionAmount: string;
  setCashTransactionAmount: (value: string) => void;
  cashTransactionType: "deposit" | "withdraw";
  setCashTransactionType: (value: "deposit" | "withdraw") => void;
  addCashTransaction: () => void;
  yearData: { [year: string]: YearData };
  currency: string;
  formatLargeNumber: (num: number, currency: string) => string;
  setCurrency: (value: string) => void;

  // 股票交易
  newStockName: string;
  setNewStockName: (value: string) => void;
  newStockSymbol: string;
  setNewStockSymbol: (value: string) => void;
  transactionType: "buy" | "sell";
  setTransactionType: (value: "buy" | "sell") => void;
  newShares: string;
  setNewShares: (value: string) => void;
  newPrice: string;
  setNewPrice: (value: string) => void;
  newYearEndPrice: string;
  setNewYearEndPrice: (value: string) => void;
  confirmAddNewStock: () => void;
  latestYear: string;
  priceData: { [symbol: string]: { price: number; lastUpdated?: string } };

  // 其他功能
  refreshPrices: (isManual?: boolean) => Promise<void>;
  isLoading: boolean;
}

const PortfolioForms: React.FC<PortfolioFormsProps> = ({
  // 年份管理
  newYear,
  setNewYear,
  addNewYear,
  years,
  selectedYear,
  handleYearChange,

  // 现金交易
  cashTransactionAmount,
  setCashTransactionAmount,
  cashTransactionType,
  setCashTransactionType,
  addCashTransaction,
  yearData,
  currency,
  formatLargeNumber,
  setCurrency,

  // 股票交易
  newStockName,
  setNewStockName,
  newStockSymbol,
  setNewStockSymbol,
  transactionType,
  setTransactionType,
  newShares,
  setNewShares,
  newPrice,
  setNewPrice,
  newYearEndPrice,
  setNewYearEndPrice,
  confirmAddNewStock,
  latestYear,
  priceData,

  // 其他功能
  refreshPrices,
  isLoading,
}) => {
  return (
    <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">添加新年份</h2>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="例如: 2025"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              className="flex-grow"
            />
            <Button onClick={addNewYear}>添加年份</Button>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">选择年份</h2>
          <Select onValueChange={handleYearChange} value={selectedYear}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择年份" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">
          添加/更新现金数量 ({selectedYear}年)
        </h2>
        <div className="flex gap-2 mb-4">
          <Button onClick={() => {}}>现金</Button>
          <Button onClick={() => {}}>股票</Button>
          <Button onClick={() => refreshPrices(true)} disabled={isLoading}>
            刷新
          </Button>
        </div>
        <div className="flex gap-2">
          <Select
            onValueChange={(value) =>
              setCashTransactionType(value as "deposit" | "withdraw")
            }
            value={cashTransactionType}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deposit">存入</SelectItem>
              <SelectItem value="withdraw">取出</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="金额"
            value={cashTransactionAmount}
            onChange={(e) => setCashTransactionAmount(e.target.value)}
            className="w-32"
          />
          <Button onClick={addCashTransaction}>添加</Button>
        </div>
        <p
          className={cn(
            "text-sm mt-2",
            (yearData[selectedYear]?.cashBalance || 0) < 0
              ? "text-red-500"
              : "text-green-500"
          )}
        >
          现金余额:{" "}
          {formatLargeNumber(
            yearData[selectedYear]?.cashBalance || 0,
            currency
          )}
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">
          添加/更新股票 ({selectedYear}年)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <Combobox
            options={
              yearData[latestYear]?.stocks.map((stock) => ({
                label: stock.name,
                value: stock.name,
              })) || []
            }
            value={newStockName}
            onChange={(value) => {
              setNewStockName(value);
              const selectedStock = yearData[latestYear]?.stocks.find(
                (stock) => stock.name === value
              );
              if (selectedStock) {
                setNewStockSymbol(selectedStock.symbol || "");
              }
            }}
            placeholder="选择或输入股票名称"
            allowCustomInput={true}
            customInputPlaceholder="输入新股票名称..."
          />
          <Combobox
            options={
              yearData[latestYear]?.stocks
                .map((stock) => ({
                  label: stock.symbol || "",
                  value: stock.symbol || "",
                }))
                .filter((option) => option.value) || []
            }
            value={newStockSymbol}
            onChange={(value) => {
              setNewStockSymbol(value);
              const selectedStock = yearData[latestYear]?.stocks.find(
                (stock) => stock.symbol === value
              );
              if (selectedStock) {
                setNewStockName(selectedStock.name);
              }
            }}
            placeholder="选择或输入股票代码"
            allowCustomInput={true}
            customInputPlaceholder="输入新股票代码..."
          />
          <Select
            onValueChange={(value) =>
              setTransactionType(value as "buy" | "sell")
            }
            value={transactionType}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="交易类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buy">买入</SelectItem>
              <SelectItem value="sell">卖出</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="交易股数"
            value={newShares}
            onChange={(e) => setNewShares(e.target.value)}
          />
          <Input
            type="number"
            placeholder="交易价格"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            step="0.01"
          />
          <Input
            type="number"
            placeholder="当前价格（可选）"
            value={newYearEndPrice}
            onChange={(e) => setNewYearEndPrice(e.target.value)}
            step="0.01"
          />
        </div>
        <Button onClick={confirmAddNewStock} className="mt-2">
          添加股票
        </Button>
      </div>

      {priceData && Object.keys(priceData).length > 0 && (
        <p className="text-xs text-gray-500">
          最后更新时间: {Object.values(priceData)[0]?.lastUpdated || "未知"}
        </p>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-2">选择货币</h2>
        <Select onValueChange={setCurrency} value={currency}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="选择货币" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="HKD">HKD</SelectItem>
            <SelectItem value="CNY">CNY</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default PortfolioForms;