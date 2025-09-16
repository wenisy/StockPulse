"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
import {
  CashTransaction,
  ExchangeRates,
  IncrementalChanges,
  PriceData,
  StockChartData,
  StockSymbol,
  StockTransaction,
  StockValueMap,
  User,
  YearData,
} from "@/types/stock";
import { RefreshCw, MoreHorizontal } from "lucide-react";
import React, { useCallback, useEffect, useState, useRef } from "react";
import RetirementCalculator from "./RetirementCalculator";
import { useUserSettings } from "@/hooks/useUserSettings";
import UserProfileManager, { UserProfileManagerHandle } from "./UserProfileManager";

import { v4 as uuidv4 } from "uuid";
import { stockInitialData } from "./data";
import GrowthInfo from "./GrowthInfo";
import ReportDialog from "./ReportDialog";
import InvestmentOverview from "./InvestmentOverview";
import StockCharts from "./StockCharts";
import StockTable from "./StockTable";

const StockPortfolioTracker: React.FC = () => {
  const initialData: { [year: string]: YearData } = stockInitialData;

  const [yearData, setYearData] = useState<{ [year: string]: YearData }>(
    initialData
  );
  const [years, setYears] = useState<string[]>(
    Object.keys(initialData).sort((a, b) => parseInt(b) - parseInt(a))
  );
  const [filteredYears, setFilteredYears] = useState<string[]>(
    Object.keys(initialData).sort((a, b) => parseInt(b) - parseInt(a))
  );
  // 年份筛选状态
  const [setYearFilter] = useState<(value: string) => void>(
    () => (value: string) => {
      if (value === "all") {
        setFilteredYears(years);
      } else {
        // 单选模式
        setFilteredYears([value]);
      }
    }
  );
  const [newYear, setNewYear] = useState("");
  const [newStockName, setNewStockName] = useState("");
  const [newShares, setNewShares] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newYearEndPrice, setNewYearEndPrice] = useState("");
  const [newStockSymbol, setNewStockSymbol] = useState("");
  const [selectedYear, setSelectedYear] = useState(years[years.length - 1]);
  const [showPositionChart, setShowPositionChart] = useState(true);
  const [editingStockName, setEditingStockName] = useState<string | null>(null);
  const [editedRowData, setEditedRowData] = useState<{
    [year: string]: {
      quantity: string;
      unitPrice: string;
      costPrice: string;
      symbol?: string;
    };
  } | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<{
    [dataKey: string]: boolean;
  }>({});
  const [hiddenStocks, setHiddenStocks] = useState<{
    [stockName: string]: boolean;
  }>({});
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
  const [transactionType, setTransactionType] = useState<"buy" | "sell">("buy");
  const [cashTransactionAmount, setCashTransactionAmount] = useState("");
  const [cashTransactionType, setCashTransactionType] = useState<
    "deposit" | "withdraw"
  >("deposit");
  const [isCashTransactionLoading, setIsCashTransactionLoading] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedReportYear, setSelectedReportYear] = useState<string | null>(
    null
  );
  const [stockSymbols, setStockSymbols] = useState<StockSymbol[]>([]);
  const [priceData, setPriceData] = useState<PriceData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    USD: 1,
    HKD: 0.12864384,
    CNY: 0.14,
  });
  // 使用自定义Hook管理退休目标计算器相关状态
  // 获取平均年化收益率
  const getLatestYearGrowthRate = useCallback(() => {
    if (years.length < 1) return "";

    // 年份数组已经按照降序排列（最新的在前）
    const latestYear = years[0];
    const earliestYear = years[years.length - 1];

    // 计算投资年数（包括可能缺失的年份）
    const investmentYears = parseInt(latestYear) - parseInt(earliestYear) + 1;

    // 计算总价值函数
    const calculateTotalValue = (year: string) => {
      if (!yearData[year]?.stocks) return 0;
      const stockValue = yearData[year].stocks.reduce(
        (acc, stock) => acc + stock.shares * stock.price,
        0
      );
      return stockValue + (yearData[year].cashBalance || 0);
    };

    // 获取最新年份的总价值
    const currentValue = calculateTotalValue(latestYear);

    // 计算所有年份的累计投入现金
    let totalDeposits = 0;
    years.forEach((year) => {
      const deposits =
        yearData[year]?.cashTransactions.reduce(
          (sum, tx) => sum + (tx.type === "deposit" ? tx.amount : 0),
          0
        ) || 0;
      totalDeposits += deposits;
    });

    // 计算所有年份的累计提取现金
    let totalWithdrawals = 0;
    years.forEach((year) => {
      const withdrawals =
        yearData[year]?.cashTransactions.reduce(
          (sum, tx) => sum + (tx.type === "withdraw" ? tx.amount : 0),
          0
        ) || 0;
      totalWithdrawals += withdrawals;
    });

    // 累计净投入现金
    const netDeposits = totalDeposits - totalWithdrawals;

    if (netDeposits <= 0) return "";

    // 计算总收益率 = (当前总持仓价值 - 累计投入现金) / 累计投入现金
    const totalReturn = (currentValue - netDeposits) / netDeposits;

    // 计算复合年增长率(CAGR)
    // 公式：CAGR = ((1 + 总收益率)^(1/投资年数)) - 1
    const annualizedReturn =
      (Math.pow(1 + totalReturn, 1 / investmentYears) - 1) * 100;

    return annualizedReturn.toFixed(2);
  }, [years, yearData]);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const userProfileRef = useRef<UserProfileManagerHandle>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 使用自定义Hook管理退休目标计算器相关状态
  const {
    retirementGoal,
    annualReturn,
    targetYears,
    calculationMode,
    updateRetirementGoal,
    updateAnnualReturn,
    updateTargetYears,
    updateCalculationMode,
    loadUserSettings,
  } = useUserSettings(currentUser, isLoggedIn, setCurrentUser);
  const [comparisonYear, setComparisonYear] = useState<string>(years[0]);

  const latestYear =
    years.length > 0 ? Math.max(...years.map(Number)).toString() : "2024";

  const backendDomain = "//stock-backend-tau.vercel.app";

  // 增量变化跟踪
  const [incrementalChanges, setIncrementalChanges] =
    useState<IncrementalChanges>({
      stocks: {},
      cashTransactions: {},
      stockTransactions: {},
      yearlySummaries: {},
    });

  // --- Check Login Status on Mount ---
  useEffect(() => {
    const initializeData = async () => {
      const token = localStorage.getItem("token");
      const userJson = localStorage.getItem("user");
      let user: User | null = null;

      if (userJson) {
        try {
          user = JSON.parse(userJson);
          setCurrentUser(user);
          // 加载用户的退休目标计算器设置
          loadUserSettings(user);
        } catch (error) {
          console.error("解析用户数据失败:", error);
        }
      }

      if (token) {
        setIsLoggedIn(true);
        try {
          await fetchJsonData(token);
          setIsLoading(true);
          await refreshPrices(false);
          setIsLoading(false);
        } catch (error) {
          console.error("初始化登录态数据失败:", error);
          setAlertInfo({
            isOpen: true,
            title: "数据加载失败",
            description: "无法从服务器获取数据，请稍后重试",
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
          console.error("获取股票符号失败:", error);
        }
        try {
          const pricesUrl = `${getBasePath()}/data/prices.json`;
          const timestamp = new Date().getTime();
          const pricesResponse = await fetch(`${pricesUrl}?t=${timestamp}`);
          if (pricesResponse.ok) {
            const pricesData = await pricesResponse.json();
            setPriceData(pricesData);
            const rates: ExchangeRates = {
              USD: 1,
              HKD: pricesData["HKD"]?.price || 0,
              CNY: pricesData["CNY"]?.price || 0,
            };
            setExchangeRates(rates);
            updateLatestPrices(pricesData);
          }
        } catch (error) {
          console.error("获取最新价格时出错:", error);
        }
      }
    };

    initializeData();
  }, []);

  // --- Fetch Data from Backend ---
  const fetchJsonData = async (token: string) => {
    try {
      const response = await fetch(`${backendDomain}/api/data`, {
        headers: {
          Authorization: token,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setYearData(data);
        const sortedYears = Object.keys(data).sort(
          (a, b) => parseInt(b) - parseInt(a)
        );
        setYears(sortedYears);
        setFilteredYears(sortedYears);
        setSelectedYear(sortedYears[0]);
        setComparisonYear(sortedYears[0]);
      } else {
        // Check for invalid/expired token
        if (
          response.status === 401 ||
          (data.message && data.message.includes("无效或过期的令牌"))
        ) {
          console.warn("Token invalid or expired. Logging out.");
          // 清除本地存储并重置状态
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setIsLoggedIn(false);
          setCurrentUser(null);
          setYearData(stockInitialData);
          const sortedYears = Object.keys(stockInitialData).sort(
            (a, b) => parseInt(b) - parseInt(a)
          );
          setYears(sortedYears);
          setFilteredYears(sortedYears);
          setSelectedYear(sortedYears[0]);
          setComparisonYear(sortedYears[0]);

          setAlertInfo({
            // Inform the user
            isOpen: true,
            title: "会话已过期",
            description: "您的登录已过期，请重新登录。",
            onConfirm: () => setAlertInfo(null),
          });
        } else {
          console.error("获取数据失败:", data.message || response.statusText);
        }
      }
    } catch (error) {
      console.error("获取数据时出错:", error);
    }
  };

  // 实际保存数据到后端的函数（自动保存）
  const saveDataToBackend = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${backendDomain}/api/updateNotion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify(incrementalChanges),
      });
      const result = await response.json();
      if (response.ok) {
        // 清空增量变化
        setIncrementalChanges({
          stocks: {},
          cashTransactions: {},
          stockTransactions: {},
          yearlySummaries: {},
        });

        // 不显示成功提示，保持无感知自动保存
        console.log("数据已自动保存");
      } else {
        // 自动保存失败时显示提示
        setAlertInfo({
          isOpen: true,
          title: "自动保存失败",
          description: result.message || "保存数据时发生错误",
          onConfirm: () => setAlertInfo(null),
        });
      }
    } catch (error) {
      setAlertInfo({
        isOpen: true,
        title: "自动保存失败",
        description: "网络错误，请稍后再试",
        onConfirm: () => setAlertInfo(null),
      });
    }
  };

  const getBasePath = () => {
    if (typeof window !== "undefined") {
      // 如果是GitHub Pages默认域名，使用/StockPulse前缀
      if (window.location.hostname.includes("github.io")) {
        return "/StockPulse";
      }
      // 如果是自定义域名，不使用前缀
      if (window.location.hostname === "stock.nodal.link") {
        return "";
      }
    }
    return "";
  };

  const updateLatestPrices = (prices: PriceData) => {
    setYearData((prevYearData) => {
      const updatedYearData = { ...prevYearData };
      if (updatedYearData[latestYear] && updatedYearData[latestYear].stocks) {
        updatedYearData[latestYear].stocks.forEach((stock) => {
          if (stock.symbol && prices[stock.symbol]) {
            if (prices[stock.symbol].currency === "HKD") {
              stock.price = prices[stock.symbol].price * exchangeRates["HKD"];
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
      const latestYear = new Date().getFullYear().toString();
      const latestStocks = yearData[latestYear]?.stocks || [];
      const symbols = latestStocks.map((stock) => stock.symbol).filter(Boolean);

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
          "Content-Type": "application/json",
          ...(token ? { Authorization: token } : {}),
        } as Record<string, string>,
        body: JSON.stringify({ symbols }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const stockData = result.data;

        setYearData((prevYearData) => {
          const updatedYearData = { ...prevYearData };
          if (
            updatedYearData[latestYear] &&
            updatedYearData[latestYear].stocks
          ) {
            updatedYearData[latestYear].stocks.forEach((stock) => {
              if (stock.symbol && stockData[stock.symbol]) {
                stock.price = stockData[stock.symbol].price;
              }
            });
          }
          return updatedYearData;
        });

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

  const convertToCurrency = (
    amount: number,
    targetCurrency: string
  ): number => {
    const rate = exchangeRates[targetCurrency] || 1;
    return amount / rate;
  };

  const formatLargeNumber = (num: number, targetCurrency: string) => {
    const convertedNum = convertToCurrency(num, targetCurrency);
    return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(
      convertedNum
    );
  };

  const calculateYearlyValues = useCallback(() => {
    const yearlyValues: {
      [year: string]: { [stockName: string]: number; total: number };
    } = {};
    Object.keys(yearData).forEach((year) => {
      yearlyValues[year] = { total: 0 };
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
      yearlyValues[year]["total"] = yearTotal;
    });
    return yearlyValues;
  }, [yearData, hiddenStocks]);

  const calculateTotalValues = useCallback(() => {
    const totalValues: { [year: string]: number } = {};
    Object.keys(yearData).forEach((year) => {
      if (yearData[year] && yearData[year].stocks) {
        const stockValue = yearData[year].stocks.reduce(
          (acc, stock) =>
            hiddenStocks[stock.name] ? acc : acc + stock.shares * stock.price,
          0
        );
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
      yearData[latestYear].stocks.forEach((stock) => {
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
      dataPoint["total"] = yearlyValues[year]["total"];
      return dataPoint;
    });
  }, [calculateYearlyValues, yearData, latestYear, hiddenStocks]);

  const preparePercentageBarChartData = useCallback(() => {
    const result: StockChartData[] = [];
    const yearTotals: { [year: string]: number } = {};

    Object.keys(yearData).forEach((year) => {
      if (yearData[year] && yearData[year].stocks) {
        yearTotals[year] = yearData[year].stocks.reduce(
          (total, stock) =>
            hiddenStocks[stock.name]
              ? total
              : total + stock.shares * stock.price,
          0
        );
      } else {
        yearTotals[year] = 0;
      }
    });

    const latestStocks = new Set<string>();
    if (yearData[latestYear] && yearData[latestYear].stocks) {
      yearData[latestYear].stocks.forEach((stock) => {
        if (!hiddenStocks[stock.name]) {
          latestStocks.add(stock.name);
        }
      });
    }

    latestStocks.forEach((stockName) => {
      const stockData: StockChartData = { name: stockName };

      Object.keys(yearData).forEach((year) => {
        if (yearData[year] && yearData[year].stocks) {
          const stockInYear = yearData[year].stocks.find(
            (s) => s.name === stockName
          );
          const stockValue = stockInYear
            ? stockInYear.shares * stockInYear.price
            : 0;
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
      const referenceYear = years
        .filter((y) => y < trimmedYear)
        .sort((a, b) => b.localeCompare(a))[0];

      const cashToCarryOver = referenceYear
        ? yearData[referenceYear]?.cashBalance || 0
        : 0;

      const newYearDataItem: YearData = {
        stocks: [],
        cashTransactions: [],
        stockTransactions: [],
        cashBalance: 0,
      };

      if (cashToCarryOver > 0) {
        newYearDataItem.cashTransactions.push({
          amount: cashToCarryOver,
          type: "deposit",
          date: new Date().toISOString().split("T")[0],
          description: "上年结余",
        });
        newYearDataItem.cashBalance = cashToCarryOver;
      }

      setYearData({ ...yearData, [trimmedYear]: newYearDataItem });
      const newYears = [...years, trimmedYear].sort(
        (a, b) => parseInt(b) - parseInt(a)
      );
      setYears(newYears);
      setFilteredYears(newYears);
      setNewYear("");
      setSelectedYear(trimmedYear);

      // 记录新增年份的增量变化
      setIncrementalChanges((prev) => {
        return {
          ...prev,
          yearlySummaries: {
            ...prev.yearlySummaries,
            [trimmedYear]: { cashBalance: cashToCarryOver },
          },
        };
      });
    }
  };

  const addCashTransaction = async () => {
    if (!cashTransactionAmount || !selectedYear || isCashTransactionLoading) return;
    const amount = parseFloat(cashTransactionAmount);
    if (isNaN(amount)) return;

    // 设置加载状态，防止重复点击
    setIsCashTransactionLoading(true);

    try {
      const cashTransaction: CashTransaction = {
        amount: cashTransactionType === "deposit" ? amount : -amount,
        type: cashTransactionType,
        date: new Date().toISOString().split("T")[0],
        userUuid: currentUser?.uuid,
      };

      setYearData((prevYearData) => {
        const updatedYearData = { ...prevYearData };
        if (!updatedYearData[selectedYear]) {
          updatedYearData[selectedYear] = {
            stocks: [],
            cashTransactions: [],
            stockTransactions: [],
            cashBalance: 0,
          };
        }
        updatedYearData[selectedYear].cashTransactions.push(cashTransaction);
        updatedYearData[selectedYear].cashBalance =
          (updatedYearData[selectedYear].cashBalance || 0) +
          cashTransaction.amount;
        return updatedYearData;
      });

      // 记录增量变化 - 添加去重检查
      setIncrementalChanges((prev) => {
        const existingTransactions = prev.cashTransactions[selectedYear] || [];

        // 检查是否已存在相同的交易（基于金额、类型、日期）
        const isDuplicate = existingTransactions.some(tx =>
          tx.amount === cashTransaction.amount &&
          tx.type === cashTransaction.type &&
          tx.date === cashTransaction.date &&
          Math.abs(new Date(tx.date).getTime() - new Date(cashTransaction.date).getTime()) < 1000 // 1秒内的交易视为重复
        );

        if (isDuplicate) {
          console.log('检测到重复的现金交易，跳过添加');
          return prev;
        }

        return {
          ...prev,
          cashTransactions: {
            ...prev.cashTransactions,
            [selectedYear]: [
              ...existingTransactions,
              cashTransaction,
            ],
          },
          yearlySummaries: {
            ...prev.yearlySummaries,
            [selectedYear]: {
              cashBalance:
                (yearData[selectedYear]?.cashBalance || 0) +
                cashTransaction.amount,
            },
          },
        };
      });

      setCashTransactionAmount("");

      // 显示成功提示
      setAlertInfo({
        isOpen: true,
        title: "操作成功",
        description: `已${cashTransactionType === "deposit" ? "存入" : "取出"}现金 $${Math.abs(amount).toFixed(2)}`,
        onConfirm: () => setAlertInfo(null),
        confirmText: "确定"
      });

    } catch (error) {
      console.error('添加现金交易失败:', error);
      setAlertInfo({
        isOpen: true,
        title: "操作失败",
        description: "添加现金交易时发生错误，请稍后重试",
        onConfirm: () => setAlertInfo(null),
        confirmText: "确定"
      });
    } finally {
      // 延迟重置加载状态，防止快速重复点击
      setTimeout(() => {
        setIsCashTransactionLoading(false);
      }, 1000);
    }
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
      updatedYearData[selectedYear] = {
        stocks: [],
        cashTransactions: [],
        stockTransactions: [],
        cashBalance: 0,
      };
    }

    const currentStock = updatedYearData[selectedYear].stocks?.find(
      (s) => s.name === stockName
    );
    const oldShares = currentStock ? currentStock.shares : 0;
    const oldCostPrice = currentStock ? currentStock.costPrice : 0;
    const oldTotalCost = oldShares * oldCostPrice;

    let newSharesValue = 0;
    let newTotalCost = 0;
    let newCostPrice = 0;
    let transactionCost = 0;

    if (transactionType === "buy") {
      newSharesValue = oldShares + transactionShares;
      transactionCost = transactionShares * transactionPrice;

      newTotalCost = oldTotalCost + transactionCost;
      newCostPrice = newSharesValue > 0 ? newTotalCost / newSharesValue : 0;

      if ((updatedYearData[selectedYear].cashBalance || 0) < transactionCost) {
        setAlertInfo({
          isOpen: true,
          title: "现金不足",
          description: "购买股票的现金不足，现金余额将变为负数",
          onConfirm: () => {
            updatedYearData[selectedYear].cashBalance =
              (updatedYearData[selectedYear].cashBalance || 0) -
              transactionCost;
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
          title: "卖出失败",
          description: "卖出股数超过持有股数",
          onCancel: () => setAlertInfo(null),
        });
        return;
      }

      newSharesValue = oldShares - transactionShares;
      transactionCost = transactionShares * transactionPrice;

      const sellProceeds = transactionPrice * transactionShares;
      newTotalCost = oldTotalCost - sellProceeds;
      newCostPrice = newSharesValue > 0 ? newTotalCost / newSharesValue : 0;
    }

    const displayYearEndPrice =
      yearEndPrice !== null
        ? yearEndPrice
        : currentStock
        ? currentStock.price
        : transactionPrice;
    const displayYearEndPriceText =
      yearEndPrice !== null
        ? displayYearEndPrice.toFixed(2)
        : `${displayYearEndPrice.toFixed(2)}（未填入）`;

    let profitInfo = "";
    if (transactionType === "sell" && oldCostPrice > 0) {
      const profit = (transactionPrice - oldCostPrice) * transactionShares;
      const profitPercentage = (transactionPrice / oldCostPrice - 1) * 100;
      profitInfo = `
          预计盈利: ${profit.toFixed(2)} (${profitPercentage.toFixed(2)}%)`;
    }

    const description = `
          股票: ${stockName}
          交易类型: ${transactionType === "buy" ? "买入" : "卖出"}
          股数: ${transactionShares}
          交易价格: ${transactionPrice.toFixed(2)}
          当前价格: ${displayYearEndPriceText}
          原成本价: ${oldCostPrice.toFixed(2)}
          新成本价: ${newCostPrice.toFixed(2)}${profitInfo}
          ${stockSymbol ? `股票代码: ${stockSymbol}` : ""}
        `;

    setAlertInfo({
      isOpen: true,
      title: "确认交易",
      description,
      onConfirm: () => {
        if (transactionType === "buy") {
          updatedYearData[selectedYear].cashBalance =
            (updatedYearData[selectedYear].cashBalance || 0) - transactionCost;
        } else {
          updatedYearData[selectedYear].cashBalance =
            (updatedYearData[selectedYear].cashBalance || 0) + transactionCost;
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
    transactionType: "buy" | "sell",
    symbol?: string,
    beforeCostPrice?: number
  ) => {
    if (!updatedYearData[year]) {
      updatedYearData[year] = {
        stocks: [],
        cashTransactions: [],
        stockTransactions: [],
        cashBalance: 0,
      };
    }

    if (!updatedYearData[year].stocks) {
      updatedYearData[year].stocks = [];
    }

    const stockIndex = updatedYearData[year].stocks.findIndex(
      (s) => s.name === stockName
    );
    const stockData = {
      name: stockName,
      shares,
      price,
      costPrice,
      id:
        stockIndex !== -1
          ? updatedYearData[year].stocks[stockIndex].id
          : uuidv4(),
      symbol:
        symbol ||
        (stockIndex !== -1
          ? updatedYearData[year].stocks[stockIndex].symbol
          : ""),
      userUuid: currentUser?.uuid,
    };

    if (stockIndex !== -1) {
      updatedYearData[year].stocks[stockIndex] = stockData;
      if (shares <= 0) {
        updatedYearData[year].stocks = updatedYearData[year].stocks.filter(
          (_, i) => i !== stockIndex
        );
      }
    } else if (shares > 0) {
      updatedYearData[year].stocks.push(stockData);
    }

    const stockTransaction: StockTransaction = {
      stockName,
      type: transactionType,
      shares: transactionShares,
      price: transactionPrice,
      date: new Date().toISOString().split("T")[0],
      beforeCostPrice: beforeCostPrice ?? 0,
      afterCostPrice: costPrice,
      userUuid: currentUser?.uuid,
    };
    updatedYearData[year].stockTransactions.push(stockTransaction);

    const cashTransaction: CashTransaction = {
      amount:
        transactionType === "buy"
          ? -transactionShares * transactionPrice
          : transactionShares * transactionPrice,
      type: transactionType,
      date: new Date().toISOString().split("T")[0],
      stockName,
      userUuid: currentUser?.uuid,
    };
    updatedYearData[year].cashTransactions.push(cashTransaction);

    // 记录增量变化
    setIncrementalChanges((prev) => {
      return {
        ...prev,
        stocks: {
          ...prev.stocks,
          [year]: [...(prev.stocks[year] || []), stockData],
        },
        stockTransactions: {
          ...prev.stockTransactions,
          [year]: [...(prev.stockTransactions[year] || []), stockTransaction],
        },
        cashTransactions: {
          ...prev.cashTransactions,
          [year]: [...(prev.cashTransactions[year] || []), cashTransaction],
        },
        yearlySummaries: {
          ...prev.yearlySummaries,
          [year]: { cashBalance: updatedYearData[year].cashBalance },
        },
      };
    });
  };

  const resetForm = () => {
    setNewStockName("");
    setNewShares("");
    setNewPrice("");
    setNewYearEndPrice("");
    setNewStockSymbol("");
    setTransactionType("buy");
  };

  const handleEditRow = (stockName: string) => {
    setEditingStockName(stockName);
    const initialEditedData: {
      [year: string]: {
        quantity: string;
        unitPrice: string;
        costPrice: string;
        symbol?: string;
      };
    } = {};
    years.forEach((year) => {
      if (yearData[year] && yearData[year].stocks) {
        const stock = yearData[year].stocks.find((s) => s.name === stockName);
        initialEditedData[year] = {
          quantity: stock?.shares?.toString() || "",
          unitPrice: stock?.price?.toString() || "",
          costPrice: stock?.costPrice?.toString() || "",
          symbol: stock?.symbol || "",
        };
      } else {
        initialEditedData[year] = {
          quantity: "",
          unitPrice: "",
          costPrice: "",
          symbol: "",
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
          updatedYearData[year] = {
            stocks: [],
            cashTransactions: [],
            stockTransactions: [],
            cashBalance: 0,
          };
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
          const stockIndex = updatedYearData[year].stocks.findIndex(
            (s) => s.name === stockName
          );
          if (stockIndex !== -1) {
            updatedYearData[year].stocks[stockIndex] = {
              ...updatedYearData[year].stocks[stockIndex],
              shares,
              price,
              costPrice,
              symbol,
            };
          } else {
            updatedYearData[year].stocks.push({
              name: stockName,
              shares,
              price,
              costPrice,
              id: uuidv4(),
              symbol,
              userUuid: currentUser?.uuid,
            });
          }

          // 记录增量变化
          setIncrementalChanges((prev) => {
            return {
              ...prev,
              stocks: {
                ...prev.stocks,
                [year]: [
                  ...(prev.stocks[year] || []),
                  {
                    name: stockName,
                    shares,
                    price,
                    costPrice,
                    symbol,
                    id: uuidv4(),
                    userUuid: currentUser?.uuid,
                  },
                ],
              },
              yearlySummaries: {
                ...prev.yearlySummaries,
                [year]: { cashBalance: updatedYearData[year].cashBalance },
              },
            };
          });
        } else if (updatedYearData[year].stocks) {
          updatedYearData[year].stocks = updatedYearData[year].stocks.filter(
            (s) => s.name !== stockName
          );
        }
      });
      return updatedYearData;
    });
    setEditingStockName(null);
    setEditedRowData(null);
  };

  const handleInputChange = (
    year: string,
    field: "quantity" | "unitPrice" | "costPrice" | "symbol",
    value: string
  ) => {
    if (editingStockName && editedRowData) {
      setEditedRowData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          [year]: {
            ...prev[year],
            [field]: value,
          },
        };
      });
    }
  };

  const handleDeleteStock = (stockName: string) => {
    // 显示确认对话框
    setAlertInfo({
      isOpen: true,
      title: "确认删除",
      description: `确定要删除 ${stockName} 吗？`,
      onConfirm: () => {
        // 执行删除操作
        setYearData((prevYearData) => {
          const updatedYearData: { [year: string]: YearData } = {};
          Object.keys(prevYearData).forEach((year) => {
            if (prevYearData[year] && prevYearData[year].stocks) {
              updatedYearData[year] = {
                ...prevYearData[year],
                stocks: prevYearData[year].stocks.filter(
                  (stock) => stock.name !== stockName
                ),
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
            updatedStocks[year] = updatedStocks[year].filter(
              (stock) => stock.name !== stockName
            );
          });

          return {
            ...prev,
            stocks: updatedStocks,
          };
        });

        // 关闭对话框
        setAlertInfo(null);
      },
      onCancel: () => setAlertInfo(null),
      confirmText: "确认",
      cancelText: "取消",
    });
  };

  const toggleStockVisibility = (stockName: string) => {
    setHiddenStocks((prev) => ({
      ...prev,
      [stockName]: !prev[stockName],
    }));
  };

  // 处理YearFilter组件的选择变化
  const handleYearFilterSelectionChange = (selected: string[]) => {
    console.log("YearFilter onChange:", selected);
    if (selected.includes("all")) {
      // 如果选中了“全部年份”，显示所有年份
      setYearFilter("all");
      setFilteredYears(years);
    } else if (selected.length === 0) {
      // 如果没有选择任何年份，默认显示所有年份
      setYearFilter("all");
      setFilteredYears(years);
    } else {
      // 显示选中的年份
      setYearFilter("custom");
      setFilteredYears(selected.sort((a, b) => parseInt(b) - parseInt(a)));
    }
  };

  const tableData = useCallback(() => {
    const stockSet = new Set<string>();
    Object.values(yearData).forEach((yearDataItem) => {
      if (yearDataItem && yearDataItem.stocks) {
        yearDataItem.stocks.forEach((stock) => stockSet.add(stock.name));
      }
    });

    const stockValues2025: StockValueMap = {};
    Object.values(yearData).forEach((yearDataItem) => {
      if (yearDataItem && yearDataItem.stocks) {
        yearDataItem.stocks.forEach((stock) => {
          if (stock.name in stockValues2025) return;
          const stockIn2025 = yearData["2025"]?.stocks?.find(
            (s) => s.name === stock.name
          );
          if (stockIn2025) {
            stockValues2025[stock.name] =
              stockIn2025.shares * stockIn2025.price;
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

    const headers = ["visible", "股票名称", ...filteredYears, "操作"];

    const rows = stockNames.map((stockName) => {
      const row = [];

      row.push({ visibility: !hiddenStocks[stockName] });

      let symbol = "";
      for (let i = years.length - 1; i >= 0; i--) {
        const year = years[i];
        const stockInYear = yearData[year]?.stocks?.find(
          (s) => s.name === stockName
        );
        if (stockInYear && stockInYear.symbol) {
          symbol = stockInYear.symbol;
          break;
        }
      }
      row.push({ name: stockName, symbol });

      filteredYears.forEach((year) => {
        if (yearData[year] && yearData[year].stocks) {
          const stockInYear = yearData[year].stocks.find(
            (s) => s.name === stockName
          );
          row.push(
            stockInYear
              ? {
                  shares: stockInYear.shares,
                  price: stockInYear.price,
                  costPrice: stockInYear.costPrice,
                  symbol: stockInYear.symbol,
                }
              : null
          );
        } else {
          row.push(null);
        }
      });

      row.push(null);

      return row;
    });

    const totalRow = ["", "total", ...filteredYears.map(() => null), null];

    return { headers, rows, totalRow };
  }, [yearData, years, filteredYears, hiddenStocks]);

  const lineChartData = prepareLineChartData();
  const barChartData = preparePercentageBarChartData();
  const totalValues = calculateTotalValues();
  const table = tableData();

  const handleLegendClick = (data: { value: string }) => {
    let key = data.value;

    // 处理总计特殊情况
    if (data.value === "总计") {
      key = "total";
    }
    // 处理年份标签情况，例如 "2022年占比"
    else if (data.value.endsWith("年占比")) {
      // 从标签中提取年份
      key = data.value.replace("年占比", "");
    }

    setHiddenSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (lastRefreshTime) {
      const timer = setTimeout(() => {
        setLastRefreshTime(null);
      }, 120000);
      return () => clearTimeout(timer);
    }
  }, [lastRefreshTime]);

  useEffect(() => {
    if (typeof window !== "undefined" && !isLoggedIn) {
      localStorage.setItem("stockPortfolioData", JSON.stringify(yearData));
      localStorage.setItem("stockPortfolioYears", JSON.stringify(years));
      localStorage.setItem("stockPortfolioSelectedYear", selectedYear);
    }
  }, [yearData, years, selectedYear, isLoggedIn]);

  // 监听 incrementalChanges 变化，触发自动保存
  useEffect(() => {
    // 检查是否有需要保存的数据
    const hasChanges =
      Object.keys(incrementalChanges.stocks).length > 0 ||
      Object.keys(incrementalChanges.cashTransactions).length > 0 ||
      Object.keys(incrementalChanges.stockTransactions).length > 0 ||
      Object.keys(incrementalChanges.yearlySummaries).length > 0;

    if (hasChanges && isLoggedIn) {
      // 使用防抖机制
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveDataToBackend();
        saveTimeoutRef.current = null;
      }, 2000);
    }

    // 组件卸载时清除定时器
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [incrementalChanges, isLoggedIn]);

  useEffect(() => {
    if (typeof window !== "undefined" && !isLoggedIn) {
      const savedData = localStorage.getItem("stockPortfolioData");
      const savedYears = localStorage.getItem("stockPortfolioYears");
      const savedSelectedYear = localStorage.getItem(
        "stockPortfolioSelectedYear"
      );
      if (savedData) setYearData(JSON.parse(savedData));
      if (savedYears) setYears(JSON.parse(savedYears));
      if (savedSelectedYear) setSelectedYear(savedSelectedYear);
    }
  }, [isLoggedIn]);

  // 点击外部关闭更多菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMoreMenuOpen) {
        const target = event.target as Element;
        if (!target.closest('.more-menu-container')) {
          setIsMoreMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreMenuOpen]);

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
          (acc, tx) =>
            acc +
            (tx.type === "deposit"
              ? tx.amount
              : tx.type === "withdraw"
              ? -tx.amount
              : 0),
          0
        );
      }
    }
    return cumulativeInvested;
  };

  const handleYearChange = useCallback((newYear: string) => {
    setSelectedYear(newYear);
  }, []);

  const calculateTotalInvestment = useCallback(
    (upToYear: string) => {
      let total = 0;
      Object.keys(yearData)
        .filter((year) => year <= upToYear)
        .forEach((year) => {
          if (yearData[year]?.cashTransactions) {
            yearData[year].cashTransactions.forEach((tx) => {
              if (tx.type === "deposit") {
                total += tx.amount;
              } else if (tx.type === "withdraw") {
                total -= tx.amount;
              }
            });
          }
        });
      return total;
    },
    [yearData]
  );

  const calculateInvestmentReturn = useCallback(
    (selectedYear: string) => {
      const totalInvestment = calculateTotalInvestment(selectedYear);
      const portfolioValue = totalValues[selectedYear] || 0;
      const absoluteReturn = portfolioValue - totalInvestment;
      const percentageReturn =
        totalInvestment > 0 ? (absoluteReturn / totalInvestment) * 100 : 0;

      return {
        totalInvestment,
        portfolioValue,
        absoluteReturn,
        percentageReturn,
      };
    },
    [calculateTotalInvestment, totalValues]
  );

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">股票投资组合追踪工具</h1>
          {isLoggedIn && currentUser && (
            <div className="text-sm text-gray-600">
              欢迎,{" "}
              <span className="font-semibold">
                {currentUser.nickname || currentUser.username}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {/* 大屏幕显示所有按钮 */}
          <div className="hidden md:flex items-center space-x-2">
            <Button
              onClick={() => refreshPrices(true)}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />{" "}
              刷新价格
            </Button>
            <UserProfileManager
              ref={userProfileRef}
              isLoggedIn={isLoggedIn}
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              setIsLoggedIn={setIsLoggedIn}
              setAlertInfo={setAlertInfo}
              onDataFetch={fetchJsonData}
              onRefreshPrices={refreshPrices}
              currency={currency}
              latestYear={latestYear}
              totalValues={totalValues}
              formatLargeNumber={(value, curr) =>
                formatLargeNumber(value, curr || currency)
              }
              getLatestYearGrowthRate={getLatestYearGrowthRate}
              onCloseParentMenu={() => {}} // 桌面端不需要关闭菜单，空函数即可
            />
          </div>

          {/* 小屏幕显示更多菜单按钮 */}
          <div className="md:hidden relative more-menu-container">
            <Button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="flex items-center gap-2"
              variant="outline"
            >
              <MoreHorizontal className="h-4 w-4" />
              更多
            </Button>

            {/* 下拉菜单 */}
            {isMoreMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                <div className="py-1">
                  <button
                    onClick={() => {
                      refreshPrices(true);
                      setIsMoreMenuOpen(false);
                    }}
                    disabled={isLoading}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    刷新价格
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  {!isLoggedIn ? (
                    <>
                      <button
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setTimeout(() => userProfileRef.current?.openLoginDialog(), 0);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        登录
                      </button>
                      <button
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setTimeout(() => userProfileRef.current?.openRegisterDialog(), 0);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        注册
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setTimeout(() => userProfileRef.current?.openProfileDialog(), 0);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        个人资料
                      </button>
                      <button
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          userProfileRef.current?.logout();
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        登出
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
            <Button
              onClick={addCashTransaction}
              disabled={isCashTransactionLoading}
              className={isCashTransactionLoading ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isCashTransactionLoading ? "处理中..." : "添加现金操作"}
            </Button>
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
              {exchangeRates["CNY"] && <SelectItem value="CNY">CNY</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      </div>

      <InvestmentOverview
        years={years}
        comparisonYear={comparisonYear}
        setComparisonYear={setComparisonYear}
        calculateInvestmentReturn={calculateInvestmentReturn}
        formatLargeNumber={formatLargeNumber}
        currency={currency}
      />

      <div>
        <h2 className="text-xl font-semibold mb-4">总持仓概览</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.keys(totalValues).map((year) => (
            <div
              key={year}
              className="p-4 border rounded-lg shadow bg-white cursor-pointer"
              onClick={() => handleReportClick(year)}
              data-testid={`report-button-${year}`}
            >
              <h3 className="text-lg font-medium">{year}年总持仓</h3>
              <p className="text-2xl font-bold text-blue-600">
                {formatLargeNumber(totalValues[year], currency)}
              </p>
              <GrowthInfo
                year={year}
                years={years}
                yearData={yearData}
                formatLargeNumber={(value, curr) =>
                  formatLargeNumber(value, curr || currency)
                }
                currency={currency}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 p-6 border rounded-lg shadow bg-white">
        <h2 className="text-xl font-semibold mb-4">退休目标计算器</h2>
        <RetirementCalculator
          retirementGoal={retirementGoal}
          annualReturn={annualReturn}
          targetYears={targetYears}
          calculationMode={calculationMode}
          currency={currency}
          currentAmount={totalValues[latestYear] || 0}
          onRetirementGoalChange={updateRetirementGoal}
          onAnnualReturnChange={updateAnnualReturn}
          onTargetYearsChange={updateTargetYears}
          onCalculationModeChange={updateCalculationMode}
          onUseAverageReturn={() => {
            const latestRate = getLatestYearGrowthRate();
            if (latestRate) {
              updateAnnualReturn(latestRate);
            }
          }}
          formatLargeNumber={(value, curr) =>
            formatLargeNumber(value, curr || currency)
          }
        />
      </div>

      <StockCharts
        showPositionChart={showPositionChart}
        setShowPositionChart={setShowPositionChart}
        lineChartData={lineChartData}
        barChartData={barChartData}
        years={years}
        hiddenStocks={hiddenStocks}
        hiddenSeries={hiddenSeries}
        handleLegendClick={handleLegendClick}
        formatLargeNumber={formatLargeNumber}
        currency={currency}
      />

      <StockTable
        years={years}
        filteredYears={filteredYears}
        table={table}
        yearData={yearData}
        hiddenStocks={hiddenStocks}
        editingStockName={editingStockName}
        editedRowData={editedRowData}
        selectedYear={selectedYear}
        latestYear={latestYear}
        lastRefreshTime={lastRefreshTime}
        currency={currency}
        formatLargeNumber={formatLargeNumber}
        toggleStockVisibility={toggleStockVisibility}
        handleEditRow={handleEditRow}
        handleSaveRow={handleSaveRow}
        handleInputChange={handleInputChange}
        handleDeleteStock={handleDeleteStock}
        handleYearFilterSelectionChange={handleYearFilterSelectionChange}
      />

      <ReportDialog
        isOpen={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        selectedYear={selectedReportYear}
        yearData={yearData}
        hiddenStocks={hiddenStocks}
        formatLargeNumber={formatLargeNumber}
        currency={currency}
        totalPortfolioValue={
          selectedReportYear
            ? (yearData[selectedReportYear]?.stocks?.reduce(
                (acc, stock) =>
                  hiddenStocks[stock.name]
                    ? acc
                    : acc + stock.shares * stock.price,
                0
              ) || 0) + (yearData[selectedReportYear]?.cashBalance || 0)
            : 0
        }
        cumulativeInvested={
          selectedReportYear
            ? calculateCumulativeInvested(selectedReportYear)
            : 0
        }
        currentUser={currentUser}
      />

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
              <pre className="whitespace-pre-wrap">
                {alertInfo?.description}
              </pre>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            {alertInfo?.onConfirm && (
              <Button onClick={alertInfo.onConfirm}>
                {alertInfo.confirmText || "确定"}
              </Button>
            )}
            {alertInfo?.onCancel && (
              <Button onClick={alertInfo.onCancel}>
                {alertInfo.cancelText || "取消"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockPortfolioTracker;
