"use client";
import React, { useState, useEffect, useCallback } from 'react';
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
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Trash2, Edit, Save, RefreshCw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface Stock {
    name: string;
    shares: number;
    price: number;
    costPrice: number;
    id: string;
    totalCost: number; // 记录买入总金额
    symbol?: string; // 股票代码
}

interface CashTransaction {
    amount: number;
    type: 'deposit' | 'withdraw' | 'buy' | 'sell';
    date: string;
    stockName?: string; // 对于股票交易，记录股票名称
}

interface StockTransaction {
    stockName: string;
    type: 'buy' | 'sell';
    shares: number;
    price: number;
    date: string;
}

interface YearData {
    stocks: Stock[];
    cashTransactions: CashTransaction[];
    stockTransactions: StockTransaction[];
    cashBalance: number;
}

interface StockSymbol {
    symbol: string;
    name: string;
}

interface PriceData {
    [symbol: string]: {
        price: number;
        name: string;
        lastUpdated: string;
    };
}

const StockPortfolioTracker: React.FC = () => {
    const initialData: { [year: string]: YearData } = {
        '2022': {
            stocks: [
                { name: '阿里巴巴', shares: 100, price: 85.5, costPrice: 80.0, id: '1', totalCost: 8000, symbol: 'BABA' },
                { name: '腾讯', shares: 50, price: 320.8, costPrice: 300.0, id: '2', totalCost: 15000, symbol: '0700.HK' },
            ],
            cashTransactions: [{ amount: 100000, type: 'deposit', date: '2022-01-01' }],
            stockTransactions: [],
            cashBalance: 100000,
        },
        '2023': {
            stocks: [
                { name: '阿里巴巴', shares: 150, price: 92.3, costPrice: 85.0, id: '4', totalCost: 12750, symbol: 'BABA' },
                { name: '腾讯', shares: 60, price: 310.5, costPrice: 305.0, id: '5', totalCost: 18300, symbol: '0700.HK' },
            ],
            cashTransactions: [{ amount: 50000, type: 'deposit', date: '2023-01-01' }],
            stockTransactions: [],
            cashBalance: 150000,
        },
        '2024': {
            stocks: [
                { name: '阿里巴巴', shares: 180, price: 105.2, costPrice: 90.0, id: '8', totalCost: 16200, symbol: 'BABA' },
                { name: '腾讯', shares: 75, price: 350.4, costPrice: 310.0, id: '9', totalCost: 23250, symbol: '0700.HK' },
            ],
            cashTransactions: [{ amount: 20000, type: 'deposit', date: '2024-01-01' }],
            stockTransactions: [],
            cashBalance: 170000,
        },
    };

    const [yearData, setYearData] = useState<{ [year: string]: YearData }>(initialData);
    const [years, setYears] = useState<string[]>(Object.keys(initialData));
    const [newYear, setNewYear] = useState('');
    const [newStockName, setNewStockName] = useState('');
    const [newShares, setNewShares] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [newYearEndPrice, setNewYearEndPrice] = useState('');
    const [newStockSymbol, setNewStockSymbol] = useState('');
    const [selectedYear, setSelectedYear] = useState(years[years.length - 1]);
    const [showPositionChart, setShowPositionChart] = useState(true);
    const [editingStockName, setEditingStockName] = useState<string | null>(null);
    const [editedRowData, setEditedRowData] = useState<{
        [year: string]: { quantity: string; unitPrice: string; costPrice: string; symbol?: string };
    } | null>(null);
    const [hiddenSeries, setHiddenSeries] = useState<{ [dataKey: string]: boolean }>({});
    const [alertInfo, setAlertInfo] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm?: () => void;
        onCancel?: () => void;
    } | null>(null);
    const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');
    const [cashTransactionAmount, setCashTransactionAmount] = useState('');
    const [cashTransactionType, setCashTransactionType] = useState<'deposit' | 'withdraw'>('deposit');
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
    const [selectedReportYear, setSelectedReportYear] = useState<string | null>(null);
    const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
    const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);
    const [pasteData, setPasteData] = useState('');
    const [stockSymbols, setStockSymbols] = useState<StockSymbol[]>([]);
    const [priceData, setPriceData] = useState<PriceData>({});
    const [isLoading, setIsLoading] = useState(false);
    const [debugInfo, setDebugInfo] = useState<string>('');

    const latestYear = Math.max(...years.map(Number)).toString();

    // 获取基础路径
    const getBasePath = () => {
        if (typeof window !== 'undefined') {
            // Now it's safe to use window
            if (window.location.hostname.includes('github.io')) {
                return '/StockPulse';
            }
        }
        return '';
    };

    // 获取股票符号列表
    useEffect(() => {
        const fetchSymbols = async () => {
            try {
                const url = `${getBasePath()}/data/symbols.json`;
                setDebugInfo(prev => prev + `\n尝试获取股票符号数据：${url}`);

                const response = await fetch(url);
                setDebugInfo(prev => prev + `\n股票符号响应状态：${response.status}`);

                if (response.ok) {
                    const data = await response.json();
                    setStockSymbols(data.stocks || []);
                    setDebugInfo(prev => prev + `\n成功获取${data.stocks?.length || 0}个股票符号`);
                }
            } catch (error) {
                console.error('获取股票符号失败:', error);
                setDebugInfo(prev => prev + `\n获取股票符号失败: ${error}`);
            }
        };

        fetchSymbols();
    }, []);

    // 获取最新价格
    useEffect(() => {
        const fetchLatestPrices = async () => {
            try {
                const url = `${getBasePath()}/data/prices.json`;
                setDebugInfo(prev => prev + `\n尝试获取价格数据：${url}`);

                // 添加时间戳防止缓存
                const timestamp = new Date().getTime();
                const response = await fetch(`${url}?t=${timestamp}`);
                setDebugInfo(prev => prev + `\n价格数据响应状态：${response.status}`);

                if (response.ok) {
                    const data = await response.json();
                    setDebugInfo(prev => prev + `\n成功获取价格数据，包含${Object.keys(data).length}个股票`);
                    setPriceData(data);

                    // 自动更新最新年份的股票价格
                    updateLatestPrices(data);
                } else {
                    setDebugInfo(prev => prev + `\n获取价格数据失败: ${response.status}`);
                }
            } catch (error) {
                console.error('获取最新价格时出错:', error);
                setDebugInfo(prev => prev + `\n获取最新价格时出错: ${error}`);
            }
        };

        fetchLatestPrices();
    }, []);

    const updateLatestPrices = (prices: PriceData) => {
        setYearData((prevYearData) => {
            const updatedYearData = { ...prevYearData };

            // 只更新最新年份的价格
            updatedYearData[latestYear].stocks.forEach(stock => {
                if (stock.symbol && prices[stock.symbol]) {
                    stock.price = prices[stock.symbol].price;
                }
            });

            return updatedYearData;
        });
    };

    const refreshPrices = async () => {
        setIsLoading(true);
        setDebugInfo('开始刷新价格...');
        try {
            const url = `${getBasePath()}/data/prices.json`;
            setDebugInfo(prev => prev + `\n尝试获取价格数据：${url}`);

            // 添加时间戳防止缓存
            const timestamp = new Date().getTime();
            const response = await fetch(`${url}?t=${timestamp}`);
            setDebugInfo(prev => prev + `\n价格数据响应状态：${response.status}`);

            if (response.ok) {
                const data = await response.json();
                setDebugInfo(prev => prev + `\n成功获取价格数据，包含${Object.keys(data).length}个股票`);
                setPriceData(data);

                setYearData((prevYearData) => {
                    const updatedYearData = { ...prevYearData };

                    // 更新当前选中年份的股票价格
                    updatedYearData[selectedYear].stocks.forEach(stock => {
                        if (stock.symbol && data[stock.symbol]) {
                            stock.price = data[stock.symbol].price;
                            setDebugInfo(prev => prev + `\n更新 ${stock.name} (${stock.symbol}) 价格为 ${data[stock.symbol].price}`);
                        }
                    });

                    return updatedYearData;
                });

                // 获取当前时间作为更新时间
                const updateTime = new Date().toLocaleString();

                setAlertInfo({
                    isOpen: true,
                    title: '价格已更新',
                    description: `股票价格已更新至最新数据（${updateTime}）`,
                    onCancel: () => setAlertInfo(null),
                });
            } else {
                throw new Error(`获取价格数据失败: ${response.status}`);
            }
        } catch (error) {
            console.error('刷新价格时出错:', error);
            setDebugInfo(prev => prev + `\n刷新价格时出错: ${error}`);
            setAlertInfo({
                isOpen: true,
                title: '更新失败',
                description: '获取最新价格时发生错误，请稍后再试',
                onCancel: () => setAlertInfo(null),
            });
        } finally {
            setIsLoading(false);
        }
    };

    // 直接从API获取股票价格（备用方案）
    const fetchStockPrice = async (symbol) => {
        try {
            setDebugInfo(prev => prev + `\n尝试直接从Yahoo Finance API获取 ${symbol} 价格`);
            const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`);

            if (response.ok) {
                const data = await response.json();
                if (data.chart && data.chart.result && data.chart.result[0] && data.chart.result[0].meta) {
                    const price = data.chart.result[0].meta.regularMarketPrice;
                    setDebugInfo(prev => prev + `\n成功获取 ${symbol} 价格：${price}`);
                    return price;
                }
            }
            setDebugInfo(prev => prev + `\nAPI请求失败: ${response.status}`);
            return null;
        } catch (error) {
            console.error(`获取 ${symbol} 价格出错:`, error);
            setDebugInfo(prev => prev + `\n获取 ${symbol} 价格出错: ${error}`);
            return null;
        }
    };

    // 直接从API更新价格（备用方案）
    const refreshPricesFromAPI = async () => {
        setIsLoading(true);
        setDebugInfo('开始从API刷新价格...');
        try {
            // 更新当前选中年份的股票价格
            const updatedYearData = { ...yearData };
            const stocksToUpdate = updatedYearData[selectedYear].stocks;

            for (const stock of stocksToUpdate) {
                if (stock.symbol) {
                    const price = await fetchStockPrice(stock.symbol);
                    if (price !== null) {
                        stock.price = price;

                        // 同时更新priceData
                        setPriceData(prev => ({
                            ...prev,
                            [stock.symbol]: {
                                price,
                                name: stock.name,
                                lastUpdated: new Date().toISOString().split('T')[0]
                            }
                        }));
                    }
                }
            }

            setYearData(updatedYearData);

            setAlertInfo({
                isOpen: true,
                title: '价格已更新',
                description: `股票价格已从API直接更新（${new Date().toLocaleString()}）`,
                onCancel: () => setAlertInfo(null),
            });
        } catch (error) {
            console.error('从API刷新价格时出错:', error);
            setDebugInfo(prev => prev + `\n从API刷新价格时出错: ${error}`);
            setAlertInfo({
                isOpen: true,
                title: '更新失败',
                description: '从API获取最新价格时发生错误，请稍后再试',
                onCancel: () => setAlertInfo(null),
            });
        } finally {
            setIsLoading(false);
        }
    };

    const calculateYearlyValues = useCallback(() => {
        const yearlyValues: {
            [year: string]: { [stockName: string]: number; 总计: number };
        } = {};
        Object.keys(yearData).forEach((year) => {
            yearlyValues[year] = {};
            let yearTotal = 0;
            yearData[year].stocks.forEach((stock) => {
                const value = stock.shares * stock.price;
                yearlyValues[year][stock.name] = value;
                yearTotal += value;
            });
            yearlyValues[year]['总计'] = yearTotal;
        });
        return yearlyValues;
    }, [yearData]);

    const calculateTotalValues = useCallback(() => {
        const totalValues: { [year: string]: number } = {};
        Object.keys(yearData).forEach((year) => {
            const stockValue = yearData[year].stocks.reduce((acc, stock) => acc + stock.shares * stock.price, 0);
            totalValues[year] = stockValue + yearData[year].cashBalance;
        });
        return totalValues;
    }, [yearData]);

    const prepareLineChartData = useCallback(() => {
        const yearlyValues = calculateYearlyValues();
        const latestStocks = new Set(yearData[latestYear].stocks.map((stock) => stock.name));
        const allStocks = new Set<string>();
        Object.values(yearData).forEach((yearDataItem) => {
            yearDataItem.stocks.forEach((stock) => {
                if (latestStocks.has(stock.name)) {
                    allStocks.add(stock.name);
                }
            });
        });
        return Object.keys(yearData).map((year) => {
            const dataPoint: { [key: string]: string | number } = { year };
            allStocks.forEach((stockName) => {
                dataPoint[stockName] = yearlyValues[year][stockName] || 0;
            });
            dataPoint['总计'] = yearlyValues[year]['总计'];
            return dataPoint;
        });
    }, [calculateYearlyValues, yearData, latestYear]);

    const prepareBarChartData = useCallback(() => {
        const latestStocks = new Set(yearData[latestYear].stocks.map((stock) => stock.name));
        const result: { name: string;[year: string]: number }[] = [];
        latestStocks.forEach((stockName) => {
            const stockData: { name: string;[year: string]: number } = { name: stockName };
            Object.keys(yearData).forEach((year) => {
                const stockInYear = yearData[year].stocks.find((s) => s.name === stockName);
                stockData[year] = stockInYear ? stockInYear.price : 0;
            });
            result.push(stockData);
        });
        return result;
    }, [yearData, latestYear]);

    const addNewYear = () => {
        const trimmedYear = newYear.trim();
        if (trimmedYear && !years.includes(trimmedYear)) {
            const newYearDataItem: YearData = { stocks: [], cashTransactions: [], stockTransactions: [], cashBalance: 0 };
            setYearData({ ...yearData, [trimmedYear]: newYearDataItem });
            setYears([...years, trimmedYear]);
            setNewYear('');
            setSelectedYear(trimmedYear);
        }
    };

    const addCashTransaction = () => {
        if (!cashTransactionAmount || !selectedYear) return;

        const amount = parseFloat(cashTransactionAmount);
        if (isNaN(amount)) return;

        const updatedYearData = { ...yearData };
        const cashTransaction: CashTransaction = {
            amount: cashTransactionType === 'deposit' ? amount : -amount,
            type: cashTransactionType,
            date: new Date().toISOString().split('T')[0],
        };

        updatedYearData[selectedYear].cashTransactions.push(cashTransaction);
        updatedYearData[selectedYear].cashBalance += cashTransaction.amount;

        setYearData(updatedYearData);
        setCashTransactionAmount('');
    };

    const confirmAddNewStock = () => {
        if (!newStockName || !newShares || !newPrice || !selectedYear) return;

        const stockName = newStockName.trim();
        const transactionShares = parseInt(newShares, 10);
        const transactionPrice = parseFloat(newPrice);
        const yearEndPrice = newYearEndPrice ? parseFloat(newYearEndPrice) : null;
        const stockSymbol = newStockSymbol.trim();

        if (isNaN(transactionShares) || isNaN(transactionPrice)) return;

        const updatedYearData = { ...yearData };
        if (!updatedYearData[selectedYear]) {
            updatedYearData[selectedYear] = { stocks: [], cashTransactions: [], stockTransactions: [], cashBalance: 0 };
        }

        const currentStock = updatedYearData[selectedYear].stocks.find((s) => s.name === stockName);
        const oldShares = currentStock ? currentStock.shares : 0;
        const oldTotalCost = currentStock ? currentStock.totalCost : 0;

        let newSharesValue, newTotalCost, newCostPrice, transactionCost;

        if (transactionType === 'buy') {
            newSharesValue = oldShares + transactionShares;
            transactionCost = transactionShares * transactionPrice;
            newTotalCost = oldTotalCost + transactionCost;
            newCostPrice = newSharesValue > 0 ? newTotalCost / newSharesValue : 0;
            if (updatedYearData[selectedYear].cashBalance < transactionCost) {
                setAlertInfo({
                    isOpen: true,
                    title: '现金不足',
                    description: '购买股票的现金不足，现金余额将变为负数',
                    onConfirm: () => {
                        updatedYearData[selectedYear].cashBalance -= transactionCost;
                        updateStock(
                            updatedYearData,
                            selectedYear,
                            stockName,
                            newSharesValue,
                            yearEndPrice || transactionPrice,
                            newCostPrice,
                            newTotalCost,
                            transactionShares,
                            transactionPrice,
                            transactionType,
                            stockSymbol
                        );
                        setYearData(updatedYearData);
                        resetForm();
                        setAlertInfo(null);
                    },
                    onCancel: () => setAlertInfo(null),
                });
                return;
            } else {
                // 不直接更新现金余额，等待确认
            }
        } else if (transactionType === 'sell') {
            if (transactionShares > oldShares) {
                setAlertInfo({
                    isOpen: true,
                    title: '卖出失败',
                    description: '卖出股数超过持有股数',
                    onCancel: () => setAlertInfo(null),
                });
                return;
            }
            newSharesValue = oldShares - transactionShares;
            transactionCost = transactionShares * transactionPrice;
            newTotalCost = oldTotalCost - transactionCost;
            newCostPrice = newSharesValue > 0 ? newTotalCost / newSharesValue : 0;
            // 不直接更新现金余额，等待确认
        }

        const displayYearEndPrice = yearEndPrice !== null
            ? yearEndPrice
            : (currentStock ? currentStock.price : transactionPrice);
        const displayYearEndPriceText = yearEndPrice !== null
            ? displayYearEndPrice.toFixed(2)
            : `${displayYearEndPrice.toFixed(2)}（未填入）`;

        const oldCostPrice = currentStock ? currentStock.costPrice : 0;

        const description = `
      股票: ${stockName}
      交易类型: ${transactionType === 'buy' ? '买入' : '卖出'}
      股数: ${transactionShares}
      交易价格: ${transactionPrice.toFixed(2)}
      当前价格: ${displayYearEndPriceText}
      原成本价: ${oldCostPrice.toFixed(2)}
      新成本价: ${newCostPrice.toFixed(2)}
      ${stockSymbol ? `股票代码: ${stockSymbol}` : ''}
    `;

        setAlertInfo({
            isOpen: true,
            title: '确认交易',
            description,
            onConfirm: () => {
                // 在确认时更新现金余额
                if (transactionType === 'buy') {
                    updatedYearData[selectedYear].cashBalance -= transactionCost;
                } else if (transactionType === 'sell') {
                    updatedYearData[selectedYear].cashBalance += transactionCost;
                }
                updateStock(
                    updatedYearData,
                    selectedYear,
                    stockName,
                    newSharesValue,
                    displayYearEndPrice,
                    newCostPrice,
                    newTotalCost,
                    transactionShares,
                    transactionPrice,
                    transactionType,
                    stockSymbol
                );
                setYearData(updatedYearData);
                resetForm();
                setAlertInfo(null);
            },
            onCancel: () => {
                setAlertInfo(null);
            },
        });
    };

    const updateStock = (
        updatedYearData: { [year: string]: YearData },
        year: string,
        stockName: string,
        shares: number,
        price: number,
        costPrice: number,
        totalCost: number,
        transactionShares: number,
        transactionPrice: number,
        transactionType: 'buy' | 'sell',
        symbol?: string
    ) => {
        const stockIndex = updatedYearData[year].stocks.findIndex((s) => s.name === stockName);
        if (stockIndex !== -1) {
            updatedYearData[year].stocks[stockIndex] = {
                ...updatedYearData[year].stocks[stockIndex],
                shares,
                price,
                costPrice,
                totalCost,
                symbol: symbol || updatedYearData[year].stocks[stockIndex].symbol
            };
        } else {
            updatedYearData[year].stocks.push({
                name: stockName,
                shares,
                price,
                costPrice,
                id: uuidv4(),
                totalCost,
                symbol
            });
        }

        // 记录股票交易
        const stockTransaction: StockTransaction = {
            stockName,
            type: transactionType,
            shares: transactionShares,
            price: transactionPrice,
            date: new Date().toISOString().split('T')[0],
        };
        updatedYearData[year].stockTransactions.push(stockTransaction);

        // 记录现金变化
        const cashTransaction: CashTransaction = {
            amount: transactionType === 'buy' ? -transactionShares * transactionPrice : transactionShares * transactionPrice,
            type: transactionType,
            date: new Date().toISOString().split('T')[0],
            stockName,
        };
        updatedYearData[year].cashTransactions.push(cashTransaction);
    };

    const resetForm = () => {
        setNewStockName('');
        setNewShares('');
        setNewPrice('');
        setNewYearEndPrice('');
        setNewStockSymbol('');
        setTransactionType('buy');
    };

    const handleEditRow = (stockName: string) => {
        setEditingStockName(stockName);
        const initialEditedData: {
            [year: string]: { quantity: string; unitPrice: string; costPrice: string; symbol?: string };
        } = {};
        years.forEach((year) => {
            const stock = yearData[year]?.stocks.find((s) => s.name === stockName);
            initialEditedData[year] = {
                quantity: stock?.shares?.toString() || '',
                unitPrice: stock?.price?.toString() || '',
                costPrice: stock?.costPrice?.toString() || '',
                symbol: stock?.symbol || ''
            };
        });
        setEditedRowData(initialEditedData);
    };

    const handleSaveRow = (stockName: string) => {
        setYearData((prevYearData) => {
            const updatedYearData: { [year: string]: YearData } = { ...prevYearData };
            if (!editedRowData) return updatedYearData;

            years.forEach((year) => {
                const editedInfo = editedRowData[year];
                if (!editedInfo) return;

                const shares = parseInt(editedInfo.quantity, 10);
                const price = parseFloat(editedInfo.unitPrice);
                const costPrice = parseFloat(editedInfo.costPrice);
                const symbol = editedInfo.symbol;

                if (!isNaN(shares) && !isNaN(price) && !isNaN(costPrice)) {
                    const stockIndex = updatedYearData[year].stocks.findIndex((s) => s.name === stockName);
                    if (stockIndex !== -1) {
                        updatedYearData[year].stocks[stockIndex] = {
                            ...updatedYearData[year].stocks[stockIndex],
                            shares,
                            price,
                            costPrice,
                            totalCost: shares * costPrice,
                            symbol
                        };
                    } else {
                        updatedYearData[year].stocks.push({
                            name: stockName,
                            shares,
                            price,
                            costPrice,
                            id: uuidv4(),
                            totalCost: shares * costPrice,
                            symbol
                        });
                    }
                } else {
                    updatedYearData[year].stocks = updatedYearData[year].stocks.filter((s) => s.name !== stockName);
                }
            });
            return updatedYearData;
        });
        setEditingStockName(null);
        setEditedRowData(null);
    };

    const handleInputChange = (
        year: string,
        field: 'quantity' | 'unitPrice' | 'costPrice' | 'symbol',
        value: string
    ) => {
        if (editingStockName && editedRowData) {
            setEditedRowData((prev) => ({
                ...prev,
                [year]: { ...prev[year], [field]: value },
            }));
        }
    };

    const handleDeleteStock = (stockName: string) => {
        setYearData((prevYearData) => {
            const updatedYearData: { [year: string]: YearData } = {};
            Object.keys(prevYearData).forEach((year) => {
                updatedYearData[year] = {
                    ...prevYearData[year],
                    stocks: prevYearData[year].stocks.filter((stock) => stock.name !== stockName),
                };
            });
            return updatedYearData;
        });
    };

    const tableData = useCallback(() => {
        const stockSet = new Set<string>();
        Object.values(yearData).forEach((yearDataItem) => {
            yearDataItem.stocks.forEach((stock) => stockSet.add(stock.name));
        });
        const stockNames = Array.from(stockSet);
        stockNames.sort((a, b) => {
            const stockA = yearData[latestYear].stocks.find((s) => s.name === a);
            const stockB = yearData[latestYear].stocks.find((s) => s.name === b);
            const valueA = stockA ? stockA.shares * stockA.price : 0;
            const valueB = stockB ? stockB.shares * stockB.price : 0;
            return valueB - valueA;
        });
        const headers = ['股票名称', ...years, '操作'];
        const rows = stockNames.map((stockName) => {
            const row: (string | { shares: number; price: number; costPrice: number; symbol?: string } | null)[] = [stockName];
            years.forEach((year) => {
                const stockInYear = yearData[year].stocks.find((s) => s.name === stockName);
                row.push(
                    stockInYear
                        ? {
                            shares: stockInYear.shares,
                            price: stockInYear.price,
                            costPrice: stockInYear.costPrice,
                            symbol: stockInYear.symbol
                        }
                        : null
                );
            });
            row.push(null);
            return row;
        });
        const totalRow = ['总计', ...years.map(() => null), null];
        return { headers, rows, totalRow };
    }, [yearData, years, latestYear]);

    const formatLargeNumber = (num: number) => {
        return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(num);
    };

    const lineChartData = prepareLineChartData();
    const barChartData = prepareBarChartData();
    const totalValues = calculateTotalValues();
    const table = tableData();

    const handleLegendClick = (data: { dataKey: string }) => {
        const key = data.dataKey;
        setHiddenSeries((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    useEffect(() => {
        localStorage.setItem('stockPortfolioData', JSON.stringify(yearData));
        localStorage.setItem('stockPortfolioYears', JSON.stringify(years));
        localStorage.setItem('stockPortfolioSelectedYear', selectedYear);
    }, [yearData, years, selectedYear]);

    useEffect(() => {
        const savedData = localStorage.getItem('stockPortfolioData');
        const savedYears = localStorage.getItem('stockPortfolioYears');
        const savedSelectedYear = localStorage.getItem('stockPortfolioSelectedYear');

        if (savedData) setYearData(JSON.parse(savedData));
        if (savedYears) setYears(JSON.parse(savedYears));
        if (savedSelectedYear) setSelectedYear(savedSelectedYear);
    }, []);

    const handleReportClick = (year: string) => {
        setSelectedReportYear(year);
        setIsReportDialogOpen(true);
    };

    const calculateCumulativeInvested = (year: string) => {
        let cumulativeInvested = 0;
        const sortedYears = [...years].sort();
        for (const y of sortedYears) {
            if (y > year) break;
            const yearDataItem = yearData[y];
            cumulativeInvested += yearDataItem.cashTransactions.reduce(
                (acc, tx) => acc + (tx.type === 'deposit' ? tx.amount : tx.type === 'withdraw' ? -tx.amount : 0),
                0
            );
        };
        return cumulativeInvested;
    };

    const renderReportDialog = () => {
        if (!selectedReportYear) return null;

        const yearDataItem = yearData[selectedReportYear];
        const stockValue = yearDataItem.stocks.reduce((acc, stock) => acc + stock.shares * stock.price, 0);
        const totalPortfolioValue = stockValue + yearDataItem.cashBalance;
        const yearlyInvested = yearDataItem.cashTransactions.reduce(
            (acc, tx) => acc + (tx.type === 'deposit' ? tx.amount : tx.type === 'withdraw' ? -tx.amount : 0),
            0
        );
        const cumulativeInvested = calculateCumulativeInvested(selectedReportYear);
        const growth = totalPortfolioValue - cumulativeInvested;
        const growthRate = cumulativeInvested > 0 ? (growth / cumulativeInvested) * 100 : 0;

        return (
            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedReportYear}年详细报表</DialogTitle>
                        <DialogDescription>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold">现金变化历史</h3>
                                    <ul>
                                        {yearDataItem.cashTransactions.map((tx, index) => {
                                            const isIncrease = tx.type === 'deposit' || tx.type === 'sell';
                                            const colorClass = isIncrease ? 'text-green-500' : 'text-red-500';
                                            const description = tx.type === 'deposit' ? '存入' : tx.type === 'withdraw' ? '取出' : tx.type === 'buy' ? `买入${tx.stockName}` : `卖出${tx.stockName}`;
                                            return (
                                                <li key={index} className={colorClass}>
                                                    {tx.date}: {description} {formatLargeNumber(Math.abs(tx.amount))}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-semibold">股票买卖历史</h3>
                                    <ul>
                                        {yearDataItem.stockTransactions.map((tx, index) => (
                                            <li key={index}>
                                                {tx.date}: {tx.type === 'buy' ? '买入' : '卖出'} {tx.stockName} {tx.shares}股，价格 {tx.price.toFixed(2)}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-semibold">当年总持仓</h3>
                                    <p>¥{formatLargeNumber(totalPortfolioValue)} (股票: ¥{formatLargeNumber(stockValue)}, 现金: ¥{formatLargeNumber(yearDataItem.cashBalance)})</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold">累计投入现金</h3>
                                    <p>当年: ¥{formatLargeNumber(yearlyInvested)}, 历史累计: ¥{formatLargeNumber(cumulativeInvested)}</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold">投资增长（有记录以来）</h3>
                                    <ul>
                                        <li>总持仓金额: ¥{formatLargeNumber(totalPortfolioValue)}</li>
                                        <li>历史累计投入: ¥{formatLargeNumber(cumulativeInvested)}</li>
                                        <li>赚的金额: ¥{formatLargeNumber(growth)}</li>
                                        <li>成长比例: {growthRate.toFixed(2)}%</li>
                                    </ul>
                                </div>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <Button onClick={() => setIsReportDialogOpen(false)}>关闭</Button>
                </DialogContent>
            </Dialog>
        );
    };

    const handleCopyData = () => {
        setIsCopyDialogOpen(true);
    };

    const handlePasteData = () => {
        setIsPasteDialogOpen(true);
    };

    const confirmPasteData = () => {
        try {
            const pastedData = JSON.parse(pasteData);
            setYearData(pastedData);
            setYears(Object.keys(pastedData));
            setSelectedYear(Object.keys(pastedData)[Object.keys(pastedData).length - 1]);
            setAlertInfo({
                isOpen: true,
                title: '粘贴成功',
                description: '数据已成功粘贴并更新',
                onCancel: () => setAlertInfo(null),
            });
            setIsPasteDialogOpen(false);
            setPasteData('');
        } catch (e) {
            setAlertInfo({
                isOpen: true,
                title: '粘贴失败',
                description: '粘贴的数据格式不正确',
                onCancel: () => setAlertInfo(null),
            });
        }
    };

    return (
        <div className="p-4 max-w-6xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold text-center">股票投资组合追踪工具</h1>

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
                        <Select onValueChange={setSelectedYear} value={selectedYear}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="选择年份" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((year) => (
                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">添加/更新现金数量 ({selectedYear}年)</h2>
                    <div className="flex gap-2">
                        <Select
                            onValueChange={(value) => setCashTransactionType(value as 'deposit' | 'withdraw')}
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
                        <Button onClick={addCashTransaction}>添加现金操作</Button>
                    </div>
                    <p
                        className={cn(
                            'text-sm mt-2',
                            yearData[selectedYear].cashBalance < 0 ? 'text-red-500' : 'text-green-500'
                        )}
                    >
                        现金余额: ¥{formatLargeNumber(yearData[selectedYear].cashBalance)}
                    </p>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">添加/更新股票 ({selectedYear}年)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                        <Input
                            type="text"
                            placeholder="股票名称"
                            value={newStockName}
                            onChange={(e) => setNewStockName(e.target.value)}
                            list="stockNameList"
                        />
                        <datalist id="stockNameList">
                            {stockSymbols.map((item) => (
                                <option key={item.symbol} value={item.name} />
                            ))}
                        </datalist>
                        <Input
                            type="text"
                            placeholder="股票代码 (如 BABA)"
                            value={newStockSymbol}
                            onChange={(e) => setNewStockSymbol(e.target.value)}
                            list="stockSymbolList"
                        />
                        <datalist id="stockSymbolList">
                            {stockSymbols.map((item) => (
                                <option key={item.symbol} value={item.symbol} />
                            ))}
                        </datalist>
                        <Select onValueChange={(value) => setTransactionType(value as 'buy' | 'sell')} value={transactionType}>
                            <SelectTrigger>
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
                    <Button onClick={confirmAddNewStock} className="mt-2">添加股票</Button>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">数据操作</h2>
                    <div className="flex gap-4">
                        <Button onClick={handleCopyData}>复制数据</Button>
                        <Button onClick={handlePasteData}>粘贴数据</Button>
                        <Button onClick={refreshPrices} disabled={isLoading} className="flex items-center gap-2">
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            刷新价格(静态)
                        </Button>
                        <Button onClick={refreshPricesFromAPI} disabled={isLoading} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            从API获取价格
                        </Button>
                    </div>
                    {priceData && Object.keys(priceData).length > 0 && (
                        <p className="text-xs mt-2 text-gray-500">
                            最后更新时间: {Object.values(priceData)[0]?.lastUpdated || '未知'}
                        </p>
                    )}
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">图表类型</h2>
                    <div className="flex gap-4">
                        <Button
                            onClick={() => setShowPositionChart(true)}
                            className={cn(
                                'px-4 py-2 rounded',
                                showPositionChart ? 'bg-blue-500 text-white' : 'bg-gray-200'
                            )}
                        >
                            仓位变化图（折线图）
                        </Button>
                        <Button
                            onClick={() => setShowPositionChart(false)}
                            className={cn(
                                'px-4 py-2 rounded',
                                !showPositionChart ? 'bg-blue-500 text-white' : 'bg-gray-200'
                            )}
                        >
                            股价变化图（柱状图）
                        </Button>
                    </div>
                </div>

                {/* 调试信息区域 */}
                <div className="mt-4 p-3 bg-gray-100 rounded-md text-xs text-gray-700 max-h-40 overflow-auto">
                    <h3 className="font-semibold mb-1">调试信息:</h3>
                    <div>
                        <p>基础路径: {getBasePath()}</p>
                        <p>当前URL: {typeof window !== 'undefined' ? window?.location.href : ""}</p>
                        <p>价格数据状态: {Object.keys(priceData).length > 0 ? '已加载' : '未加载'}</p>
                        {Object.keys(priceData).length > 0 && (
                            <>
                                <p>已加载股票: {Object.keys(priceData).join(', ')}</p>
                                <p>最后更新: {Object.values(priceData)[0]?.lastUpdated || '未知'}</p>
                            </>
                        )}
                        <pre className="mt-2 whitespace-pre-wrap">{debugInfo}</pre>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">总持仓概览</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.keys(totalValues).map((year) => (
                        <div
                            key={year}
                            className="p-4 border rounded-lg shadow bg-white cursor-pointer"
                            onClick={() => handleReportClick(year)}
                        >
                            <h3 className="text-lg font-medium">{year}年总持仓</h3>
                            <p className="text-2xl font-bold text-blue-600">¥{formatLargeNumber(totalValues[year])}</p>
                            {years.indexOf(year) > 0 && (
                                <p
                                    className={cn(
                                        'text-sm',
                                        totalValues[year] > totalValues[years[years.indexOf(year) - 1]] ? 'text-green-500' : 'text-red-500'
                                    )}
                                >
                                    较上年
                                    {totalValues[year] > totalValues[years[years.indexOf(year) - 1]] ? '增长' : '减少'}
                                    {formatLargeNumber(Math.abs(totalValues[year] - totalValues[years[years.indexOf(year) - 1]]))}
                                    ({((totalValues[year] / totalValues[years[years.indexOf(year) - 1]] - 1) * 100).toFixed(2)}%)
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">
                    {showPositionChart ? '各股票仓位变化（按年）' : '各股票价格变化（按年）'}
                </h2>
                <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {showPositionChart ? (
                            <LineChart data={lineChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis tickFormatter={formatLargeNumber} />
                                <Tooltip formatter={(value: number) => [`¥${formatLargeNumber(value)}`, '']} />
                                <Legend onClick={handleLegendClick} />
                                {Object.keys(lineChartData[0] || {})
                                    .filter((key) => key !== 'year')
                                    .map((stock, index) => (
                                        <Line
                                            key={stock}
                                            type="monotone"
                                            dataKey={stock}
                                            name={stock}
                                            hide={!!hiddenSeries[stock]}
                                            stroke={['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'][index % 5]}
                                            strokeWidth={stock === '总计' ? 3 : 1.5}
                                        />
                                    ))}
                            </LineChart>
                        ) : (
                            <BarChart data={barChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(value: number) => `¥${formatLargeNumber(value)}`} />
                                <Tooltip formatter={(value: number) => [`¥${formatLargeNumber(value)}`, '']} />
                                <Legend onClick={handleLegendClick} />
                                {years.map((year, index) => (
                                    <Bar
                                        key={year}
                                        dataKey={year}
                                        name={`${year}年价格`}
                                        hide={!!hiddenSeries[year]}
                                        fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'][index % 5]}
                                    />
                                ))}
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">持仓明细表</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-300">
                        <thead>
                            <tr>
                                {table.headers.map((header, index) => (
                                    <th
                                        key={index}
                                        className={cn(
                                            'px-6 py-3 text-left text-xs font-medium uppercase tracking-wider',
                                            index === 0 ? 'bg-gray-100' : 'bg-gray-50'
                                        )}
                                    >
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {table.rows.map((row, rowIndex) => (
                                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    {row.map((cell, cellIndex) => {
                                        if (cellIndex === 0) {
                                            return (
                                                <td key={cellIndex} className="px-6 py-4 whitespace-nowrap font-medium">
                                                    {cell}
                                                </td>
                                            );
                                        } else if (cellIndex === row.length - 1) {
                                            const stockName = row[0] as string;
                                            return (
                                                <td key={cellIndex} className="px-6 py-4 whitespace-nowrap space-x-2">
                                                    {editingStockName === stockName ? (
                                                        <Button
                                                            size="icon"
                                                            onClick={() => handleSaveRow(stockName)}
                                                            className="text-green-500 hover:text-green-700"
                                                        >
                                                            <Save className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="icon"
                                                            onClick={() => handleEditRow(stockName)}
                                                            className="text-blue-500 hover:text-blue-700"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="icon"
                                                        onClick={() => handleDeleteStock(stockName)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            );
                                        } else {
                                            const year = years[cellIndex - 1];
                                            const isEditing = editingStockName === row[0];

                                            if (isEditing) {
                                                return (
                                                    <td key={cellIndex} className="px-6 py-4 whitespace-nowrap space-y-1">
                                                        <div>
                                                            <label className="text-sm">数量</label>
                                                            <Input
                                                                type="number"
                                                                value={editedRowData?.[year]?.quantity || ''}
                                                                onChange={(e) => handleInputChange(year, 'quantity', e.target.value)}
                                                                className="w-24"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm">价格</label>
                                                            <Input
                                                                type="number"
                                                                value={editedRowData?.[year]?.unitPrice || ''}
                                                                onChange={(e) => handleInputChange(year, 'unitPrice', e.target.value)}
                                                                className="w-24"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm">成本</label>
                                                            <Input
                                                                type="number"
                                                                value={editedRowData?.[year]?.costPrice || ''}
                                                                onChange={(e) => handleInputChange(year, 'costPrice', e.target.value)}
                                                                className="w-24"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm">代码</label>
                                                            <Input
                                                                type="text"
                                                                value={editedRowData?.[year]?.symbol || ''}
                                                                onChange={(e) => handleInputChange(year, 'symbol', e.target.value)}
                                                                className="w-24"
                                                            />
                                                        </div>
                                                    </td>
                                                );
                                            } else if (cell) {
                                                const stockData = cell as { shares: number; price: number; costPrice: number; symbol?: string };
                                                const { shares, price, costPrice, symbol } = stockData;

                                                // 检查价格是否来自最新数据
                                                const isLatestPrice = symbol && priceData[symbol] && priceData[symbol].price === price;

                                                return (
                                                    <td key={cellIndex} className="px-6 py-4 whitespace-nowrap space-y-1">
                                                        <div className="font-medium">
                                                            当前价值: {formatLargeNumber(shares * price)} ({shares} * {price.toFixed(2)})
                                                            {isLatestPrice && <span className="ml-2 text-xs text-green-500">实时</span>}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            成本: {formatLargeNumber(shares * costPrice)} ({shares} * {costPrice.toFixed(2)})
                                                        </div>
                                                        {symbol && (
                                                            <div className="text-xs text-gray-400">
                                                                代码: {symbol}
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            } else {
                                                return <td key={cellIndex} className="px-6 py-4 whitespace-nowrap"> - </td>;
                                            }
                                        }
                                    })}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                {table.totalRow.map((cell, index) => {
                                    if (index === 0) {
                                        return (
                                            <td
                                                key={index}
                                                className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider bg-gray-100"
                                            >
                                                {cell}
                                            </td>
                                        );
                                    } else if (index === table.totalRow.length - 1) {
                                        return (
                                            <td
                                                key={index}
                                                className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider bg-gray-100"
                                            >
                                                {cell}
                                            </td>
                                        );
                                    }
                                    const year = years[index - 1];
                                    const total =
                                        yearData[year].stocks.reduce((acc, stock) => acc + stock.shares * stock.price, 0) +
                                        yearData[year].cashBalance;
                                    return (
                                        <td
                                            key={index}
                                            className="px-6 py-3 text-center text-sm font-semibold uppercase tracking-wider bg-gray-100"
                                        >
                                            ¥{formatLargeNumber(total)}
                                        </td>
                                    );
                                })}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {renderReportDialog()}

            <Dialog
                open={alertInfo?.isOpen}
                onOpenChange={(open) => {
                    if (!open) setAlertInfo(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{alertInfo?.title}</DialogTitle>
                        <DialogDescription>
                            <pre className="whitespace-pre-wrap">{alertInfo?.description}</pre>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end space-x-2">
                        {alertInfo?.onConfirm && <Button onClick={alertInfo.onConfirm}>确定</Button>}
                        <Button onClick={alertInfo?.onCancel || (() => setAlertInfo(null))}>取消</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>复制数据</DialogTitle>
                        <DialogDescription>
                            <p>请点击下方文本框，使用 Command + A 全选内容，或直接点击"复制到剪贴板"按钮。</p>
                            <textarea
                                className="w-full h-64 p-2 mt-2 border rounded resize-none"
                                value={JSON.stringify(yearData, null, 2)}
                                readOnly
                            />
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end space-x-2">
                        <Button onClick={() => navigator.clipboard.writeText(JSON.stringify(yearData, null, 2))}>
                            复制到剪贴板
                        </Button>
                        <Button onClick={() => setIsCopyDialogOpen(false)}>关闭</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isPasteDialogOpen} onOpenChange={setIsPasteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>粘贴数据</DialogTitle>
                        <DialogDescription>
                            <textarea
                                className="w-full h-32 p-2 border rounded"
                                value={pasteData}
                                onChange={(e) => setPasteData(e.target.value)}
                                placeholder="请将数据粘贴到此处..."
                            />
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end space-x-2">
                        <Button onClick={confirmPasteData}>确认</Button>
                        <Button onClick={() => setIsPasteDialogOpen(false)}>取消</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default StockPortfolioTracker;
