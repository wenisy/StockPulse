import { useState, useCallback, useRef } from 'react';
import {
  CashTransaction,
  ExchangeRates,
  IncrementalChanges,
  PriceData,
  Stock,
  StockTransaction,
  User,
  YearData,
  AlertInfo,
} from '@/types/stock';
import { stockInitialData } from '@/components/data';
import { v4 as uuidv4 } from 'uuid';

const BACKEND_DOMAIN = '//stock-backend-tau.vercel.app';

export interface UsePortfolioDataProps {
  currentUser: User | null;
  isLoggedIn: boolean;
  setAlertInfo: (info: AlertInfo | null) => void;
}

export interface UsePortfolioDataReturn {
  // 状态
  yearData: { [year: string]: YearData };
  setYearData: React.Dispatch<React.SetStateAction<{ [year: string]: YearData }>>;
  years: string[];
  setYears: React.Dispatch<React.SetStateAction<string[]>>;
  filteredYears: string[];
  setFilteredYears: React.Dispatch<React.SetStateAction<string[]>>;
  selectedYear: string;
  setSelectedYear: React.Dispatch<React.SetStateAction<string>>;
  comparisonYear: string;
  setComparisonYear: React.Dispatch<React.SetStateAction<string>>;
  latestYear: string;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  priceData: PriceData;
  setPriceData: React.Dispatch<React.SetStateAction<PriceData>>;
  exchangeRates: ExchangeRates;
  setExchangeRates: React.Dispatch<React.SetStateAction<ExchangeRates>>;
  lastRefreshTime: Date | null;
  setLastRefreshTime: React.Dispatch<React.SetStateAction<Date | null>>;
  incrementalChanges: IncrementalChanges;
  setIncrementalChanges: React.Dispatch<React.SetStateAction<IncrementalChanges>>;
  
  // 方法
  fetchJsonData: (token: string) => Promise<void>;
  refreshPrices: (isManual?: boolean) => Promise<void>;
  saveDataToBackend: () => Promise<void>;
  addNewYear: (newYearValue: string) => void;
  addCashTransaction: (
    amount: number,
    type: 'deposit' | 'withdraw',
    year: string
  ) => void;
  updateStock: (
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
  ) => void;
  handleTokenExpired: () => void;
  getBasePath: () => string;
  formatLargeNumber: (num: number, targetCurrency: string) => string;
  convertToCurrency: (amount: number, targetCurrency: string) => number;
}

