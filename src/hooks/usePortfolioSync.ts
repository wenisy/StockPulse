import { useState, useCallback } from 'react';
import {
  AlertInfo,
  IncrementalChanges,
  PriceData,
  YearData,
} from '@/types/stock';
import { stockInitialData } from '@/components/data';
import { sortYearsDesc } from '@/lib/portfolio/years';

const BACKEND_DOMAIN = '//stock-backend-tau.vercel.app';

export interface UsePortfolioSyncProps {
  yearData: { [year: string]: YearData };
  incrementalChanges: IncrementalChanges;
  setYearData: React.Dispatch<React.SetStateAction<{ [year: string]: YearData }>>;
  setYears: React.Dispatch<React.SetStateAction<string[]>>;
  setFilteredYears: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedYear: React.Dispatch<React.SetStateAction<string>>;
  setComparisonYear: React.Dispatch<React.SetStateAction<string>>;
  setIncrementalChanges: React.Dispatch<React.SetStateAction<IncrementalChanges>>;
  setAlertInfo: (info: AlertInfo | null) => void;
}

export interface UsePortfolioSyncReturn {
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  priceData: PriceData;
  setPriceData: React.Dispatch<React.SetStateAction<PriceData>>;
  lastRefreshTime: Date | null;
  setLastRefreshTime: React.Dispatch<React.SetStateAction<Date | null>>;
  fetchJsonData: (token: string) => Promise<void>;
  saveDataToBackend: () => Promise<void>;
  refreshPrices: (isManual?: boolean) => Promise<void>;
  handleTokenExpired: () => void;
  getBasePath: () => string;
}

/**
 * 负责所有后端数据同步与 IO 操作。
 * 不持有 yearData 状态，通过 props 接收来自 useYearData 的 setter。
 */
export function usePortfolioSync({
  yearData,
  incrementalChanges,
  setYearData,
  setYears,
  setFilteredYears,
  setSelectedYear,
  setComparisonYear,
  setIncrementalChanges,
  setAlertInfo,
}: UsePortfolioSyncProps): UsePortfolioSyncReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [priceData, setPriceData] = useState<PriceData>({});
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  const getBasePath = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hostname.includes('github.io')) return '/StockPulse';
      if (window.location.hostname === 'stock.nodal.link') return '';
    }
    return '';
  }, []);

  const handleTokenExpired = useCallback(() => {
    console.warn('Token invalid or expired. Logging out.');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setYearData(stockInitialData);
    const sortedYears = sortYearsDesc(Object.keys(stockInitialData));
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
  }, [setYearData, setYears, setFilteredYears, setSelectedYear, setComparisonYear, setAlertInfo]);

  const fetchJsonDataLegacy = useCallback(
    async (token: string) => {
      try {
        const response = await fetch(`${BACKEND_DOMAIN}/api/data`, {
          headers: { Authorization: token },
        });
        const data = await response.json();
        if (response.ok) {
          setYearData(data);
          const sortedYears = sortYearsDesc(Object.keys(data));
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
    [handleTokenExpired, setYearData, setYears, setFilteredYears, setSelectedYear, setComparisonYear],
  );

  const loadRemainingYears = useCallback(
    async (remainingYears: string[], token: string) => {
      for (const year of remainingYears) {
        try {
          const response = await fetch(`${BACKEND_DOMAIN}/api/data?mode=year&year=${year}`, {
            headers: { Authorization: `Bearer ${token}` },
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
    [setYearData],
  );

  const fetchJsonData = useCallback(
    async (token: string) => {
      try {
        const yearsResponse = await fetch(`${BACKEND_DOMAIN}/api/data?mode=years`, {
          headers: { Authorization: `Bearer ${token}` },
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
          const defaultYears = sortYearsDesc(Object.keys(stockInitialData));
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

        const yearsToLoad = sortedYears.slice(0, 2);
        const results = await Promise.all(
          yearsToLoad.map(async (year: string) => {
            const response = await fetch(`${BACKEND_DOMAIN}/api/data?mode=year&year=${year}`, {
              headers: { Authorization: `Bearer ${token}` },
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
          }),
        );

        const loadedData: { [year: string]: YearData } = {};
        results.forEach((result) => {
          if (result) loadedData[result.year] = result.data;
        });
        setYearData(loadedData);

        if (sortedYears.length > 2) {
          loadRemainingYears(sortedYears.slice(2), token);
        }
      } catch (error) {
        console.error('获取数据时出错:', error);
        await fetchJsonDataLegacy(token);
      }
    },
    [handleTokenExpired, fetchJsonDataLegacy, loadRemainingYears, setYearData, setYears, setFilteredYears, setSelectedYear, setComparisonYear],
  );

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
            const currentYearData = prevYearData[currentLatestYear];
            if (!currentYearData?.stocks) {
              return prevYearData;
            }

            return {
              ...prevYearData,
              [currentLatestYear]: {
                ...currentYearData,
                stocks: currentYearData.stocks.map((stock) =>
                  stock.symbol && stockData[stock.symbol]
                    ? { ...stock, price: stockData[stock.symbol].price }
                    : stock,
                ),
              },
            };
          });

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
              stocks: { ...prev.stocks, [currentLatestYear]: updatedStocks },
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
        const errorMessage = isManual ? '网络错误，请稍后再试' : '无法自动更新价格，请手动点击"刷新价格"按钮';
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
    [yearData, setYearData, setIncrementalChanges, setAlertInfo],
  );

  const saveDataToBackend = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${BACKEND_DOMAIN}/api/updateNotion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
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
  }, [incrementalChanges, setIncrementalChanges, setAlertInfo]);

  return {
    isLoading,
    setIsLoading,
    priceData,
    setPriceData,
    lastRefreshTime,
    setLastRefreshTime,
    fetchJsonData,
    saveDataToBackend,
    refreshPrices,
    handleTokenExpired,
    getBasePath,
  };
}
