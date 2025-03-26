"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit, Save, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
// 工具提示组件
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { stockInitialData } from '../data';

// 导入类型定义
import {
  Stock,
  CashTransaction,
  StockTransaction,
  YearData,
  StockSymbol,
  PriceData,
  AlertInfo,
  EditedRowData
} from './types';

// 导入工具函数
import {
  getBasePath,
  convertToCurrency,
  formatLargeNumber,
  updateStocksWithLatestPrices,
  prepareLineChartData,
  preparePercentageBarChartData
} from './utils';

// 导入组件
import LineChartComponent from './charts/LineChartComponent';
import BarChartComponent from './charts/BarChartComponent';
import PieChartComponent from './charts/PieChartComponent';
import AlertDialog from './dialogs/AlertDialog';
import CopyPasteDialog from './dialogs/CopyPasteDialog';
import StockTransactionForm from './forms/StockTransactionForm';
import CashTransactionForm from './forms/CashTransactionForm';
import YearForm from './forms/YearForm';

const StockPortfolioTracker: React.FC = () => {
  const initialData: { [year: string]: YearData } = stockInitialData;

  // 状态管理
  const [yearData, setYearData] = useState<{ [year: string]: YearData }>(initialData);
  const [years, setYears] = useState<string[]>(Object.keys(initialData));
  const [newYear, setNewYear] = useState('');
  const [newStockName, setNewStockName] = useState('');
  const [newShares, setNewShares] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newYearEndPrice, setNewYearEndPrice] = useState('');
  const [newStockSymbol, setNewStockSymbol] = useState('');
  const [selectedYear, setSelectedYear] = useState(years[years.length - 1]);
  const [editingStockName, setEditingStockName] = useState<string | null>(null);
  const [editedRowData, setEditedRowData] = useState<EditedRowData | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<{ [dataKey: string]: boolean }>({});
  const [hiddenStocks, setHiddenStocks] = useState<{ [stockName: string]: boolean }>({});
  const [alertInfo, setAlertInfo] = useState<AlertInfo | null>(null);
  const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');
  const [cashTransactionAmount, setCashTransactionAmount] = useState('');
  const [cashTransactionType, setCashTransactionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);
  const [pasteData, setPasteData] = useState('');
  const [stockSymbols, setStockSymbols] = useState<StockSymbol[]>([]);
  const [priceData, setPriceData] = useState<PriceData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<{ [key: string]: number }>({ USD: 1, HKD: 0.12864384, CNY: 0.14 });
  
  // 常量定义
  const DEFAULT_CURRENCY = 'USD';

  const latestYear = years.length > 0 ? Math.max(...years.map(Number)).toString() : '2024';

  // 数据加载
  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const url = `${getBasePath()}/data/symbols.json`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setStockSymbols(data.stocks || []);
        }
      } catch (error) {
        console.error('获取股票符号失败:', error);
      }
    };
    fetchSymbols();
  }, []);

  useEffect(() => {
    const fetchLatestPrices = async () => {
      try {
        const url = `${getBasePath()}/data/prices.json`;
        const timestamp = new Date().getTime();
        const response = await fetch(`${url}?t=${timestamp}`);
        if (response.ok) {
          const data = await response.json();
          setPriceData(data);

          const rates: { [key: string]: number } = { USD: 1 };
          if (data['HKD']) rates['HKD'] = data['HKD'].price;
          if (data['CNY']) rates['CNY'] = data['CNY'].price;
          setExchangeRates(rates);

          const updatedYearData = updateStocksWithLatestPrices(yearData, latestYear, data, rates);
          setYearData(updatedYearData);
        }
      } catch (error) {
        console.error('获取最新价格时出错:', error);
      }
    };
    fetchLatestPrices();
  }, []);

  // 年份管理
  const addNewYear = () => {
    if (!newYear || years.includes(newYear)) {
      setAlertInfo({
        isOpen: true,
        title: '输入错误',
        description: '请输入有效的年份（不能是已存在的年份）',
        onConfirm: () => setAlertInfo(null),
      });
      return;
    }

    // 复制上一年的数据作为新年的初始数据
    const prevYear = years[years.length - 1];
    const newYearData = {
      ...yearData,
      [newYear]: {
        ...yearData[prevYear],
        stocks: yearData[prevYear].stocks.map(stock => ({
          ...stock,
          id: uuidv4(),
          yearEndPrice: stock.price
        })),
        cashTransactions: []
      }
    };

    setYearData(newYearData);
    setYears([...years, newYear].sort((a, b) => parseInt(a) - parseInt(b)));
    setSelectedYear(newYear);
    setNewYear('');
  };

  // 现金交易
  const addCashTransaction = () => {
    const amount = parseFloat(cashTransactionAmount);
    if (isNaN(amount) || amount <= 0) {
      setAlertInfo({
        isOpen: true,
        title: '输入错误',
        description: '请输入有效的金额',
        onConfirm: () => setAlertInfo(null),
      });
      return;
    }

    const newTransaction: CashTransaction = {
      id: uuidv4(),
      date: new Date().toISOString(),
      amount: cashTransactionType === 'deposit' ? amount : -amount,
      type: cashTransactionType
    };

    setYearData(prevYearData => {
      const updatedYearData = { ...prevYearData };
      if (!updatedYearData[selectedYear].cashTransactions) {
        updatedYearData[selectedYear].cashTransactions = [];
      }
      updatedYearData[selectedYear].cashTransactions.push(newTransaction);
      return updatedYearData;
    });

    setCashTransactionAmount('');
  };

  // 股票交易
  const confirmAddNewStock = () => {
    const shares = parseFloat(newShares);
    const price = parseFloat(newPrice);
    const yearEndPrice = newYearEndPrice ? parseFloat(newYearEndPrice) : price;

    if (!newStockName || isNaN(shares) || isNaN(price) || shares <= 0 || price <= 0 || yearEndPrice <= 0) {
      setAlertInfo({
        isOpen: true,
        title: '输入错误',
        description: '请填写所有必填字段，并确保数值有效',
        onConfirm: () => setAlertInfo(null),
      });
      return;
    }

    // 检查股票是否已存在
    const stockExists = yearData[selectedYear]?.stocks.some(
      stock => stock.name.toLowerCase() === newStockName.toLowerCase()
    );

    if (stockExists && transactionType === 'buy') {
      setAlertInfo({
        isOpen: true,
        title: '股票已存在',
        description: `${newStockName} 已在您的投资组合中。您可以编辑现有股票或使用不同名称。`,
        onConfirm: () => setAlertInfo(null),
      });
      return;
    }

    if (transactionType === 'buy') {
      const newStock: Stock = {
        id: uuidv4(),
        name: newStockName,
        symbol: newStockSymbol,
        shares,
        costPrice: price,
        price,
        yearEndPrice,
        transactions: [
          {
            id: uuidv4(),
            date: new Date().toISOString(),
            shares,
            price,
            type: 'buy'
          }
        ]
      };

      setYearData(prevYearData => {
        const updatedYearData = { ...prevYearData };
        if (!updatedYearData[selectedYear].stocks) {
          updatedYearData[selectedYear].stocks = [];
        }
        updatedYearData[selectedYear].stocks.push(newStock);
        return updatedYearData;
      });
    } else {
      // 卖出交易
      const stockIndex = yearData[selectedYear]?.stocks.findIndex(
        stock => stock.name.toLowerCase() === newStockName.toLowerCase()
      );

      if (stockIndex === -1) {
        setAlertInfo({
          isOpen: true,
          title: '股票不存在',
          description: `找不到名为 ${newStockName} 的股票。请先添加该股票。`,
          onConfirm: () => setAlertInfo(null),
        });
        return;
      }

      const stock = yearData[selectedYear].stocks[stockIndex];
      if (stock.shares < shares) {
        setAlertInfo({
          isOpen: true,
          title: '股数不足',
          description: `您只持有 ${stock.shares} 股 ${newStockName}，无法卖出 ${shares} 股。`,
          onConfirm: () => setAlertInfo(null),
        });
        return;
      }

      const newTransaction: StockTransaction = {
        id: uuidv4(),
        date: new Date().toISOString(),
        shares,
        price,
        type: 'sell'
      };

      setYearData(prevYearData => {
        const updatedYearData = { ...prevYearData };
        const stock = updatedYearData[selectedYear].stocks[stockIndex];
        
        // 更新股票信息
        stock.transactions.push(newTransaction);
        stock.shares -= shares;
        
        // 如果股数为0，询问是否删除
        if (stock.shares === 0) {
          setAlertInfo({
            isOpen: true,
            title: '股票已全部卖出',
            description: `您已卖出所有 ${newStockName} 股票。是否从投资组合中移除？`,
            onConfirm: () => {
              setYearData(prevData => {
                const updatedData = { ...prevData };
                updatedData[selectedYear].stocks = updatedData[selectedYear].stocks.filter(
                  s => s.id !== stock.id
                );
                return updatedData;
              });
              setAlertInfo(null);
            },
          });
        }
        
        return updatedYearData;
      });
    }

    // 重置表单
    setNewStockName('');
    setNewShares('');
    setNewPrice('');
    setNewYearEndPrice('');
    setNewStockSymbol('');
  };

  // 图表数据准备函数
  const lineChartData = useCallback(() => {
    const allYears = [...years].sort((a, b) => parseInt(a) - parseInt(b));
    return prepareLineChartData(yearData, allYears, hiddenStocks);
  }, [yearData, years, hiddenStocks]);

  const prepareBarChartData = useCallback(() => {
    if (!yearData[selectedYear]) return [];
    return preparePercentageBarChartData(yearData[selectedYear].stocks, hiddenStocks);
  }, [yearData, selectedYear, hiddenStocks]);

  const preparePieChartData = useCallback(() => {
    if (!yearData[selectedYear]) return [];
    
    return yearData[selectedYear].stocks
      .filter(stock => !hiddenStocks[stock.name])
      .map(stock => ({
        name: stock.name,
        value: stock.shares * stock.price
      }))
      .sort((a, b) => b.value - a.value);
  }, [yearData, selectedYear, hiddenStocks]);

  // 事件处理函数
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
  };

  const handleLegendClick = (dataKey: string) => {
    setHiddenSeries(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  const handleEditRow = (stockName: string) => {
    const stock = yearData[selectedYear].stocks.find(s => s.name === stockName);
    if (stock) {
      setEditingStockName(stockName);
      setEditedRowData({
        shares: stock.shares.toString(),
        price: stock.price.toString()
      });
    }
  };

  const handleSaveRow = (stockName: string) => {
    if (!editedRowData) return;
    
    const shares = parseFloat(editedRowData.shares);
    const price = parseFloat(editedRowData.price);
    
    if (isNaN(shares) || isNaN(price) || shares <= 0 || price <= 0) {
      setAlertInfo({
        isOpen: true,
        title: '输入错误',
        description: '请输入有效的股数和价格',
        onConfirm: () => setAlertInfo(null),
      });
      return;
    }
    
    setYearData(prevYearData => {
      const updatedYearData = { ...prevYearData };
      const stockIndex = updatedYearData[selectedYear].stocks.findIndex(s => s.name === stockName);
      
      if (stockIndex !== -1) {
        updatedYearData[selectedYear].stocks[stockIndex] = {
          ...updatedYearData[selectedYear].stocks[stockIndex],
          shares,
          price
        };
      }
      
      return updatedYearData;
    });
    
    setEditingStockName(null);
    setEditedRowData(null);
  };

  const handleDeleteStock = (stockName: string) => {
    setAlertInfo({
      isOpen: true,
      title: '确认删除',
      description: `确定要删除 ${stockName} 吗？此操作无法撤销。`,
      onConfirm: () => {
        setYearData(prevYearData => {
          const updatedYearData = { ...prevYearData };
          updatedYearData[selectedYear].stocks = updatedYearData[selectedYear].stocks.filter(
            stock => stock.name !== stockName
          );
          return updatedYearData;
        });
        setAlertInfo(null);
      },
    });
  };

  const toggleStockVisibility = (stockName: string) => {
    setHiddenStocks(prev => ({
      ...prev,
      [stockName]: !prev[stockName]
    }));
  };

  const handleCopyData = () => {
    setIsCopyDialogOpen(true);
  };

  const handlePasteData = () => {
    setIsPasteDialogOpen(true);
  };

  const confirmPasteData = () => {
    try {
      const parsedData = JSON.parse(pasteData);
      if (typeof parsedData !== 'object') {
        throw new Error('数据格式不正确');
      }
      
      setYearData(parsedData);
      setYears(Object.keys(parsedData));
      setSelectedYear(Object.keys(parsedData)[Object.keys(parsedData).length - 1]);
      setIsPasteDialogOpen(false);
      
      setAlertInfo({
        isOpen: true,
        title: '导入成功',
        description: '投资组合数据已成功导入',
        onConfirm: () => setAlertInfo(null),
      });
    } catch (error) {
      setAlertInfo({
        isOpen: true,
        title: '导入失败',
        description: '无法解析提供的数据，请确保输入有效的JSON格式',
        onConfirm: () => setAlertInfo(null),
      });
    }
  };

  // 刷新价格
  const refreshPrices = async () => {
    setIsLoading(true);
    try {
      const url = `${getBasePath()}/data/prices.json`;
      const timestamp = new Date().getTime();
      const response = await fetch(`${url}?t=${timestamp}`);
      if (response.ok) {
        const data = await response.json();
        setPriceData(data);

        const rates: { [key: string]: number } = { USD: 1 };
        if (data['HKD']) rates['HKD'] = data['HKD'].price;
        if (data['CNY']) rates['CNY'] = data['CNY'].price;
        setExchangeRates(rates);

        setYearData((prevYearData) => {
          const updatedYearData = { ...prevYearData };
          if (updatedYearData[selectedYear] && updatedYearData[selectedYear].stocks) {
            updatedYearData[selectedYear].stocks.forEach(stock => {
              if (stock.symbol && data[stock.symbol]) {
                if (stock.symbol.endsWith('.HK') && data[stock.symbol].hkdPrice) {
                  stock.price = data[stock.symbol].hkdPrice * rates['HKD'];
                } else {
                  stock.price = data[stock.symbol].price;
                }
              }
            });
          }
          return updatedYearData;
        });

        setAlertInfo({
          isOpen: true,
          title: '价格已更新',
          description: `股票价格已更新至最新数据（${new Date().toLocaleString()}）`,
          onConfirm: () => setAlertInfo(null),
        });
      }
    } catch (error) {
      console.error('刷新价格时出错:', error);
      setAlertInfo({
        isOpen: true,
        title: '更新失败',
        description: '获取最新价格时发生错误，请稍后再试',
        onConfirm: () => setAlertInfo(null),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 表格数据准备
  const prepareTableData = useCallback(() => {
    if (!yearData[selectedYear] || !yearData[selectedYear].stocks) return [];

    return yearData[selectedYear].stocks
      .filter(stock => !hiddenStocks[stock.name])
      .map(stock => {
        const currentValue = stock.shares * stock.price;
        const costValue = stock.shares * stock.costPrice;
        const profitLoss = currentValue - costValue;
        const profitLossPercentage = ((stock.price / stock.costPrice) - 1) * 100;

        return {
          ...stock,
          currentValue,
          costValue,
          profitLoss,
          profitLossPercentage
        };
      })
      .sort((a, b) => b.currentValue - a.currentValue);
  }, [yearData, selectedYear, hiddenStocks]);

  // 渲染函数
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">股票投资组合追踪</h1>
      
      {/* 年份选择区域 */}
      <div className="mb-6">
        <YearForm
          years={years}
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
          newYear={newYear}
          setNewYear={setNewYear}
          onAddYear={addNewYear}
        />
      </div>

      {/* 图表区域 */}
      <div className="mb-8">
        <Tabs defaultValue="line">
          <TabsList className="mb-4">
            <TabsTrigger value="line">投资趋势</TabsTrigger>
            <TabsTrigger value="bar">收益对比</TabsTrigger>
            <TabsTrigger value="pie">资产分布</TabsTrigger>
          </TabsList>
          <TabsContent value="line" className="h-80">
            <LineChartComponent 
              data={lineChartData()} 
              hiddenSeries={hiddenSeries}
              onLegendClick={handleLegendClick}
            />
          </TabsContent>
          <TabsContent value="bar" className="h-80">
            <BarChartComponent 
              data={prepareBarChartData()} 
            />
          </TabsContent>
          <TabsContent value="pie" className="h-80">
            <PieChartComponent 
              data={preparePieChartData()} 
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* 股票表格区域 */}
      <div className="mb-8 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4">股票持仓</h2>
        <div className="flex justify-between mb-4">
          <Button onClick={refreshPrices} disabled={isLoading}>
            {isLoading ? '更新中...' : '刷新价格'}
            <RefreshCw className="ml-2 h-4 w-4" />
          </Button>
          <div className="flex space-x-2">
            <Button onClick={handleCopyData}>导出数据</Button>
            <Button onClick={handlePasteData}>导入数据</Button>
          </div>
        </div>
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border">股票名称</th>
              <th className="py-2 px-4 border">代码</th>
              <th className="py-2 px-4 border">持有股数</th>
              <th className="py-2 px-4 border">成本价</th>
              <th className="py-2 px-4 border">当前价格</th>
              <th className="py-2 px-4 border">投资金额</th>
              <th className="py-2 px-4 border">当前价值</th>
              <th className="py-2 px-4 border">盈亏</th>
              <th className="py-2 px-4 border">盈亏比例</th>
              <th className="py-2 px-4 border">操作</th>
            </tr>
          </thead>
          <tbody>
            {prepareTableData().map((stock) => (
              <tr key={stock.id} className={hiddenStocks[stock.name] ? 'opacity-50' : ''}>
                <td className="py-2 px-4 border">
                  <div className="flex items-center">
                    <button 
                      onClick={() => toggleStockVisibility(stock.name)}
                      className="mr-2"
                    >
                      {hiddenStocks[stock.name] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    {stock.name}
                  </div>
                </td>
                <td className="py-2 px-4 border">{stock.symbol}</td>
                <td className="py-2 px-4 border">
                  {editingStockName === stock.name ? (
                    <Input
                      type="number"
                      value={editedRowData?.shares || ''}
                      onChange={(e) => setEditedRowData(prev => ({ ...prev!, shares: e.target.value }))}
                      className="w-24"
                    />
                  ) : (
                    formatLargeNumber(stock.shares)
                  )}
                </td>
                <td className="py-2 px-4 border">
                  {convertToCurrency(stock.costPrice, DEFAULT_CURRENCY)}
                </td>
                <td className="py-2 px-4 border">
                  {editingStockName === stock.name ? (
                    <Input
                      type="number"
                      value={editedRowData?.price || ''}
                      onChange={(e) => setEditedRowData(prev => ({ ...prev!, price: e.target.value }))}
                      className="w-24"
                    />
                  ) : (
                    convertToCurrency(stock.price, DEFAULT_CURRENCY)
                  )}
                </td>
                <td className="py-2 px-4 border">
                  {convertToCurrency(stock.costValue, DEFAULT_CURRENCY)}
                </td>
                <td className="py-2 px-4 border">
                  {convertToCurrency(stock.currentValue, DEFAULT_CURRENCY)}
                </td>
                <td className="py-2 px-4 border">
                  <span className={stock.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {convertToCurrency(stock.profitLoss, DEFAULT_CURRENCY)}
                  </span>
                </td>
                <td className="py-2 px-4 border">
                  <span className={stock.profitLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {stock.profitLossPercentage.toFixed(2)}%
                  </span>
                </td>
                <td className="py-2 px-4 border">
                  {editingStockName === stock.name ? (
                    <div className="flex space-x-2">
                      <Button onClick={() => handleSaveRow(stock.name)} size="sm">
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => setEditingStockName(null)} size="sm" variant="outline">
                        取消
                      </Button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <Button onClick={() => handleEditRow(stock.name)} size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => handleDeleteStock(stock.name)} size="sm" variant="outline" className="text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {yearData[selectedYear]?.stocks.length === 0 && (
              <tr>
                <td colSpan={10} className="py-4 text-center text-gray-500">
                  暂无股票数据
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-semibold">
              <td className="py-2 px-4 border" colSpan={5}>总计</td>
              <td className="py-2 px-4 border">
                {convertToCurrency(
                  prepareTableData().reduce((sum, stock) => sum + stock.costValue, 0),
                  DEFAULT_CURRENCY
                )}
              </td>
              <td className="py-2 px-4 border">
                {convertToCurrency(
                  prepareTableData().reduce((sum, stock) => sum + stock.currentValue, 0),
                  DEFAULT_CURRENCY
                )}
              </td>
              <td className="py-2 px-4 border">
                <span className={
                  prepareTableData().reduce((sum, stock) => sum + stock.profitLoss, 0) >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }>
                  {convertToCurrency(
                    prepareTableData().reduce((sum, stock) => sum + stock.profitLoss, 0),
                    DEFAULT_CURRENCY
                  )}
                </span>
              </td>
              <td className="py-2 px-4 border" colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 交易表单区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StockTransactionForm
          transactionType={transactionType}
          setTransactionType={setTransactionType}
          newStockName={newStockName}
          setNewStockName={setNewStockName}
          newShares={newShares}
          setNewShares={setNewShares}
          newPrice={newPrice}
          setNewPrice={setNewPrice}
          newYearEndPrice={newYearEndPrice}
          setNewYearEndPrice={setNewYearEndPrice}
          newStockSymbol={newStockSymbol}
          setNewStockSymbol={setNewStockSymbol}
          onAddStock={confirmAddNewStock}
          stockSymbols={stockSymbols}
        />
        
        <CashTransactionForm
          cashTransactionAmount={cashTransactionAmount}
          setCashTransactionAmount={setCashTransactionAmount}
          cashTransactionType={cashTransactionType}
          setCashTransactionType={setCashTransactionType}
          onAddCashTransaction={addCashTransaction}
        />
      </div>

      {/* 对话框组件 */}
      {alertInfo && (
        <AlertDialog
          isOpen={alertInfo.isOpen}
          title={alertInfo.title}
          description={alertInfo.description}
          onConfirm={alertInfo.onConfirm}
        />
      )}



      {isCopyDialogOpen && (
        <CopyPasteDialog
          isOpen={isCopyDialogOpen}
          onClose={() => setIsCopyDialogOpen(false)}
          title="导出数据"
          description="复制以下JSON数据以备份您的投资组合"
          data={JSON.stringify(yearData, null, 2)}
          mode="copy"
        />
      )}

      {isPasteDialogOpen && (
        <CopyPasteDialog
          isOpen={isPasteDialogOpen}
          onClose={() => setIsPasteDialogOpen(false)}
          title="导入数据"
          description="粘贴JSON数据以恢复您的投资组合"
          data={pasteData}
          setData={setPasteData}
          onConfirm={confirmPasteData}
          mode="paste"
        />
      )}
    </div>
  );
};
    fetchSymbols();
  }, []);

  useEffect(() => {
    const fetchLatestPrices = async () => {
      try {
        const url = `${getBasePath()}/data/prices.json`;
        const timestamp = new Date().getTime();
        const response = await fetch(`${url}?t=${timestamp}`);
        if (response.ok) {
          const data = await response.json();
          setPriceData(data);

          const rates: { [key: string]: number } = { USD: 1 };
          if (data['HKD']) rates['HKD'] = data['HKD'].price;
          if (data['CNY']) rates['CNY'] = data['CNY'].price;
          setExchangeRates(rates);

          const updatedYearData = updateStocksWithLatestPrices(yearData, latestYear, data, rates);
          setYearData(updatedYearData);
        }
      } catch (error) {
        console.error('获取最新价格时出错:', error);
      }
    };

  // 表格数据准备
  const prepareTableData = useCallback(() => {
    if (!yearData[selectedYear] || !yearData[selectedYear].stocks) return [];

    return yearData[selectedYear].stocks
      .filter(stock => !hiddenStocks[stock.name])
      .map(stock => {
        const currentValue = stock.shares * stock.price;
        const costValue = stock.shares * stock.costPrice;
        const profitLoss = currentValue - costValue;
        const profitLossPercentage = ((stock.price / stock.costPrice) - 1) * 100;

        return {
          ...stock,
          currentValue,
          costValue,
          profitLoss,
          profitLossPercentage
        };
      })
      .sort((a, b) => b.currentValue - a.currentValue);
  }, [yearData, selectedYear, hiddenStocks]);

  // 渲染函数
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">股票投资组合追踪</h1>
      
      {/* 年份选择区域 */}
      <div className="mb-6">
        <YearForm
          years={years}
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
          newYear={newYear}
          setNewYear={setNewYear}
          onAddYear={addNewYear}
        />
      </div>

      {/* 图表区域 */}
      <div className="mb-8">
        <Tabs defaultValue="line">
          <TabsList className="mb-4">
            <TabsTrigger value="line">投资趋势</TabsTrigger>
            <TabsTrigger value="bar">收益对比</TabsTrigger>
            <TabsTrigger value="pie">资产分布</TabsTrigger>
          </TabsList>
          <TabsContent value="line" className="h-80">
            <LineChartComponent 
              data={lineChartData()} 
              hiddenSeries={hiddenSeries}
              onLegendClick={handleLegendClick}
            />
          </TabsContent>
          <TabsContent value="bar" className="h-80">
            <BarChartComponent 
              data={prepareBarChartData()} 
            />
          </TabsContent>
          <TabsContent value="pie" className="h-80">
            <PieChartComponent 
              data={preparePieChartData()} 
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* 股票表格区域 */}
      <div className="mb-8 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4">股票持仓</h2>
        <div className="flex justify-between mb-4">
          <Button onClick={refreshPrices} disabled={isLoading}>
            {isLoading ? '更新中...' : '刷新价格'}
            <RefreshCw className="ml-2 h-4 w-4" />
          </Button>
          <div className="flex space-x-2">
            <Button onClick={handleCopyData}>导出数据</Button>
            <Button onClick={handlePasteData}>导入数据</Button>
          </div>
        </div>
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border">股票名称</th>
              <th className="py-2 px-4 border">代码</th>
              <th className="py-2 px-4 border">持有股数</th>
              <th className="py-2 px-4 border">成本价</th>
              <th className="py-2 px-4 border">当前价格</th>
              <th className="py-2 px-4 border">投资金额</th>
              <th className="py-2 px-4 border">当前价值</th>
              <th className="py-2 px-4 border">盈亏</th>
              <th className="py-2 px-4 border">盈亏比例</th>
              <th className="py-2 px-4 border">操作</th>
            </tr>
          </thead>
          <tbody>
            {prepareTableData().map((stock) => (
              <tr key={stock.id} className={hiddenStocks[stock.name] ? 'opacity-50' : ''}>
                <td className="py-2 px-4 border">
                  <div className="flex items-center">
                    <button 
                      onClick={() => toggleStockVisibility(stock.name)}
                      className="mr-2"
                    >
                      {hiddenStocks[stock.name] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    {stock.name}
                  </div>
                </td>
                <td className="py-2 px-4 border">{stock.symbol}</td>
                <td className="py-2 px-4 border">
                  {editingStockName === stock.name ? (
                    <Input
                      type="number"
                      value={editedRowData?.shares || ''}
                      onChange={(e) => setEditedRowData(prev => ({ ...prev!, shares: e.target.value }))}
                      className="w-24"
                    />
                  ) : (
                    formatLargeNumber(stock.shares)
                  )}
                </td>
                <td className="py-2 px-4 border">
                  {convertToCurrency(stock.costPrice, DEFAULT_CURRENCY)}
                </td>
                <td className="py-2 px-4 border">
                  {editingStockName === stock.name ? (
                    <Input
                      type="number"
                      value={editedRowData?.price || ''}
                      onChange={(e) => setEditedRowData(prev => ({ ...prev!, price: e.target.value }))}
                      className="w-24"
                    />
                  ) : (
                    convertToCurrency(stock.price, DEFAULT_CURRENCY)
                  )}
                </td>
                <td className="py-2 px-4 border">
                  {convertToCurrency(stock.costValue, DEFAULT_CURRENCY)}
                </td>
                <td className="py-2 px-4 border">
                  {convertToCurrency(stock.currentValue, DEFAULT_CURRENCY)}
                </td>
                <td className="py-2 px-4 border">
                  <span className={stock.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {convertToCurrency(stock.profitLoss, DEFAULT_CURRENCY)}
                  </span>
                </td>
                <td className="py-2 px-4 border">
                  <span className={stock.profitLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {stock.profitLossPercentage.toFixed(2)}%
                  </span>
                </td>
                <td className="py-2 px-4 border">
                  {editingStockName === stock.name ? (
                    <div className="flex space-x-2">
                      <Button onClick={() => handleSaveRow(stock.name)} size="sm">
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => setEditingStockName(null)} size="sm" variant="outline">
                        取消
                      </Button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <Button onClick={() => handleEditRow(stock.name)} size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => handleDeleteStock(stock.name)} size="sm" variant="outline" className="text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {yearData[selectedYear]?.stocks.length === 0 && (
              <tr>
                <td colSpan={10} className="py-4 text-center text-gray-500">
                  暂无股票数据
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-semibold">
              <td className="py-2 px-4 border" colSpan={5}>总计</td>
              <td className="py-2 px-4 border">
                {convertToCurrency(
                  prepareTableData().reduce((sum, stock) => sum + stock.costValue, 0),
                  DEFAULT_CURRENCY
                )}
              </td>
              <td className="py-2 px-4 border">
                {convertToCurrency(
                  prepareTableData().reduce((sum, stock) => sum + stock.currentValue, 0),
                  DEFAULT_CURRENCY
                )}
              </td>
              <td className="py-2 px-4 border">
                <span className={
                  prepareTableData().reduce((sum, stock) => sum + stock.profitLoss, 0) >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }>
                  {convertToCurrency(
                    prepareTableData().reduce((sum, stock) => sum + stock.profitLoss, 0),
                    DEFAULT_CURRENCY
                  )}
                </span>
              </td>
              <td className="py-2 px-4 border" colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 交易表单区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StockTransactionForm
          transactionType={transactionType}
          setTransactionType={setTransactionType}
          newStockName={newStockName}
          setNewStockName={setNewStockName}
          newShares={newShares}
          setNewShares={setNewShares}
          newPrice={newPrice}
          setNewPrice={setNewPrice}
          newYearEndPrice={newYearEndPrice}
          setNewYearEndPrice={setNewYearEndPrice}
          newStockSymbol={newStockSymbol}
          setNewStockSymbol={setNewStockSymbol}
          onAddStock={confirmAddNewStock}
          stockSymbols={stockSymbols}
        />
        
        <CashTransactionForm
          cashTransactionAmount={cashTransactionAmount}
          setCashTransactionAmount={setCashTransactionAmount}
          cashTransactionType={cashTransactionType}
          setCashTransactionType={setCashTransactionType}
          onAddCashTransaction={addCashTransaction}
        />
      </div>

      {/* 对话框组件 */}
      {alertInfo && (
        <AlertDialog
          isOpen={alertInfo.isOpen}
          title={alertInfo.title}
          description={alertInfo.description}
          onConfirm={alertInfo.onConfirm}
        />
      )}



      {isCopyDialogOpen && (
        <CopyPasteDialog
          isOpen={isCopyDialogOpen}
          onClose={() => setIsCopyDialogOpen(false)}
          title="导出数据"
          description="复制以下JSON数据以备份您的投资组合"
          data={JSON.stringify(yearData, null, 2)}
          mode="copy"
        />
      )}

      {isPasteDialogOpen && (
        <CopyPasteDialog
          isOpen={isPasteDialogOpen}
          onClose={() => setIsPasteDialogOpen(false)}
          title="导入数据"
          description="粘贴JSON数据以恢复您的投资组合"
          data={pasteData}
          setData={setPasteData}
          onConfirm={confirmPasteData}
          mode="paste"
        />
      )}
    </div>
  );
};
    fetchLatestPrices();
  }, []);

  // 刷新价格
  const refreshPrices = async () => {
    setIsLoading(true);
    try {
      const url = `${getBasePath()}/data/prices.json`;
      const timestamp = new Date().getTime();
      const response = await fetch(`${url}?t=${timestamp}`);
      if (response.ok) {
        const data = await response.json();
        setPriceData(data);

        const rates: { [key: string]: number } = { USD: 1 };
        if (data['HKD']) rates['HKD'] = data['HKD'].price;
        if (data['CNY']) rates['CNY'] = data['CNY'].price;
        setExchangeRates(rates);

        setYearData((prevYearData) => {
          const updatedYearData = { ...prevYearData };
          if (updatedYearData[selectedYear] && updatedYearData[selectedYear].stocks) {
            updatedYearData[selectedYear].stocks.forEach(stock => {
              if (stock.symbol && data[stock.symbol]) {
                if (stock.symbol.endsWith('.HK') && data[stock.symbol].hkdPrice) {
                  stock.price = data[stock.symbol].hkdPrice * rates['HKD'];
                } else {
                  stock.price = data[stock.symbol].price;
                }
              }
            });
          }
          return updatedYearData;
        });

        setAlertInfo({
          isOpen: true,
          title: '价格已更新',
          description: `股票价格已更新至最新数据（${new Date().toLocaleString()}）`,
          onConfirm: () => setAlertInfo(null),
        });
      }
    } catch (error) {
      console.error('刷新价格时出错:', error);
      setAlertInfo({
        isOpen: true,
        title: '更新失败',
        description: '获取最新价格时发生错误，请稍后再试',
        onConfirm: () => setAlertInfo(null),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 表格数据准备
  const prepareTableData = useCallback(() => {
    if (!yearData[selectedYear] || !yearData[selectedYear].stocks) return [];

    return yearData[selectedYear].stocks
      .filter(stock => !hiddenStocks[stock.name])
      .map(stock => {
        const currentValue = stock.shares * stock.price;
        const costValue = stock.shares * stock.costPrice;
        const profitLoss = currentValue - costValue;
        const profitLossPercentage = ((stock.price / stock.costPrice) - 1) * 100;

        return {
          ...stock,
          currentValue,
          costValue,
          profitLoss,
          profitLossPercentage
        };
      })
      .sort((a, b) => b.currentValue - a.currentValue);
  }, [yearData, selectedYear, hiddenStocks]);

  // 渲染函数
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">股票投资组合追踪</h1>
      
      {/* 年份选择区域 */}
      <div className="mb-6">
        <YearForm
          years={years}
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
          newYear={newYear}
          setNewYear={setNewYear}
          onAddYear={addNewYear}
        />
      </div>

      {/* 图表区域 */}
      <div className="mb-8">
        <Tabs defaultValue="line">
          <TabsList className="mb-4">
            <TabsTrigger value="line">投资趋势</TabsTrigger>
            <TabsTrigger value="bar">收益对比</TabsTrigger>
            <TabsTrigger value="pie">资产分布</TabsTrigger>
          </TabsList>
          <TabsContent value="line" className="h-80">
            <LineChartComponent 
              data={lineChartData()} 
              hiddenSeries={hiddenSeries}
              onLegendClick={handleLegendClick}
            />
          </TabsContent>
          <TabsContent value="bar" className="h-80">
            <BarChartComponent 
              data={prepareBarChartData()} 
            />
          </TabsContent>
          <TabsContent value="pie" className="h-80">
            <PieChartComponent 
              data={preparePieChartData()} 
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* 股票表格区域 */}
      <div className="mb-8 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4">股票持仓</h2>
        <div className="flex justify-between mb-4">
          <Button onClick={refreshPrices} disabled={isLoading}>
            {isLoading ? '更新中...' : '刷新价格'}
            <RefreshCw className="ml-2 h-4 w-4" />
          </Button>
          <div className="flex space-x-2">
            <Button onClick={handleCopyData}>导出数据</Button>
            <Button onClick={handlePasteData}>导入数据</Button>
          </div>
        </div>
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border">股票名称</th>
              <th className="py-2 px-4 border">代码</th>
              <th className="py-2 px-4 border">持有股数</th>
              <th className="py-2 px-4 border">成本价</th>
              <th className="py-2 px-4 border">当前价格</th>
              <th className="py-2 px-4 border">投资金额</th>
              <th className="py-2 px-4 border">当前价值</th>
              <th className="py-2 px-4 border">盈亏</th>
              <th className="py-2 px-4 border">盈亏比例</th>
              <th className="py-2 px-4 border">操作</th>
            </tr>
          </thead>
          <tbody>
            {prepareTableData().map((stock) => (
              <tr key={stock.id} className={hiddenStocks[stock.name] ? 'opacity-50' : ''}>
                <td className="py-2 px-4 border">
                  <div className="flex items-center">
                    <button 
                      onClick={() => toggleStockVisibility(stock.name)}
                      className="mr-2"
                    >
                      {hiddenStocks[stock.name] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    {stock.name}
                  </div>
                </td>
                <td className="py-2 px-4 border">{stock.symbol}</td>
                <td className="py-2 px-4 border">
                  {editingStockName === stock.name ? (
                    <Input
                      type="number"
                      value={editedRowData?.shares || ''}
                      onChange={(e) => setEditedRowData(prev => ({ ...prev!, shares: e.target.value }))}
                      className="w-24"
                    />
                  ) : (
                    formatLargeNumber(stock.shares)
                  )}
                </td>
                <td className="py-2 px-4 border">
                  {convertToCurrency(stock.costPrice, DEFAULT_CURRENCY)}
                </td>
                <td className="py-2 px-4 border">
                  {editingStockName === stock.name ? (
                    <Input
                      type="number"
                      value={editedRowData?.price || ''}
                      onChange={(e) => setEditedRowData(prev => ({ ...prev!, price: e.target.value }))}
                      className="w-24"
                    />
                  ) : (
                    convertToCurrency(stock.price, DEFAULT_CURRENCY)
                  )}
                </td>
                <td className="py-2 px-4 border">
                  {convertToCurrency(stock.costValue, DEFAULT_CURRENCY)}
                </td>
                <td className="py-2 px-4 border">
                  {convertToCurrency(stock.currentValue, DEFAULT_CURRENCY)}
                </td>
                <td className="py-2 px-4 border">
                  <span className={stock.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {convertToCurrency(stock.profitLoss, DEFAULT_CURRENCY)}
                  </span>
                </td>
                <td className="py-2 px-4 border">
                  <span className={stock.profitLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {stock.profitLossPercentage.toFixed(2)}%
                  </span>
                </td>
                <td className="py-2 px-4 border">
                  {editingStockName === stock.name ? (
                    <div className="flex space-x-2">
                      <Button onClick={() => handleSaveRow(stock.name)} size="sm">
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => setEditingStockName(null)} size="sm" variant="outline">
                        取消
                      </Button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <Button onClick={() => handleEditRow(stock.name)} size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => handleDeleteStock(stock.name)} size="sm" variant="outline" className="text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {yearData[selectedYear]?.stocks.length === 0 && (
              <tr>
                <td colSpan={10} className="py-4 text-center text-gray-500">
                  暂无股票数据
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-semibold">
              <td className="py-2 px-4 border" colSpan={5}>总计</td>
              <td className="py-2 px-4 border">
                {convertToCurrency(
                  prepareTableData().reduce((sum, stock) => sum + stock.costValue, 0),
                  DEFAULT_CURRENCY
                )}
              </td>
              <td className="py-2 px-4 border">
                {convertToCurrency(
                  prepareTableData().reduce((sum, stock) => sum + stock.currentValue, 0),
                  DEFAULT_CURRENCY
                )}
              </td>
              <td className="py-2 px-4 border">
                <span className={
                  prepareTableData().reduce((sum, stock) => sum + stock.profitLoss, 0) >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }>
                  {convertToCurrency(
                    prepareTableData().reduce((sum, stock) => sum + stock.profitLoss, 0),
                    DEFAULT_CURRENCY
                  )}
                </span>
              </td>
              <td className="py-2 px-4 border" colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 交易表单区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StockTransactionForm
          transactionType={transactionType}
          setTransactionType={setTransactionType}
          newStockName={newStockName}
          setNewStockName={setNewStockName}
          newShares={newShares}
          setNewShares={setNewShares}
          newPrice={newPrice}
          setNewPrice={setNewPrice}
          newYearEndPrice={newYearEndPrice}
          setNewYearEndPrice={setNewYearEndPrice}
          newStockSymbol={newStockSymbol}
          setNewStockSymbol={setNewStockSymbol}
          onAddStock={confirmAddNewStock}
          stockSymbols={stockSymbols}
        />
        
        <CashTransactionForm
          cashTransactionAmount={cashTransactionAmount}
          setCashTransactionAmount={setCashTransactionAmount}
          cashTransactionType={cashTransactionType}
          setCashTransactionType={setCashTransactionType}
          onAddCashTransaction={addCashTransaction}
        />
      </div>

      {/* 对话框组件 */}
      {alertInfo && (
        <AlertDialog
          isOpen={alertInfo.isOpen}
          title={alertInfo.title}
          description={alertInfo.description}
          onConfirm={alertInfo.onConfirm}
        />
      )}



      {isCopyDialogOpen && (
        <CopyPasteDialog
          isOpen={isCopyDialogOpen}
          onClose={() => setIsCopyDialogOpen(false)}
          title="导出数据"
          description="复制以下JSON数据以备份您的投资组合"
          data={JSON.stringify(yearData, null, 2)}
          mode="copy"
        />
      )}

      {isPasteDialogOpen && (
        <CopyPasteDialog
          isOpen={isPasteDialogOpen}
          onClose={() => setIsPasteDialogOpen(false)}
          title="导入数据"
          description="粘贴JSON数据以恢复您的投资组合"
          data={pasteData}
          setData={setPasteData}
          onConfirm={confirmPasteData}
          mode="paste"
        />
      )}
    </div>
  );
};