export function usePortfolioData({
  currentUser,
  isLoggedIn,
  setAlertInfo,
}: UsePortfolioDataProps): UsePortfolioDataReturn {
  const initialData: { [year: string]: YearData } = stockInitialData;

  const [yearData, setYearData] = useState<{ [year: string]: YearData }>(initialData);
  const [years, setYears] = useState<string[]>(
    Object.keys(initialData).sort((a, b) => parseInt(b) - parseInt(a))
  );
  const [filteredYears, setFilteredYears] = useState<string[]>(
    Object.keys(initialData).sort((a, b) => parseInt(b) - parseInt(a))
  );
  const [selectedYear, setSelectedYear] = useState(years[years.length - 1]);
  const [comparisonYear, setComparisonYear] = useState<string>(years[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [priceData, setPriceData] = useState<PriceData>({});
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    USD: 1,
    HKD: 0.12864384,
    CNY: 0.14,
  });
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [incrementalChanges, setIncrementalChanges] = useState<IncrementalChanges>({
    stocks: {},
    cashTransactions: {},
    stockTransactions: {},
    yearlySummaries: {},
  });

  const latestYear = years.length > 0 ? Math.max(...years.map(Number)).toString() : '2024';

  const getBasePath = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hostname.includes('github.io')) {
        return '/StockPulse';
      }
      if (window.location.hostname === 'stock.nodal.link') {
        return '';
      }
    }
    return '';
  }, []);

  const convertToCurrency = useCallback(
    (amount: number, targetCurrency: string): number => {
      const rate = exchangeRates[targetCurrency] || 1;
      return amount / rate;
    },
    [exchangeRates]
  );

  const formatLargeNumber = useCallback(
    (num: number, targetCurrency: string) => {
      const convertedNum = convertToCurrency(num, targetCurrency);
      return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(convertedNum);
    },
    [convertToCurrency]
  );

  // 处理 token 过期
  const handleTokenExpired = useCallback(() => {
    console.warn('Token invalid or expired. Logging out.');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setYearData(stockInitialData);
    const sortedYears = Object.keys(stockInitialData).sort((a, b) => parseInt(b) - parseInt(a));
    setYears(sortedYears);
    setFilteredYears(sortedYears);
    setSelectedYear(sortedYears[0]);
    setComparisonYear(sortedYears[0]);

    setAlertInfo({
      isOpen: true,
      title: '会话已过期',
      description: '您的登录已过期，请重新登录。',
      onConfirm: () => setAlertInfo(null),
    });
  }, [setAlertInfo]);

  // 旧版 API 回退（兼容）
  const fetchJsonDataLegacy = useCallback(
    async (token: string) => {
      try {
        const response = await fetch(`${BACKEND_DOMAIN}/api/data`, {
          headers: {
            Authorization: token,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setYearData(data);
          const sortedYears = Object.keys(data).sort((a, b) => parseInt(b) - parseInt(a));
          setYears(sortedYears);
          setFilteredYears(sortedYears);
          setSelectedYear(sortedYears[0]);
          setComparisonYear(sortedYears[0]);
        } else if (
          response.status === 401 ||
          (data.message && data.message.includes('无效或过期的令牌'))
        ) {
          handleTokenExpired();
        } else {
          console.error('获取数据失败:', data.message || response.statusText);
        }
      } catch (error) {
        console.error('获取数据时出错:', error);
      }
    },
    [handleTokenExpired]
  );

  // 后台加载剩余年份
  const loadRemainingYears = useCallback(
    async (remainingYears: string[], token: string) => {
      for (const year of remainingYears) {
        try {
          const response = await fetch(`${BACKEND_DOMAIN}/api/data?mode=year&year=${year}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setYearData((prev) => ({
              ...prev,
              [year]: {
                stocks: data.stocks,
                cashTransactions: data.cashTransactions,
                stockTransactions: data.stockTransactions,
                cashBalance: data.cashBalance,
              },
            }));
          }
        } catch (error) {
          console.error(`加载 ${year} 年数据失败:`, error);
        }
      }
    },
    []
  );

  // 获取数据
  const fetchJsonData = useCallback(
    async (token: string) => {
      try {
        const yearsResponse = await fetch(`${BACKEND_DOMAIN}/api/data?mode=years`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!yearsResponse.ok) {
          if (yearsResponse.status === 401) {
            handleTokenExpired();
            return;
          }
          console.warn('分年份加载失败，回退到全量加载');
          await fetchJsonDataLegacy(token);
          return;
        }

        const yearsData = await yearsResponse.json();
        const sortedYears = yearsData.years;

        if (!sortedYears || sortedYears.length === 0) {
          setYearData(stockInitialData);
          const defaultYears = Object.keys(stockInitialData).sort(
            (a, b) => parseInt(b) - parseInt(a)
          );
          setYears(defaultYears);
          setFilteredYears(defaultYears);
          setSelectedYear(defaultYears[0]);
          setComparisonYear(defaultYears[0]);
          return;
        }

        setYears(sortedYears);
        setFilteredYears(sortedYears);
        setSelectedYear(sortedYears[0]);
        setComparisonYear(sortedYears[0]);

        // 并行加载最近 2 年的完整数据
        const yearsToLoad = sortedYears.slice(0, 2);
        const yearDataPromises = yearsToLoad.map(async (year: string) => {
          const response = await fetch(`${BACKEND_DOMAIN}/api/data?mode=year&year=${year}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            return {
              year,
              data: {
                stocks: data.stocks,
                cashTransactions: data.cashTransactions,
                stockTransactions: data.stockTransactions,
                cashBalance: data.cashBalance,
              },
            };
          }
          return null;
        });

        const results = await Promise.all(yearDataPromises);
        const loadedData: { [year: string]: YearData } = {};

        results.forEach((result) => {
          if (result) {
            loadedData[result.year] = result.data;
          }
        });

        setYearData(loadedData);

        // 后台加载剩余年份
        if (sortedYears.length > 2) {
          loadRemainingYears(sortedYears.slice(2), token);
        }
      } catch (error) {
        console.error('获取数据时出错:', error);
        await fetchJsonDataLegacy(token);
      }
    },
    [handleTokenExpired, fetchJsonDataLegacy, loadRemainingYears]
  );

  // 刷新价格
  const refreshPrices = useCallback(
    async (isManual = false) => {
      setIsLoading(true);
      try {
        const currentLatestYear = new Date().getFullYear().toString();
        const latestStocks = yearData[currentLatestYear]?.stocks || [];
        const symbols = latestStocks.map((stock) => stock.symbol).filter(Boolean);

        if (symbols.length === 0) {
          if (isManual) {
            setAlertInfo({
              isOpen: true,
              title: '无股票数据',
              description: '当前无股票数据可供更新',
              onConfirm: () => setAlertInfo(null),
            });
          }
          setIsLoading(false);
          return;
        }

        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_DOMAIN}/api/updatePrices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: token } : {}),
          } as Record<string, string>,
          body: JSON.stringify({ symbols }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          const stockData = result.data;

          setYearData((prevYearData) => {
            const updatedYearData = { ...prevYearData };
            if (updatedYearData[currentLatestYear] && updatedYearData[currentLatestYear].stocks) {
              updatedYearData[currentLatestYear].stocks.forEach((stock) => {
                if (stock.symbol && stockData[stock.symbol]) {
                  stock.price = stockData[stock.symbol].price;
                }
              });
            }
            return updatedYearData;
          });

          // 记录价格更新的增量变化
          setIncrementalChanges((prev) => {
            const updatedStocks = latestStocks
              .filter((stock) => stock.symbol && stockData[stock.symbol])
              .map((stock) => ({
                id: stock.id,
                name: stock.name,
                symbol: stock.symbol,
                shares: stock.shares,
                price: stockData[stock.symbol!].price,
                costPrice: stock.costPrice,
                userUuid: stock.userUuid,
              }));

            return {
              ...prev,
              stocks: {
                ...prev.stocks,
                [currentLatestYear]: updatedStocks,
              },
            };
          });

          setLastRefreshTime(new Date());

          if (isManual) {
            setAlertInfo({
              isOpen: true,
              title: '价格已更新',
              description: `股票价格已更新至最新数据（${new Date().toLocaleString()}）`,
              onConfirm: () => setAlertInfo(null),
            });
          }
        } else {
          const errorMessage = isManual
            ? result.message || '获取最新价格时发生错误'
            : '无法自动更新价格，请手动点击"刷新价格"按钮';
          setAlertInfo({
            isOpen: true,
            title: isManual ? '更新失败' : '自动刷新失败',
            description: errorMessage,
            onConfirm: () => setAlertInfo(null),
          });
        }
      } catch (error) {
        console.error('刷新价格时出错:', error);
        const errorMessage = isManual
          ? '网络错误，请稍后再试'
          : '无法自动更新价格，请手动点击"刷新价格"按钮';
        setAlertInfo({
          isOpen: true,
          title: isManual ? '更新失败' : '自动刷新失败',
          description: errorMessage,
          onConfirm: () => setAlertInfo(null),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [yearData, setAlertInfo]
  );

  // 保存数据到后端
  const saveDataToBackend = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${BACKEND_DOMAIN}/api/updateNotion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify(incrementalChanges),
      });
      const result = await response.json();
      if (response.ok) {
        setIncrementalChanges({
          stocks: {},
          cashTransactions: {},
          stockTransactions: {},
          yearlySummaries: {},
        });
        console.log('数据已自动保存');
      } else {
        setAlertInfo({
          isOpen: true,
          title: '自动保存失败',
          description: result.message || '保存数据时发生错误',
          onConfirm: () => setAlertInfo(null),
        });
      }
    } catch (error) {
      setAlertInfo({
        isOpen: true,
        title: '自动保存失败',
        description: '网络错误，请稍后再试',
        onConfirm: () => setAlertInfo(null),
      });
    }
  }, [incrementalChanges, setAlertInfo]);

  // 添加新年份
  const addNewYear = useCallback(
    (newYearValue: string) => {
      const trimmedYear = newYearValue.trim();
      if (trimmedYear && !years.includes(trimmedYear)) {
        const referenceYear = years
          .filter((y) => y < trimmedYear)
          .sort((a, b) => b.localeCompare(a))[0];

        const referenceYearData = referenceYear ? yearData[referenceYear] : null;
        const stocksToCarryOver = referenceYearData?.stocks?.map((stock) => ({ ...stock })) || [];
        const cashToCarryOver = referenceYearData?.cashBalance || 0;

        const newYearDataItem: YearData = {
          stocks: stocksToCarryOver,
          cashTransactions: [],
          stockTransactions: [],
          cashBalance: cashToCarryOver,
        };

        if (cashToCarryOver > 0) {
          newYearDataItem.cashTransactions.push({
            amount: cashToCarryOver,
            type: 'deposit',
            date: new Date().toISOString().split('T')[0],
            description: '上年结余',
          });
        }

        setYearData({ ...yearData, [trimmedYear]: newYearDataItem });
        const newYears = [...years, trimmedYear].sort((a, b) => parseInt(b) - parseInt(a));
        setYears(newYears);
        setFilteredYears(newYears);
        setSelectedYear(trimmedYear);

        setIncrementalChanges((prev) => ({
          ...prev,
          yearlySummaries: {
            ...prev.yearlySummaries,
            [trimmedYear]: { cashBalance: cashToCarryOver },
          },
        }));
      }
    },
    [years, yearData]
  );

  // 添加现金交易
  const addCashTransaction = useCallback(
    (amount: number, type: 'deposit' | 'withdraw', year: string) => {
      const cashTransaction: CashTransaction = {
        amount: type === 'deposit' ? amount : -amount,
        type,
        date: new Date().toISOString().split('T')[0],
        userUuid: currentUser?.uuid,
      };

      const currentCashBalance = yearData[year]?.cashBalance || 0;

      setYearData((prevYearData) => {
        const updatedYearData = { ...prevYearData };
        if (!updatedYearData[year]) {
          updatedYearData[year] = {
            stocks: [],
            cashTransactions: [],
            stockTransactions: [],
            cashBalance: 0,
          };
        }
        updatedYearData[year].cashTransactions.push(cashTransaction);
        updatedYearData[year].cashBalance =
          (updatedYearData[year].cashBalance || 0) + cashTransaction.amount;
        return updatedYearData;
      });

      setIncrementalChanges((prev) => {
        const existingTransactions = prev.cashTransactions[year] || [];
        const isDuplicate = existingTransactions.some(
          (tx) =>
            tx.amount === cashTransaction.amount &&
            tx.type === cashTransaction.type &&
            tx.date === cashTransaction.date
        );

        if (isDuplicate) {
          console.log('检测到重复的现金交易，跳过添加');
          return prev;
        }

        const newCashBalance = currentCashBalance + cashTransaction.amount;

        return {
          ...prev,
          cashTransactions: {
            ...prev.cashTransactions,
            [year]: [...existingTransactions, cashTransaction],
          },
          yearlySummaries: {
            ...prev.yearlySummaries,
            [year]: { cashBalance: newCashBalance },
          },
        };
      });
    },
    [currentUser, yearData]
  );

  // 更新股票
  const updateStock = useCallback(
    (
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
      setYearData((prevYearData) => {
        const updatedYearData = { ...prevYearData };
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

        const stockIndex = updatedYearData[year].stocks.findIndex((s) => s.name === stockName);
        const stockData: Stock = {
          name: stockName,
          shares,
          price,
          costPrice,
          id: stockIndex !== -1 ? updatedYearData[year].stocks[stockIndex].id : uuidv4(),
          symbol: symbol || (stockIndex !== -1 ? updatedYearData[year].stocks[stockIndex].symbol : ''),
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
          date: new Date().toISOString().split('T')[0],
          beforeCostPrice: beforeCostPrice ?? 0,
          afterCostPrice: costPrice,
          userUuid: currentUser?.uuid,
        };
        updatedYearData[year].stockTransactions.push(stockTransaction);

        const cashTransaction: CashTransaction = {
          amount:
            transactionType === 'buy'
              ? -transactionShares * transactionPrice
              : transactionShares * transactionPrice,
          type: transactionType,
          date: new Date().toISOString().split('T')[0],
          stockName,
          userUuid: currentUser?.uuid,
        };
        updatedYearData[year].cashTransactions.push(cashTransaction);

        // 更新增量变化
        setIncrementalChanges((prev) => ({
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
        }));

        return updatedYearData;
      });
    },
    [currentUser]
  );

  return {
    yearData,
    setYearData,
    years,
    setYears,
    filteredYears,
    setFilteredYears,
    selectedYear,
    setSelectedYear,
    comparisonYear,
    setComparisonYear,
    latestYear,
    isLoading,
    setIsLoading,
    priceData,
    setPriceData,
    exchangeRates,
    setExchangeRates,
    lastRefreshTime,
    setLastRefreshTime,
    incrementalChanges,
    setIncrementalChanges,
    fetchJsonData,
    refreshPrices,
    saveDataToBackend,
    addNewYear,
    addCashTransaction,
    updateStock,
    handleTokenExpired,
    getBasePath,
    formatLargeNumber,
    convertToCurrency,
  };
}
