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
    PieChart,
    Pie,
    Cell,
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
import { Trash2, Edit, Save, RefreshCw, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tooltip as UITooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { stockInitialData } from './data';

import { DialogFooter } from '@/components/ui/dialog';

interface Stock {
    name: string;
    shares: number;
    price: number;
    costPrice: number;
    id: string;
    symbol?: string;
}

interface CashTransaction {
    amount: number;
    type: 'deposit' | 'withdraw' | 'buy' | 'sell';
    date: string;
    stockName?: string;
    description?: string;
}

interface StockTransaction {
    stockName: string;
    type: 'buy' | 'sell';
    shares: number;
    price: number;
    date: string;
    beforeCostPrice?: number; // 交易前的成本价
    afterCostPrice?: number;  // 交易后的成本价
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
        hkdPrice?: number;
        name: string;
        currency?: string;
        lastUpdated: string;
    };
}

const StockPortfolioTracker: React.FC = () => {
    const initialData: { [year: string]: YearData } = stockInitialData;

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
    const [hiddenStocks, setHiddenStocks] = useState<{ [stockName: string]: boolean }>({});
    const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
    const [alertInfo, setAlertInfo] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm?: () => void;
        onCancel?: () => void;
        confirmText?: string;
        cancelText?: string;
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
    const [currency, setCurrency] = useState('USD');
    const [exchangeRates, setExchangeRates] = useState<{ [key: string]: number }>({ USD: 1, HKD: 0.12864384, CNY: 0.14 });
    const [retirementGoal, setRetirementGoal] = useState('');
    const [annualReturn, setAnnualReturn] = useState('');
    const [calculationMode, setCalculationMode] = useState<'rate' | 'years'>('rate');
    const [targetYears, setTargetYears] = useState('');
    const [comparisonYear, setComparisonYear] = useState<string>(years[years?.length - 1]);

    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

    const latestYear = years.length > 0 ? Math.max(...years.map(Number)).toString() : '2024';

    const backendDomain = "//stock-backend-tau.vercel.app";

    // 增量变化跟踪
    const [incrementalChanges, setIncrementalChanges] = useState({
        stocks: {},        // 年份 -> 股票数据
        cashTransactions: {}, // 年份 -> 现金交易
        stockTransactions: {}, // 年份 -> 股票交易
        yearlySummaries: {}   // 年份 -> 年汇总
    });

    // --- Check Login Status on Mount ---
    useEffect(() => {
        const initializeData = async () => {
            const token = localStorage.getItem('token');

            if (token) {
                setIsLoggedIn(true);
                try {
                    await fetchJsonData(token);
                    setIsLoading(true);
                    await refreshPrices(false);
                    setIsLoading(false);
                } catch (error) {
                    console.error('初始化登录态数据失败:', error);
                    setAlertInfo({
                        isOpen: true,
                        title: '数据加载失败',
                        description: '无法从服务器获取数据，请稍后重试',
                        onConfirm: () => setAlertInfo(null),
                    });
                }
            } else {
                setIsLoggedIn(false);
                try {
                    const symbolsUrl = `${getBasePath()}/data/symbols.json`;
                    const symbolsResponse = await fetch(symbolsUrl);
                    if (symbolsResponse.ok) {
                        const symbolsData = await symbolsResponse.json();
                        setStockSymbols(symbolsData.stocks || []);
                    }
                } catch (error) {
                    console.error('获取股票符号失败:', error);
                }
                try {
                    const pricesUrl = `${getBasePath()}/data/prices.json`;
                    const timestamp = new Date().getTime();
                    const pricesResponse = await fetch(`${pricesUrl}?t=${timestamp}`);
                    if (pricesResponse.ok) {
                        const pricesData = await pricesResponse.json();
                        setPriceData(pricesData);
                        const rates = { USD: 1 };
                        if (pricesData['HKD']) rates['HKD'] = pricesData['HKD'].price;
                        if (pricesData['CNY']) rates['CNY'] = pricesData['CNY'].price;
                        setExchangeRates(rates);
                        updateLatestPrices(pricesData);
                    }
                } catch (error) {
                    console.error('获取最新价格时出错:', error);
                }
            }
        };

        initializeData();
    }, []);

    // --- Login Function ---
    const handleLogin = async () => {
        try {
            const response = await fetch(`${backendDomain}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                setIsLoggedIn(true);
                setIsLoginDialogOpen(false);
                setLoginError('');
                await fetchJsonData(data.token);
                setIsLoading(true);
                await refreshPrices(false);
                setIsLoading(false);
                setAlertInfo({
                    isOpen: true,
                    title: '登录成功',
                    description: '数据已加载，价格已刷新',
                    onConfirm: () => setAlertInfo(null),
                });
            } else {
                setLoginError(data.message || '登录失败');
            }
        } catch (error) {
            setLoginError('网络错误，请稍后再试');
        }
    };

    // --- Fetch Data from Backend ---
    const fetchJsonData = async (token: string) => {
        try {
            const response = await fetch(`${backendDomain}/api/data`, {
                headers: {
                    'Authorization': token,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setYearData(data);
                setYears(Object.keys(data));
                setSelectedYear(Object.keys(data)[Object.keys(data).length - 1]);
            } else {
                console.error('获取数据失败:', data.message);
            }
        } catch (error) {
            console.error('获取数据时出错:', error);
        }
    };

    // --- Save Data to Backend ---
    const handleSaveData = () => {
        if (isLoggedIn) {
            setIsSaveDialogOpen(true);
        }
    };

    const confirmSaveData = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${backendDomain}/api/updateNotion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token,
                },
                body: JSON.stringify(incrementalChanges),
            });
            const result = await response.json();
            if (response.ok) {
                setAlertInfo({
                    isOpen: true,
                    title: '保存成功',
                    description: '增量数据已成功保存到Notion数据库',
                    onConfirm: () => setAlertInfo(null),
                });
                // 清空增量变化
                setIncrementalChanges({
                    stocks: {},
                    cashTransactions: {},
                    stockTransactions: {},
                    yearlySummaries: {}
                });
            } else {
                setAlertInfo({
                    isOpen: true,
                    title: '保存失败',
                    description: result.message || '保存数据时发生错误',
                    onConfirm: () => setAlertInfo(null),
                });
            }
        } catch (error) {
            setAlertInfo({
                isOpen: true,
                title: '保存失败',
                description: '网络错误，请稍后再试',
                onConfirm: () => setAlertInfo(null),
            });
        } finally {
            setIsSaveDialogOpen(false);
        }
    };

    // --- Logout Function ---
    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setYearData(stockInitialData);
        setYears(Object.keys(stockInitialData));
        setSelectedYear(Object.keys(stockInitialData)[Object.keys(stockInitialData).length - 1]);
    };

    const getBasePath = () => {
        if (typeof window !== 'undefined') {
            if (window.location.hostname.includes('github.io')) {
                return '/StockPulse';
            }
        }
        return '';
    };

    const updateLatestPrices = (prices: PriceData) => {
        setYearData((prevYearData) => {
            const updatedYearData = { ...prevYearData };
            if (updatedYearData[latestYear] && updatedYearData[latestYear].stocks) {
                updatedYearData[latestYear].stocks.forEach(stock => {
                    if (stock.symbol && prices[stock.symbol]) {
                        if (prices[stock.symbol].currency === 'HKD') {
                            stock.price = prices[stock.symbol].price * exchangeRates['HKD'];
                        } else {
                            stock.price = prices[stock.symbol].price;
                        }
                    }
                });
            }
            return updatedYearData;
        });
    };

    const refreshPrices = async (isManual = false) => {
        setIsLoading(true);
        try {
            const latestYear = years.length > 0 ? Math.max(...years.map(Number)).toString() : "2025";
            const latestStocks = yearData[latestYear]?.stocks || [];
            const symbols = latestStocks.map(stock => stock.symbol).filter(Boolean);
    
            if (symbols.length === 0) {
                if (isManual) {
                    setAlertInfo({
                        isOpen: true,
                        title: "无股票数据",
                        description: "当前无股票数据可供更新",
                        onConfirm: () => setAlertInfo(null),
                    });
                }
                setIsLoading(false);
                return;
            }
    
            const token = localStorage.getItem("token");
            const response = await fetch(`${backendDomain}/api/updatePrices`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token,
                },
                body: JSON.stringify({ symbols }),
            });
    
            const result = await response.json();
    
            if (response.ok && result.success) {
                const stockData = result.data;
    
                setYearData(prevYearData => {
                    const updatedYearData = { ...prevYearData };
                    if (updatedYearData[latestYear] && updatedYearData[latestYear].stocks) {
                        updatedYearData[latestYear].stocks.forEach(stock => {
                            if (stock.symbol && stockData[stock.symbol]) {
                                stock.price = stockData[stock.symbol].price;
                            }
                        });
                    }
                    return updatedYearData;
                });
    
                // Set the last refresh time to now
                setLastRefreshTime(new Date());
    
                if (isManual) {
                    setAlertInfo({
                        isOpen: true,
                        title: "价格已更新",
                        description: `股票价格已更新至最新数据（${new Date().toLocaleString()}）`,
                        onConfirm: () => setAlertInfo(null),
                    });
                }
            } else {
                if (isManual) {
                    setAlertInfo({
                        isOpen: true,
                        title: "更新失败",
                        description: result.message || "获取最新价格时发生错误",
                        onConfirm: () => setAlertInfo(null),
                    });
                } else {
                    setAlertInfo({
                        isOpen: true,
                        title: "自动刷新失败",
                        description: "无法自动更新价格，请手动点击“刷新价格”按钮",
                        onConfirm: () => setAlertInfo(null),
                    });
                }
            }
        } catch (error) {
            console.error("刷新价格时出错:", error);
            if (isManual) {
                setAlertInfo({
                    isOpen: true,
                    title: "更新失败",
                    description: "网络错误，请稍后再试",
                    onConfirm: () => setAlertInfo(null),
                });
            } else {
                setAlertInfo({
                    isOpen: true,
                    title: "自动刷新失败",
                    description: "无法自动更新价格，请手动点击“刷新价格”按钮",
                    onConfirm: () => setAlertInfo(null),
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const convertToCurrency = (amount: number, targetCurrency: string): number => {
        const rate = exchangeRates[targetCurrency] || 1;
        return amount / rate;
    };

    const formatLargeNumber = (num: number, targetCurrency: string) => {
        const convertedNum = convertToCurrency(num, targetCurrency);
        return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(convertedNum);
    };

    const calculateYearlyValues = useCallback(() => {
        const yearlyValues: { [year: string]: { [stockName: string]: number; total: number } } = {};
        Object.keys(yearData).forEach((year) => {
            yearlyValues[year] = {};
            let yearTotal = 0;

            if (yearData[year] && yearData[year].stocks) {
                yearData[year].stocks.forEach((stock) => {
                    if (!hiddenStocks[stock.name]) {
                        const value = stock.shares * stock.price;
                        yearlyValues[year][stock.name] = value;
                        yearTotal += value;
                    }
                });
            }
            yearlyValues[year]['total'] = yearTotal;
        });
        return yearlyValues;
    }, [yearData, hiddenStocks]);

    const calculateTotalValues = useCallback(() => {
        const totalValues: { [year: string]: number } = {};
        Object.keys(yearData).forEach((year) => {
            if (yearData[year] && yearData[year].stocks) {
                const stockValue = yearData[year].stocks.reduce((acc, stock) =>
                    hiddenStocks[stock.name] ? acc : acc + stock.shares * stock.price, 0);
                totalValues[year] = stockValue + (yearData[year].cashBalance || 0);
            } else {
                totalValues[year] = 0;
            }
        });
        return totalValues;
    }, [yearData, hiddenStocks]);

    const prepareLineChartData = useCallback(() => {
        const yearlyValues = calculateYearlyValues();
        const latestStocks = new Set<string>();

        if (yearData[latestYear] && yearData[latestYear].stocks) {
            yearData[latestYear].stocks.forEach(stock => {
                if (!hiddenStocks[stock.name]) {
                    latestStocks.add(stock.name);
                }
            });
        }

        const allStocks = new Set<string>();
        Object.values(yearData).forEach((yearDataItem) => {
            if (yearDataItem && yearDataItem.stocks) {
                yearDataItem.stocks.forEach((stock) => {
                    if (latestStocks.has(stock.name) && !hiddenStocks[stock.name]) {
                        allStocks.add(stock.name);
                    }
                });
            }
        });

        return Object.keys(yearData).map((year) => {
            const dataPoint: { [key: string]: string | number } = { year };
            allStocks.forEach((stockName) => {
                dataPoint[stockName] = yearlyValues[year][stockName] || 0;
            });
            dataPoint['total'] = yearlyValues[year]['total'];
            return dataPoint;
        });
    }, [calculateYearlyValues, yearData, latestYear, hiddenStocks]);

    const preparePercentageBarChartData = useCallback(() => {
        const result: { name: string;[year: string]: number }[] = [];
        const yearTotals: { [year: string]: number } = {};

        Object.keys(yearData).forEach((year) => {
            if (yearData[year] && yearData[year].stocks) {
                yearTotals[year] = yearData[year].stocks.reduce(
                    (total, stock) => hiddenStocks[stock.name] ? total : total + stock.shares * stock.price,
                    0
                );
            } else {
                yearTotals[year] = 0;
            }
        });

        const latestStocks = new Set<string>();
        if (yearData[latestYear] && yearData[latestYear].stocks) {
            yearData[latestYear].stocks.forEach(stock => {
                if (!hiddenStocks[stock.name]) {
                    latestStocks.add(stock.name);
                }
            });
        }

        latestStocks.forEach((stockName) => {
            const stockData: { name: string;[year: string]: number } = { name: stockName };

            Object.keys(yearData).forEach((year) => {
                if (yearData[year] && yearData[year].stocks) {
                    const stockInYear = yearData[year].stocks.find((s) => s.name === stockName);
                    const stockValue = stockInYear ? stockInYear.shares * stockInYear.price : 0;
                    const yearTotal = yearTotals[year] || 1;
                    stockData[year] = (stockValue / yearTotal) * 100;
                } else {
                    stockData[year] = 0;
                }
            });

            result.push(stockData);
        });

        return result;
    }, [yearData, latestYear, hiddenStocks]);

    const addNewYear = () => {
        const trimmedYear = newYear.trim();
        if (trimmedYear && !years.includes(trimmedYear)) {
            const referenceYear = years.filter(y => y < trimmedYear)
                .sort((a, b) => b.localeCompare(a))[0];

            const cashToCarryOver = referenceYear ?
                (yearData[referenceYear]?.cashBalance || 0) : 0;

            const newYearDataItem: YearData = {
                stocks: [],
                cashTransactions: [],
                stockTransactions: [],
                cashBalance: 0
            };

            if (cashToCarryOver > 0) {
                newYearDataItem.cashTransactions.push({
                    amount: cashToCarryOver,
                    type: 'deposit',
                    date: new Date().toISOString().split('T')[0],
                    description: '上年结余'
                });
                newYearDataItem.cashBalance = cashToCarryOver;
            }

            setYearData({ ...yearData, [trimmedYear]: newYearDataItem });
            setYears([...years, trimmedYear]);
            setNewYear('');
            setSelectedYear(trimmedYear);

            // 记录新增年份的增量变化
            setIncrementalChanges(prev => ({
                ...prev,
                yearlySummaries: {
                    ...prev.yearlySummaries,
                    [trimmedYear]: { cashBalance: cashToCarryOver }
                }
            }));
        }
    };

    const addCashTransaction = () => {
        if (!cashTransactionAmount || !selectedYear) return;
        const amount = parseFloat(cashTransactionAmount);
        if (isNaN(amount)) return;

        const cashTransaction: CashTransaction = {
            amount: cashTransactionType === 'deposit' ? amount : -amount,
            type: cashTransactionType,
            date: new Date().toISOString().split('T')[0],
        };

        setYearData((prevYearData) => {
            const updatedYearData = { ...prevYearData };
            if (!updatedYearData[selectedYear]) {
                updatedYearData[selectedYear] = {
                    stocks: [],
                    cashTransactions: [],
                    stockTransactions: [],
                    cashBalance: 0
                };
            }
            updatedYearData[selectedYear].cashTransactions.push(cashTransaction);
            updatedYearData[selectedYear].cashBalance = (updatedYearData[selectedYear].cashBalance || 0) + cashTransaction.amount;
            return updatedYearData;
        });

        // 记录增量变化
        setIncrementalChanges((prev) => ({
            ...prev,
            cashTransactions: {
                ...prev.cashTransactions,
                [selectedYear]: [...(prev.cashTransactions[selectedYear] || []), cashTransaction]
            },
            yearlySummaries: {
                ...prev.yearlySummaries,
                [selectedYear]: { cashBalance: (yearData[selectedYear]?.cashBalance || 0) + cashTransaction.amount }
            }
        }));

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

        const currentStock = updatedYearData[selectedYear].stocks?.find((s) => s.name === stockName);
        const oldShares = currentStock ? currentStock.shares : 0;
        const oldCostPrice = currentStock ? currentStock.costPrice : 0;
        const oldTotalCost = oldShares * oldCostPrice;

        let newSharesValue, newTotalCost, newCostPrice, transactionCost;

        if (transactionType === 'buy') {
            newSharesValue = oldShares + transactionShares;
            transactionCost = transactionShares * transactionPrice;

            newTotalCost = oldTotalCost + transactionCost;
            newCostPrice = newSharesValue > 0 ? newTotalCost / newSharesValue : 0;

            if ((updatedYearData[selectedYear].cashBalance || 0) < transactionCost) {
                setAlertInfo({
                    isOpen: true,
                    title: '现金不足',
                    description: '购买股票的现金不足，现金余额将变为负数',
                    onConfirm: () => {
                        updatedYearData[selectedYear].cashBalance = (updatedYearData[selectedYear].cashBalance || 0) - transactionCost;
                        updateStock(
                            updatedYearData,
                            selectedYear,
                            stockName,
                            newSharesValue,
                            yearEndPrice || transactionPrice,
                            newCostPrice,
                            transactionShares,
                            transactionPrice,
                            transactionType,
                            stockSymbol,
                            oldCostPrice
                        );
                        setYearData(updatedYearData);
                        resetForm();
                        setAlertInfo(null);
                    },
                    onCancel: () => setAlertInfo(null),
                });
                return;
            }
        } else {
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

            const sellCost = oldCostPrice * transactionShares;
            const sellProceeds = transactionPrice * transactionShares;
            const profitLoss = sellProceeds - sellCost;

            newTotalCost = oldTotalCost - sellCost;

            if (transactionPrice > oldCostPrice && newSharesValue > 0) {
                newTotalCost = Math.max(0, newTotalCost - profitLoss);
            }

            newCostPrice = newSharesValue > 0 ? newTotalCost / newSharesValue : 0;
        }

        const displayYearEndPrice = yearEndPrice !== null ? yearEndPrice : (currentStock ? currentStock.price : transactionPrice);
        const displayYearEndPriceText = yearEndPrice !== null ? displayYearEndPrice.toFixed(2) : `${displayYearEndPrice.toFixed(2)}（未填入）`;

        let profitInfo = '';
        if (transactionType === 'sell' && oldCostPrice > 0) {
            const profit = (transactionPrice - oldCostPrice) * transactionShares;
            const profitPercentage = ((transactionPrice / oldCostPrice) - 1) * 100;
            profitInfo = `
          预计盈利: ${profit.toFixed(2)} (${profitPercentage.toFixed(2)}%)`;
        }

        const description = `
          股票: ${stockName}
          交易类型: ${transactionType === 'buy' ? '买入' : '卖出'}
          股数: ${transactionShares}
          交易价格: ${transactionPrice.toFixed(2)}
          当前价格: ${displayYearEndPriceText}
          原成本价: ${oldCostPrice.toFixed(2)}
          新成本价: ${newCostPrice.toFixed(2)}${profitInfo}
          ${stockSymbol ? `股票代码: ${stockSymbol}` : ''}
        `;

        setAlertInfo({
            isOpen: true,
            title: '确认交易',
            description,
            onConfirm: () => {
                if (transactionType === 'buy') {
                    updatedYearData[selectedYear].cashBalance = (updatedYearData[selectedYear].cashBalance || 0) - transactionCost;
                } else {
                    updatedYearData[selectedYear].cashBalance = (updatedYearData[selectedYear].cashBalance || 0) + transactionCost;
                }
                updateStock(
                    updatedYearData,
                    selectedYear,
                    stockName,
                    newSharesValue,
                    displayYearEndPrice,
                    newCostPrice,
                    transactionShares,
                    transactionPrice,
                    transactionType,
                    stockSymbol,
                    oldCostPrice
                );
                setYearData(updatedYearData);
                resetForm();
                setAlertInfo(null);
            },
            onCancel: () => setAlertInfo(null),
        });
    };

    const updateStock = (
        updatedYearData: { [year: string]: YearData },
        year: string,
        stockName: string,
        shares: number,
        price: number,
        costPrice: number,
        transactionShares: number,
        transactionPrice: number,
        transactionType: 'buy' | 'sell',
        symbol?: string,
        beforeCostPrice?: number
    ) => {
        if (!updatedYearData[year]) {
            updatedYearData[year] = { stocks: [], cashTransactions: [], stockTransactions: [], cashBalance: 0 };
        }

        if (!updatedYearData[year].stocks) {
            updatedYearData[year].stocks = [];
        }

        const stockIndex = updatedYearData[year].stocks.findIndex((s) => s.name === stockName);
        const stockData = {
            name: stockName,
            shares,
            price,
            costPrice,
            id: stockIndex !== -1 ? updatedYearData[year].stocks[stockIndex].id : uuidv4(),
            symbol: symbol || (stockIndex !== -1 ? updatedYearData[year].stocks[stockIndex].symbol : '')
        };

        if (stockIndex !== -1) {
            updatedYearData[year].stocks[stockIndex] = stockData;
            if (shares <= 0) {
                updatedYearData[year].stocks = updatedYearData[year].stocks.filter((_, i) => i !== stockIndex);
            }
        } else if (shares > 0) {
            updatedYearData[year].stocks.push(stockData);
        }

        const stockTransaction: StockTransaction = {
            stockName,
            type: transactionType,
            shares: transactionShares,
            price: transactionPrice,
            date: new Date().toISOString().split('T')[0],
            beforeCostPrice: beforeCostPrice ?? 0,
            afterCostPrice: costPrice
        };
        updatedYearData[year].stockTransactions.push(stockTransaction);

        const cashTransaction: CashTransaction = {
            amount: transactionType === 'buy' ? -transactionShares * transactionPrice : transactionShares * transactionPrice,
            type: transactionType,
            date: new Date().toISOString().split('T')[0],
            stockName,
        };
        updatedYearData[year].cashTransactions.push(cashTransaction);

        // 记录增量变化
        setIncrementalChanges((prev) => ({
            ...prev,
            stocks: {
                ...prev.stocks,
                [year]: [...(prev.stocks[year] || []), stockData]
            },
            stockTransactions: {
                ...prev.stockTransactions,
                [year]: [...(prev.stockTransactions[year] || []), stockTransaction]
            },
            cashTransactions: {
                ...prev.cashTransactions,
                [year]: [...(prev.cashTransactions[year] || []), cashTransaction]
            },
            yearlySummaries: {
                ...prev.yearlySummaries,
                [year]: { cashBalance: updatedYearData[year].cashBalance }
            }
        }));
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
            [year: string]: { quantity: string; unitPrice: string; costPrice: string; symbol?: string }
        } = {};
        years.forEach((year) => {
            if (yearData[year] && yearData[year].stocks) {
                const stock = yearData[year].stocks.find((s) => s.name === stockName);
                initialEditedData[year] = {
                    quantity: stock?.shares?.toString() || '',
                    unitPrice: stock?.price?.toString() || '',
                    costPrice: stock?.costPrice?.toString() || '',
                    symbol: stock?.symbol || ''
                };
            } else {
                initialEditedData[year] = {
                    quantity: '',
                    unitPrice: '',
                    costPrice: '',
                    symbol: ''
                };
            }
        });
        setEditedRowData(initialEditedData);
    };

    const handleSaveRow = (stockName: string) => {
        setYearData((prevYearData) => {
            const updatedYearData: { [year: string]: YearData } = { ...prevYearData };
            if (!editedRowData) return updatedYearData;

            years.forEach((year) => {
                if (!updatedYearData[year]) {
                    updatedYearData[year] = { stocks: [], cashTransactions: [], stockTransactions: [], cashBalance: 0 };
                }

                if (!updatedYearData[year].stocks) {
                    updatedYearData[year].stocks = [];
                }

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
                            symbol
                        };
                    } else {
                        updatedYearData[year].stocks.push({
                            name: stockName,
                            shares,
                            price,
                            costPrice,
                            id: uuidv4(),
                            symbol
                        });
                    }

                    // 记录增量变化
                    setIncrementalChanges((prev) => ({
                        ...prev,
                        stocks: {
                            ...prev.stocks,
                            [year]: [...(prev.stocks[year] || []), {
                                name: stockName,
                                shares,
                                price,
                                costPrice,
                                symbol
                            }]
                        },
                        yearlySummaries: {
                            ...prev.yearlySummaries,
                            [year]: { cashBalance: updatedYearData[year].cashBalance }
                        }
                    }));
                } else if (updatedYearData[year].stocks) {
                    updatedYearData[year].stocks = updatedYearData[year].stocks.filter((s) => s.name !== stockName);
                }
            });
            return updatedYearData;
        });
        setEditingStockName(null);
        setEditedRowData(null);
    };

    const handleInputChange = (year: string, field: 'quantity' | 'unitPrice' | 'costPrice' | 'symbol', value: string) => {
        if (editingStockName && editedRowData) {
            setEditedRowData((prev) => {
                if (!prev) return null;
                return {
                    ...prev,
                    [year]: {
                        ...prev[year],
                        [field]: value
                    }
                };
            });
        }
    };

    const handleDeleteStock = (stockName: string) => {
        setYearData((prevYearData) => {
            const updatedYearData: { [year: string]: YearData } = {};
            Object.keys(prevYearData).forEach((year) => {
                if (prevYearData[year] && prevYearData[year].stocks) {
                    updatedYearData[year] = {
                        ...prevYearData[year],
                        stocks: prevYearData[year].stocks.filter((stock) => stock.name !== stockName)
                    };
                } else {
                    updatedYearData[year] = prevYearData[year];
                }
            });
            return updatedYearData;
        });

        // 记录删除股票的增量变化
        setIncrementalChanges((prev) => {
            const updatedStocks = { ...prev.stocks };
            Object.keys(updatedStocks).forEach((year) => {
                updatedStocks[year] = updatedStocks[year].filter((stock) => stock.name !== stockName);
            });
            return {
                ...prev,
                stocks: updatedStocks
            };
        });
    };

    const toggleStockVisibility = (stockName: string) => {
        setHiddenStocks(prev => ({
            ...prev,
            [stockName]: !prev[stockName]
        }));
    };

    const tableData = useCallback(() => {
        const stockSet = new Set<string>();
        Object.values(yearData).forEach((yearDataItem) => {
            if (yearDataItem && yearDataItem.stocks) {
                yearDataItem.stocks.forEach((stock) => stockSet.add(stock.name));
            }
        });

        const stockValues2025 = {};
        Object.values(yearData).forEach((yearDataItem) => {
            if (yearDataItem && yearDataItem.stocks) {
                yearDataItem.stocks.forEach((stock) => {
                    if (stock.name in stockValues2025) return;
                    const stockIn2025 = yearData['2025']?.stocks?.find((s) => s.name === stock.name);
                    if (stockIn2025) {
                        stockValues2025[stock.name] = stockIn2025.shares * stockIn2025.price;
                    } else {
                        stockValues2025[stock.name] = 0;
                    }
                });
            }
        });

        const stockNames = Array.from(stockSet).sort((a, b) => {
            const valueA = stockValues2025[a] || 0;
            const valueB = stockValues2025[b] || 0;
            return valueB - valueA;
        });

        const headers = ['visible', '股票名称', ...years, '操作'];

        const rows = stockNames.map((stockName) => {
            const row = [];

            row.push({ visibility: !hiddenStocks[stockName] });

            let symbol = '';
            for (let i = years.length - 1; i >= 0; i--) {
                const year = years[i];
                const stockInYear = yearData[year]?.stocks?.find((s) => s.name === stockName);
                if (stockInYear && stockInYear.symbol) {
                    symbol = stockInYear.symbol;
                    break;
                }
            }
            row.push({ name: stockName, symbol });

            years.forEach((year) => {
                if (yearData[year] && yearData[year].stocks) {
                    const stockInYear = yearData[year].stocks.find((s) => s.name === stockName);
                    row.push(stockInYear ? {
                        shares: stockInYear.shares,
                        price: stockInYear.price,
                        costPrice: stockInYear.costPrice,
                        symbol: stockInYear.symbol
                    } : null);
                } else {
                    row.push(null);
                }
            });

            row.push(null);

            return row;
        });

        const totalRow = ['', 'total', ...years.map(() => null), null];

        return { headers, rows, totalRow };
    }, [yearData, years, hiddenStocks]);

    const lineChartData = prepareLineChartData();
    const barChartData = preparePercentageBarChartData();
    const totalValues = calculateTotalValues();
    const table = tableData();

    const handleLegendClick = (data: { dataKey: string }) => {
        const key = data.dataKey;
        setHiddenSeries((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    useEffect(() => {
        if (lastRefreshTime) {
            const timer = setTimeout(() => {
                // Force re-render or reset lastRefreshTime to null after 120 seconds
                setLastRefreshTime(null); // Or trigger a state update to re-render
            }, 120000); // 120 seconds
            return () => clearTimeout(timer); // Cleanup on unmount or re-run
        }
    }, [lastRefreshTime]);

    useEffect(() => {
        if (typeof window !== 'undefined' && !isLoggedIn) {
            localStorage.setItem('stockPortfolioData', JSON.stringify(yearData));
            localStorage.setItem('stockPortfolioYears', JSON.stringify(years));
            localStorage.setItem('stockPortfolioSelectedYear', selectedYear);
        }
    }, [yearData, years, selectedYear, isLoggedIn]);

    useEffect(() => {
        if (typeof window !== 'undefined' && !isLoggedIn) {
            const savedData = localStorage.getItem('stockPortfolioData');
            const savedYears = localStorage.getItem('stockPortfolioYears');
            const savedSelectedYear = localStorage.getItem('stockPortfolioSelectedYear');
            if (savedData) setYearData(JSON.parse(savedData));
            if (savedYears) setYears(JSON.parse(savedYears));
            if (savedSelectedYear) setSelectedYear(savedSelectedYear);
        }
    }, [isLoggedIn]);

    const handleReportClick = (year: string) => {
        setSelectedReportYear(year);
        setIsReportDialogOpen(true);
    };

    const calculateCumulativeInvested = (year: string) => {
        let cumulativeInvested = 0;
        const sortedYears = [...years].sort();
        for (const y of sortedYears) {
            if (y > year) break;

            if (yearData[y] && yearData[y].cashTransactions) {
                cumulativeInvested += yearData[y].cashTransactions.reduce(
                    (acc, tx) => acc + (tx.type === 'deposit' ? tx.amount : tx.type === 'withdraw' ? -tx.amount : 0),
                    0
                );
            }
        }
        return cumulativeInvested;
    };

    const renderReportDialog = () => {
        if (!selectedReportYear || !yearData[selectedReportYear]) return null;

        const yearDataItem = yearData[selectedReportYear];

        const stockValue = yearDataItem.stocks ? yearDataItem.stocks.reduce(
            (acc, stock) => hiddenStocks[stock.name] ? acc : acc + stock.shares * stock.price, 0
        ) : 0;

        const totalPortfolioValue = stockValue + (yearDataItem.cashBalance || 0);

        const yearlyInvested = yearDataItem.cashTransactions ? yearDataItem.cashTransactions.reduce(
            (acc, tx) => acc + (tx.type === 'deposit' ? tx.amount : tx.type === 'withdraw' ? -tx.amount : 0),
            0
        ) : 0;

        const cumulativeInvested = calculateCumulativeInvested(selectedReportYear);
        const growth = totalPortfolioValue - cumulativeInvested;
        const growthRate = cumulativeInvested > 0 ? (growth / cumulativeInvested) * 100 : 0;

        const preparePieChartData = () => {
            const stocks = yearDataItem.stocks.filter(stock => !hiddenStocks[stock.name]);
            const totalValue = stocks.reduce((acc, stock) => acc + stock.shares * stock.price, 0) + (yearDataItem.cashBalance || 0);
            return stocks.map(stock => ({
                name: stock.name,
                value: (stock.shares * stock.price / totalValue) * 100,
            }));
        };

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
            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedReportYear}年详细报表</DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue="summary" className="w-full">
                        <TabsList>
                            <TabsTrigger value="summary">概览</TabsTrigger>
                            <TabsTrigger value="portfolio">投资组合分布</TabsTrigger>
                            <TabsTrigger value="performance">盈亏表现</TabsTrigger>
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
                                        data={preparePieChartData()}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(2)}%)`}
                                    >
                                        {preparePieChartData().map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                                                {tx.date}: {tx.type === 'buy' ? '买入' : '卖出'} {tx.stockName} {tx.shares}股，价格 {formatLargeNumber(tx.price, currency)}
                                                {tx.beforeCostPrice !== undefined && tx.afterCostPrice !== undefined && (
                                                    `，交易前成本价 ${formatLargeNumber(tx.beforeCostPrice, currency)}，交易后成本价 ${formatLargeNumber(tx.afterCostPrice, currency)}`
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
                    <Button onClick={() => setIsReportDialogOpen(false)} className="mt-4">关闭</Button>
                </DialogContent>
            </Dialog>
        );
    };

    const handleCopyData = () => setIsCopyDialogOpen(true);
    const handlePasteData = () => setIsPasteDialogOpen(true);

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
                onConfirm: () => setAlertInfo(null)
            });
            setIsPasteDialogOpen(false);
            setPasteData('');
        } catch (e) {
            setAlertInfo({
                isOpen: true,
                title: '粘贴失败',
                description: '粘贴的数据格式不正确',
                onCancel: () => setAlertInfo(null),
                cancelText: '关闭'
            });
        }
    };

    const calculateYearsToGoal = (currentAmount: number, goalAmount: number, returnRate: number) => {
        if (returnRate <= 0) return Infinity;
        const years = Math.log(goalAmount / currentAmount) / Math.log(1 + returnRate / 100);
        return Math.ceil(years);
    };

    const calculateRequiredReturnRate = (currentAmount: number, goalAmount: number, years: number) => {
        if (years <= 0) return Infinity;
        return (Math.pow(goalAmount / currentAmount, 1 / years) - 1) * 100;
    };

    const calculateYearGrowth = useCallback((currentYear: string) => {
        const yearIndex = years.indexOf(currentYear);
        if (yearIndex <= 0) return null;

        const previousYear = years[yearIndex - 1];
        const currentValue = totalValues[currentYear];
        const previousValue = totalValues[previousYear];

        const yearDeposits = yearData[currentYear]?.cashTransactions
            .reduce((sum, tx) => sum + (tx.type === 'deposit' ? tx.amount : 0), 0) || 0;

        const actualGrowth = currentValue - previousValue;
        const actualGrowthRate = ((currentValue / previousValue) - 1) * 100;

        const investmentGrowth = actualGrowth - yearDeposits;
        const investmentGrowthRate = ((currentValue - yearDeposits) / previousValue - 1) * 100;

        return {
            actualGrowth,
            actualGrowthRate,
            investmentGrowth,
            investmentGrowthRate,
            yearDeposits
        };
    }, [years, totalValues, yearData]);

    const handleYearChange = useCallback((newYear: string) => {
        setSelectedYear(newYear);
    }, []);

    const calculateTotalInvestment = useCallback((upToYear: string) => {
        let total = 0;
        Object.keys(yearData)
            .filter(year => year <= upToYear)
            .forEach(year => {
                if (yearData[year]?.cashTransactions) {
                    yearData[year].cashTransactions.forEach(tx => {
                        if (tx.type === 'deposit') {
                            total += tx.amount;
                        } else if (tx.type === 'withdraw') {
                            total -= tx.amount;
                        }
                    });
                }
            });
        return total;
    }, [yearData]);

    const calculateInvestmentReturn = useCallback((selectedYear: string) => {
        const totalInvestment = calculateTotalInvestment(selectedYear);
        const portfolioValue = totalValues[selectedYear] || 0;
        const absoluteReturn = portfolioValue - totalInvestment;
        const percentageReturn = totalInvestment > 0 ? (absoluteReturn / totalInvestment) * 100 : 0;

        return {
            totalInvestment,
            portfolioValue,
            absoluteReturn,
            percentageReturn
        };
    }, [calculateTotalInvestment, totalValues]);

    const renderGrowthInfo = (year: string) => {
        const growth = calculateYearGrowth(year);
        const yearIndex = years.indexOf(year);

        if (yearIndex === 0) {
            const initialInvestment = yearData[year]?.cashTransactions
                .reduce((sum, tx) => sum + (tx.type === 'deposit' ? tx.amount : tx.type === 'withdraw' ? -tx.amount : 0), 0) || 0;

            return (
                <div className="space-y-1 text-sm">
                    <p className="text-blue-500">
                        初始投入: {formatLargeNumber(initialInvestment, currency)}
                    </p>
                </div>
            );
        }

        if (!growth) return null;

        return (
            <div className="space-y-1 text-sm">
                <div className="flex items-center gap-1">
                    <p className={cn(growth.actualGrowth >= 0 ? 'text-green-500' : 'text-red-500')}>
                        较上年总增长: {formatLargeNumber(growth.actualGrowth, currency)}
                        ({growth.actualGrowthRate.toFixed(2)}%)
                    </p>
                    <TooltipProvider>
                        <UITooltip>
                            <TooltipTrigger>
                                <HelpCircle className="h-4 w-4 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>包含入金在内的总体增长金额和比例，<br />计算公式：当年总资产 - 上年总资产</p>
                            </TooltipContent>
                        </UITooltip>
                    </TooltipProvider>
                </div>

                <div className="flex items-center gap-1">
                    <p className={cn(growth.investmentGrowth >= 0 ? 'text-green-500' : 'text-red-500')}>
                        投资回报: {formatLargeNumber(growth.investmentGrowth, currency)}
                        ({growth.investmentGrowthRate.toFixed(2)}%)
                    </p>
                    <TooltipProvider>
                        <UITooltip>
                            <TooltipTrigger>
                                <HelpCircle className="h-4 w-4 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>扣除当年入金后的实际投资回报，<br />计算公式：(当年总资产 - 当年入金) - 上年总资产</p>
                            </TooltipContent>
                        </UITooltip>
                    </TooltipProvider>
                </div>

                {growth.yearDeposits > 0 && (
                    <div className="flex items-center gap-1">
                        <p className="text-blue-500">
                            当年入金: {formatLargeNumber(growth.yearDeposits, currency)}
                        </p>
                        <TooltipProvider>
                            <UITooltip>
                                <TooltipTrigger>
                                    <HelpCircle className="h-4 w-4 text-gray-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>当年新增投入的资金总额，<br />不包括股票交易产生的现金流动</p>
                                </TooltipContent>
                            </UITooltip>
                        </TooltipProvider>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-4 max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">股票投资组合追踪工具</h1>
                <div className="space-x-2">
                    {isLoggedIn ? (
                        <>
                            <Button onClick={handleSaveData}>保存数据</Button>
                            <Button onClick={handleLogout}>登出</Button>
                        </>
                    ) : (
                        <Button onClick={() => setIsLoginDialogOpen(true)}>登录</Button>
                    )}
                </div>
            </div>
            {/* Login Dialog */}
            <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>登录</DialogTitle>
                        <DialogDescription>请输入用户名和密码</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            type="text"
                            placeholder="用户名"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <Input
                            type="password"
                            placeholder="密码"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {loginError && <p className="text-red-500">{loginError}</p>}
                    </div>
                    <DialogFooter>
                        <Button onClick={handleLogin}>登录</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Save Data Dialog */}
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>确认保存数据</DialogTitle>
                        <DialogDescription>
                            <p>以下是您将要保存的增量数据预览：</p>
                            <pre className="whitespace-pre-wrap max-h-96 overflow-y-auto">
                                {JSON.stringify(incrementalChanges, null, 2)}
                            </pre>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={confirmSaveData}>确定</Button>
                        <Button onClick={() => setIsSaveDialogOpen(false)}>取消</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h2 className="text-lg font-semibold mb-2">添加新年份</h2>
                        <div className="flex gap-2">
                            <Input type="text" placeholder="例如: 2025" value={newYear}
                                onChange={(e) => setNewYear(e.target.value)} className="flex-grow" />
                            <Button onClick={addNewYear}>添加年份</Button>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold mb-2">选择年份</h2>
                        <Select onValueChange={handleYearChange} value={selectedYear}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="选择年份" /></SelectTrigger>
                            <SelectContent>{years.map((year) => <SelectItem key={year}
                                value={year}>{year}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">添加/更新现金数量 ({selectedYear}年)</h2>
                    <div className="flex gap-2">
                        <Select onValueChange={(value) => setCashTransactionType(value as 'deposit' | 'withdraw')}
                            value={cashTransactionType}>
                            <SelectTrigger className="w-32"><SelectValue placeholder="类型" /></SelectTrigger>
                            <SelectContent><SelectItem value="deposit">存入</SelectItem><SelectItem
                                value="withdraw">取出</SelectItem></SelectContent>
                        </Select>
                        <Input type="number" placeholder="金额" value={cashTransactionAmount}
                            onChange={(e) => setCashTransactionAmount(e.target.value)} className="w-32" />
                        <Button onClick={addCashTransaction}>添加现金操作</Button>
                    </div>
                    <p className={cn('text-sm mt-2', (yearData[selectedYear]?.cashBalance || 0) < 0 ? 'text-red-500' : 'text-green-500')}>
                        现金余额: {formatLargeNumber(yearData[selectedYear]?.cashBalance || 0, currency)}
                    </p>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">添加/更新股票 ({selectedYear}年)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                        <Input type="text" placeholder="股票名称" value={newStockName}
                            onChange={(e) => setNewStockName(e.target.value)} list="stockNameList" />
                        <datalist id="stockNameList">{stockSymbols.map((item) => <option key={item.symbol}
                            value={item.name} />)}</datalist>
                        <Input type="text" placeholder="股票代码 (如 BABA)" value={newStockSymbol}
                            onChange={(e) => setNewStockSymbol(e.target.value)} list="stockSymbolList" />
                        <datalist id="stockSymbolList">{stockSymbols.map((item) => <option key={item.symbol}
                            value={item.symbol} />)}</datalist>
                        <Select onValueChange={(value) => setTransactionType(value as 'buy' | 'sell')}
                            value={transactionType}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="交易类型" /></SelectTrigger>
                            <SelectContent><SelectItem value="buy">买入</SelectItem><SelectItem
                                value="sell">卖出</SelectItem></SelectContent>
                        </Select>
                        <Input type="number" placeholder="交易股数" value={newShares}
                            onChange={(e) => setNewShares(e.target.value)} />
                        <Input type="number" placeholder="交易价格" value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)} step="0.01" />
                        <Input type="number" placeholder="当前价格（可选）" value={newYearEndPrice}
                            onChange={(e) => setNewYearEndPrice(e.target.value)} step="0.01" />
                    </div>
                    <Button onClick={confirmAddNewStock} className="mt-2">添加股票</Button>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">数据操作</h2>
                    <div className="flex gap-4">
                        <Button onClick={handleCopyData}>复制数据</Button>
                        <Button onClick={handlePasteData}>粘贴数据</Button>
                        <Button onClick={() => refreshPrices(true)} disabled={isLoading} className="flex items-center gap-2">
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> 刷新价格
                        </Button>
                    </div>
                    {priceData && Object.keys(priceData).length > 0 && (
                        <p className="text-xs mt-2 text-gray-500">最后更新时间: {Object.values(priceData)[0]?.lastUpdated || '未知'}</p>
                    )}
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">选择货币</h2>
                    <Select onValueChange={setCurrency} value={currency}>
                        <SelectTrigger className="w-32"><SelectValue placeholder="选择货币" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="HKD">HKD</SelectItem>
                            {exchangeRates['CNY'] && <SelectItem value="CNY">CNY</SelectItem>}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">投资总览</h2>
                <div className="p-6 border rounded-lg bg-white shadow-sm space-y-4">
                    <div className="flex items-center gap-4">
                        <span className="text-gray-600">选择对比年份：</span>
                        <Select onValueChange={setComparisonYear} value={comparisonYear}>
                            <SelectTrigger className="w-32">
                                <SelectValue placeholder="选择年份" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((year) => (
                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {(() => {
                        const result = calculateInvestmentReturn(comparisonYear);
                        return (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-1">
                                        <div className="text-sm text-gray-500">截至{comparisonYear}年累计投入</div>
                                        <TooltipProvider>
                                            <UITooltip>
                                                <TooltipTrigger>
                                                    <HelpCircle className="h-4 w-4 text-gray-400" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>从最早记录年份至{comparisonYear}年的净投入金额<br />（所有存入金额减去取出金额）
                                                    </p>
                                                </TooltipContent>
                                            </UITooltip>
                                        </TooltipProvider>
                                    </div>
                                    <div className="text-xl font-bold text-blue-600">
                                        {formatLargeNumber(result.totalInvestment, currency)}
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-500">{comparisonYear}年总持仓</div>
                                    <div className="text-xl font-bold text-blue-600">
                                        {formatLargeNumber(result.portfolioValue, currency)}
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-500">总收益金额</div>
                                    <div className={cn(
                                        "text-xl font-bold",
                                        result.absoluteReturn >= 0 ? "text-green-600" : "text-red-600"
                                    )}>
                                        {formatLargeNumber(result.absoluteReturn, currency)}
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-500">总收益率</div>
                                    <div className={cn(
                                        "text-xl font-bold",
                                        result.percentageReturn >= 0 ? "text-green-600" : "text-red-600"
                                    )}>
                                        {result.percentageReturn.toFixed(2)}%
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <div className="text-sm text-gray-500 mt-2">
                        * 总收益基于历史累计投入资金（存入减去取出）与选定年份的总持仓价值进行计算
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">总持仓概览</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.keys(totalValues).map((year) => (
                        <div key={year} className="p-4 border rounded-lg shadow bg-white cursor-pointer"
                            onClick={() => handleReportClick(year)}>
                            <h3 className="text-lg font-medium">{year}年总持仓</h3>
                            <p className="text-2xl font-bold text-blue-600">{formatLargeNumber(totalValues[year], currency)}</p>
                            {renderGrowthInfo(year)}
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-8 p-6 border rounded-lg shadow bg-white">
                <h2 className="text-xl font-semibold mb-4">退休目标计算器</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">目标金额 ({currency})</label>
                            <Input
                                type="number"
                                value={retirementGoal}
                                onChange={(e) => setRetirementGoal(e.target.value)}
                                placeholder="输入您的退休目标金额"
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium mb-1">计算模式</label>
                            <div className="flex gap-4">
                                <Button
                                    onClick={() => setCalculationMode('rate')}
                                    className={cn(calculationMode === 'rate' ? 'bg-blue-500 text-white' : 'bg-gray-200')}
                                >
                                    输入年回报率
                                </Button>
                                <Button
                                    onClick={() => setCalculationMode('years')}
                                    className={cn(calculationMode === 'years' ? 'bg-blue-500 text-white' : 'bg-gray-200')}
                                >
                                    输入目标年限
                                </Button>
                            </div>
                        </div>
                        <div>
                            {calculationMode === 'rate' ? (
                                <div>
                                    <label className="block text-sm font-medium mb-1">预期年回报率 (%)</label>
                                    <Input
                                        type="number"
                                        value={annualReturn}
                                        onChange={(e) => setAnnualReturn(e.target.value)}
                                        placeholder="输入预期年回报率"
                                        className="w-full"
                                        step="0.1"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium mb-1">目标年限 (年)</label>
                                    <Input
                                        type="number"
                                        value={targetYears}
                                        onChange={(e) => setTargetYears(e.target.value)}
                                        placeholder="输入目标年限"
                                        className="w-full"
                                        step="1"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-medium mb-3">计算结果</h3>
                        {(() => {
                            const currentAmount = totalValues[latestYear] || 0;
                            const goalAmount = parseFloat(retirementGoal);

                            if (!goalAmount || isNaN(goalAmount)) {
                                return <p className="text-gray-500">请输入目标金额</p>;
                            }

                            if (calculationMode === 'rate') {
                                const returnRate = parseFloat(annualReturn);
                                if (!returnRate || isNaN(returnRate)) {
                                    return <p className="text-gray-500">请输入预期年回报率</p>;
                                }
                                const yearsNeeded = calculateYearsToGoal(currentAmount, goalAmount, returnRate);

                                return (
                                    <div className="space-y-2">
                                        <p>当前总资产: <span
                                            className="font-semibold">{formatLargeNumber(currentAmount, currency)}</span>
                                        </p>
                                        <p>目标金额: <span
                                            className="font-semibold">{formatLargeNumber(goalAmount, currency)}</span>
                                        </p>
                                        <p>差距金额: <span
                                            className="font-semibold">{formatLargeNumber(goalAmount - currentAmount, currency)}</span>
                                        </p>
                                        <p>预期年回报率: <span className="font-semibold">{returnRate}%</span></p>
                                        {yearsNeeded === Infinity ? (
                                            <p className="text-red-500">无法达到目标（回报率过低）</p>
                                        ) : yearsNeeded === 0 ? (
                                            <p className="text-green-500">已达到目标！</p>
                                        ) : (
                                            <p>预计需要 <span
                                                className="font-semibold text-blue-600">{yearsNeeded.toFixed(1)}</span> 年可达到目标
                                            </p>
                                        )}
                                    </div>
                                );
                            } else {
                                const years = parseFloat(targetYears);
                                if (!years || isNaN(years)) {
                                    return <p className="text-gray-500">请输入目标年限</p>;
                                }
                                const requiredRate = calculateRequiredReturnRate(currentAmount, goalAmount, years);

                                return (
                                    <div className="space-y-2">
                                        <p>当前总资产: <span
                                            className="font-semibold">{formatLargeNumber(currentAmount, currency)}</span>
                                        </p>
                                        <p>目标金额: <span
                                            className="font-semibold">{formatLargeNumber(goalAmount, currency)}</span>
                                        </p>
                                        <p>差距金额: <span
                                            className="font-semibold">{formatLargeNumber(goalAmount - currentAmount, currency)}</span>
                                        </p>
                                        <p>目标年限: <span className="font-semibold">{years}</span> 年</p>
                                        {currentAmount >= goalAmount ? (
                                            <p className="text-green-500">已达到目标！</p>
                                        ) : requiredRate > 100 ? (
                                            <p className="text-red-500">年限过短，需要的回报率过高（超过100%）</p>
                                        ) : (
                                            <p>需要年回报率: <span
                                                className="font-semibold text-blue-600">{requiredRate.toFixed(2)}%</span>
                                            </p>
                                        )}
                                    </div>
                                );
                            }
                        })()}
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">图表类型</h2>
                <div className="flex gap-4 mb-4">
                    <Button onClick={() => setShowPositionChart(true)}
                        className={cn('px-4 py-2 rounded', showPositionChart ? 'bg-blue-500 text-white' : 'bg-gray-200')}>
                        仓位变化图（折线图）
                    </Button>
                    <Button onClick={() => setShowPositionChart(false)}
                        className={cn('px-4 py-2 rounded', !showPositionChart ? 'bg-blue-500 text-white' : 'bg-gray-200')}>
                        股票占比图（柱状图）
                    </Button>
                </div>
                <h2 className="text-xl font-semibold mb-4">{showPositionChart ? '各股票仓位变化（按年）' : '各股票仓位占比（按年）'}</h2>
                <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {showPositionChart ? (
                            <LineChart data={lineChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis tickCount={5} tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => {
                                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                                        return value.toFixed(0);
                                    }} />
                                <Tooltip
                                    formatter={(value: number, name: string) => [
                                        formatLargeNumber(value, currency),
                                        name === 'total' ? '总计' : name
                                    ]}
                                    labelFormatter={(label) => `${label}年`}
                                />
                                <Legend onClick={handleLegendClick} formatter={(value) => value === 'total' ? '总计' : value} />
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
                                <Legend onClick={handleLegendClick} formatter={(value) => value === 'total' ? '总计' : value} />
                                {years
                                    .map((year, index) => (
                                        <Bar
                                            key={year}
                                            dataKey={year}
                                            name={`${year}年占比`}
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
                <div className="overflow-x-auto relative">
                    <table className="min-w-full border-collapse border border-gray-300">
                        <colgroup>
                            <col style={{ width: '50px' }} />
                            <col style={{ width: '200px' }} />
                            {years.map((year) => (
                                <col key={year} />
                            ))}
                            <col style={{ width: '100px' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th className="sticky left-0 z-20 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-100">
                                    {table.headers[0]}
                                </th>
                                <th className="sticky left-[50px] z-20 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-100">
                                    {table.headers[1]}
                                </th>
                                {table.headers.slice(2, -1).map((header, index) => (
                                    <th key={index}
                                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-50">
                                        {header}
                                    </th>
                                ))}
                                <th className="sticky right-0 z-20 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-100">
                                    {table.headers[table.headers.length - 1]}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {table.rows.map((row, rowIndex) => {
                                const stockName = (row[1] as { name: string }).name;
                                const isHidden = hiddenStocks[stockName];

                                return (
                                    <tr key={rowIndex} className={cn(
                                        rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                                        isHidden && 'opacity-50'
                                    )}>
                                        <td className="sticky left-0 z-10 px-6 py-4 whitespace-nowrap text-center bg-inherit">
                                            <Button size="icon" onClick={() => toggleStockVisibility(stockName)}
                                                className="text-gray-500 hover:text-gray-700">
                                                {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </td>
                                        <td className="sticky left-[50px] z-10 px-6 py-4 whitespace-nowrap bg-inherit">
                                            {editingStockName === stockName ? (
                                                <div className="space-y-2">
                                                    <div><label className="text-sm">股票名称</label>
                                                        <Input type="text" value={stockName} disabled className="w-32" />
                                                    </div>
                                                    <div><label className="text-sm">股票代码</label>
                                                        <Input type="text"
                                                            value={editedRowData?.[selectedYear]?.symbol || (row[1] as {
                                                                symbol?: string
                                                            }).symbol || ''}
                                                            onChange={(e) => handleInputChange(selectedYear, 'symbol', e.target.value)}
                                                            className="w-32" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="font-medium">{(row[1] as { name: string }).name}</div>
                                                    {(row[1] as { symbol?: string }).symbol && (
                                                        <div className="text-sm text-gray-500">{(row[1] as {
                                                            symbol?: string
                                                        }).symbol}</div>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                        {row.slice(2, -1).map((cell, cellIndex) => {
                                            const year = years[cellIndex];
                                            const isEditing = editingStockName === stockName;

                                            if (isEditing) {
                                                return (
                                                    <td key={cellIndex} className="px-6 py-4 whitespace-nowrap space-y-1 bg-inherit">
                                                        <div><label className="text-sm">数量</label><Input type="number" value={editedRowData?.[year]?.quantity || ''} onChange={(e) => handleInputChange(year, 'quantity', e.target.value)} className="w-24" /></div>
                                                        <div><label className="text-sm">价格</label><Input type="number" value={editedRowData?.[year]?.unitPrice || ''} onChange={(e) => handleInputChange(year, 'unitPrice', e.target.value)} className="w-24" /></div>
                                                        <div><label className="text-sm">成本</label><Input type="number" value={editedRowData?.[year]?.costPrice || ''} onChange={(e) => handleInputChange(year, 'costPrice', e.target.value)} className="w-24" /></div>
                                                    </td>
                                                );
                                            } else if (cell) {
                                                const stockData = cell as { shares: number; price: number; costPrice: number; symbol?: string };
                                                const { shares, price, costPrice, symbol } = stockData;

                                                // Check if the last refresh was within 120 seconds
                                                const isLatestPrice = year === latestYear && lastRefreshTime
                                                ? (new Date().getTime() - lastRefreshTime.getTime()) / 1000 < 120
                                                : false;

                                                return (
                                                    <td key={cellIndex} className="px-6 py-4 whitespace-nowrap space-y-1 bg-inherit">
                                                        <div className="font-medium">
                                                            当前价值: {formatLargeNumber(shares * price, currency)} ({shares} * {formatLargeNumber(price, currency)})
                                                            {isLatestPrice && <span className="ml-2 text-xs text-green-500">实时</span>}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            成本: {formatLargeNumber(shares * costPrice, currency)} ({shares} * {formatLargeNumber(costPrice, currency)})
                                                        </div>
                                                    </td>
                                                );
                                            } else {
                                                return <td key={cellIndex} className="px-6 py-4 whitespace-nowrap bg-inherit"> - </td>;
                                            }
                                        })}
                                        <td className="sticky right-0 z-10 px-6 py-4 whitespace-nowrap space-x-2 bg-inherit">
                                            {editingStockName === stockName ? (
                                                <Button size="icon" onClick={() => handleSaveRow(stockName)}
                                                    className="text-green-500 hover:text-green-700">
                                                    <Save className="h-4 w-4" />
                                                </Button>
                                            ) : (
                                                <Button size="icon" onClick={() => handleEditRow(stockName)}
                                                    className="text-blue-500 hover:text-blue-700">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button size="icon" onClick={() => handleDeleteStock(stockName)}
                                                className="text-red-500 hover:text-red-700">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td className="sticky left-0 z-10 px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider bg-gray-100">
                                    {table.totalRow[0]}
                                </td>
                                <td className="sticky left-[50px] z-10 px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider bg-gray-100">
                                    {table.totalRow[1]}
                                </td>
                                {years.map((year, index) => (
                                    <td key={year}
                                        className="px-6 py-3 text-center text-sm font-semibold uppercase tracking-wider bg-gray-100">
                                        {yearData[year] && yearData[year].stocks
                                            ? formatLargeNumber(
                                                yearData[year].stocks.reduce(
                                                    (acc, stock) => hiddenStocks[stock.name] ? acc : acc + stock.shares * stock.price,
                                                    0
                                                ) + (yearData[year].cashBalance || 0),
                                                currency
                                            )
                                            : '-'}
                                    </td>
                                ))}
                                <td className="sticky right-0 z-10 px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider bg-gray-100">
                                    {table.totalRow[table.totalRow.length - 1]}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {renderReportDialog()}

            <Dialog open={alertInfo?.isOpen} onOpenChange={(open) => {
                if (!open) setAlertInfo(null);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{alertInfo?.title}</DialogTitle>
                        <DialogDescription>
                            <pre className="whitespace-pre-wrap">{alertInfo?.description}</pre>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end space-x-2">
                        {alertInfo?.onConfirm && (
                            <Button onClick={alertInfo.onConfirm}>
                                {alertInfo.confirmText || '确定'}
                            </Button>
                        )}
                        {alertInfo?.onCancel && (
                            <Button onClick={alertInfo.onCancel}>
                                {alertInfo.cancelText || '取消'}
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>复制数据</DialogTitle>
                        <DialogDescription>
                            <p>请点击下方文本框，使用 Command + A 全选内容，或直接点击"复制到剪贴板"按钮。</p>
                            <textarea className="w-full h-64 p-2 mt-2 border rounded resize-none"
                                value={JSON.stringify(yearData, null, 2)} readOnly />
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end space-x-2">
                        <Button
                            onClick={() => navigator.clipboard.writeText(JSON.stringify(yearData, null, 2))}>复制到剪贴板</Button>
                        <Button onClick={() => setIsCopyDialogOpen(false)}>关闭</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isPasteDialogOpen} onOpenChange={setIsPasteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>粘贴数据</DialogTitle>
                        <DialogDescription>
                            <textarea className="w-full h-32 p-2 border rounded" value={pasteData}
                                onChange={(e) => setPasteData(e.target.value)}
                                placeholder="请将数据粘贴到此处..." />
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