import { useEffect, useRef } from 'react';
import type {
  ExchangeRates,
  IncrementalChanges,
  PriceData,
  User,
  YearData,
} from '@/types/stock';
import { stockInitialData } from '@/components/data';
import type { useTrackerState } from './useTrackerState';

type TrackerState = ReturnType<typeof useTrackerState>;

function isInitialPortfolioData(data: { [year: string]: YearData }): boolean {
  return JSON.stringify(data) === JSON.stringify(stockInitialData);
}

export interface UseTrackerEffectsProps {
  trackerState: TrackerState;
  latestYear: string;
  yearData: { [year: string]: YearData };
  setYearData: React.Dispatch<React.SetStateAction<{ [year: string]: YearData }>>;
  years: string[];
  setYears: React.Dispatch<React.SetStateAction<string[]>>;
  selectedYear: string;
  setSelectedYear: React.Dispatch<React.SetStateAction<string>>;
  incrementalChanges: IncrementalChanges;
  lastRefreshTime: Date | null;
  setLastRefreshTime: React.Dispatch<React.SetStateAction<Date | null>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setPriceData: React.Dispatch<React.SetStateAction<PriceData>>;
  setExchangeRates: React.Dispatch<React.SetStateAction<ExchangeRates>>;
  fetchJsonData: (token: string) => Promise<void>;
  refreshPrices: (isManual?: boolean) => Promise<void>;
  saveDataToBackend: () => Promise<void>;
  getBasePath: () => string;
  loadUserSettings: (user: User | null) => void;
}

/**
 * 聚合 StockPortfolioTracker 中 6 个 useEffect：
 * 1. 初始化数据（localStorage token + fetchJsonData，或未登录走本地价格加载）
 * 2. 刷新时间 120s 后自动清除
 * 3. localStorage 同步 yearData / years / selectedYear（未登录时）
 * 4. incrementalChanges 变化触发 debounced save
 * 5. 加载本地存储（未登录时）
 */
export function useTrackerEffects({
  trackerState,
  latestYear,
  yearData,
  setYearData,
  years,
  setYears,
  selectedYear,
  setSelectedYear,
  incrementalChanges,
  lastRefreshTime,
  setLastRefreshTime,
  setIsLoading,
  setPriceData,
  setExchangeRates,
  fetchJsonData,
  refreshPrices,
  saveDataToBackend,
  getBasePath,
  loadUserSettings,
}: UseTrackerEffectsProps) {
  const {
    setIsLoggedIn,
    setCurrentUser,
    setAlertInfo,
    setStockSymbols,
    saveTimeoutRef,
    isLoggedIn,
  } = trackerState;

  const hasBeenLoggedInRef = useRef(false);
  useEffect(() => {
    if (isLoggedIn) {
      hasBeenLoggedInRef.current = true;
    }
  }, [isLoggedIn]);

  // 1. 初始化数据
  useEffect(() => {
    const initializeData = async () => {
      const token = localStorage.getItem('token');
      const userJson = localStorage.getItem('user');
      let user: User | null = null;

      if (userJson) {
        try {
          user = JSON.parse(userJson);
          setCurrentUser(user);
          loadUserSettings(user);
        } catch (error) {
        }
      }

      if (token) {
        setIsLoggedIn(true);
        try {
          await fetchJsonData(token);
          if (!localStorage.getItem('token')) {
            setIsLoggedIn(false);
            setCurrentUser(null);
            return;
          }
          setIsLoading(true);
          await refreshPrices(false);
          setIsLoading(false);
        } catch (error) {
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
        }
        try {
          const pricesUrl = `${getBasePath()}/data/prices.json`;
          const timestamp = new Date().getTime();
          const pricesResponse = await fetch(`${pricesUrl}?t=${timestamp}`);
          if (pricesResponse.ok) {
            const pricesData = await pricesResponse.json();
            setPriceData(pricesData);
            setExchangeRates({
              USD: 1,
              HKD: pricesData['HKD']?.price || 0,
              CNY: pricesData['CNY']?.price || 0,
            });
            setYearData((prevYearData) => {
              const currentYearData = prevYearData[latestYear];
              if (!currentYearData?.stocks) return prevYearData;
              return {
                ...prevYearData,
                [latestYear]: {
                  ...currentYearData,
                  stocks: currentYearData.stocks.map((stock) => {
                    if (!stock.symbol || !pricesData[stock.symbol]) return stock;
                    const priceInfo = pricesData[stock.symbol];
                    const newPrice =
                      priceInfo.currency === 'HKD'
                        ? priceInfo.price * (pricesData['HKD']?.price || 1)
                        : priceInfo.price;
                    return { ...stock, price: newPrice };
                  }),
                },
              };
            });
          }
        } catch (error) {
        }
      }
    };
    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. 刷新时间自动清除
  useEffect(() => {
    if (lastRefreshTime) {
      const timer = setTimeout(() => setLastRefreshTime(null), 120000);
      return () => clearTimeout(timer);
    }
  }, [lastRefreshTime, setLastRefreshTime]);

  // 3. 本地存储同步（会话过期重置为初始数据时不覆盖用户离线缓存）
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      !isLoggedIn &&
      !(hasBeenLoggedInRef.current && isInitialPortfolioData(yearData))
    ) {
      localStorage.setItem('stockPortfolioData', JSON.stringify(yearData));
      localStorage.setItem('stockPortfolioYears', JSON.stringify(years));
      localStorage.setItem('stockPortfolioSelectedYear', selectedYear);
    }
  }, [yearData, years, selectedYear, isLoggedIn]);

  // 4. incrementalChanges 触发 debounced save
  useEffect(() => {
    const hasChanges =
      Object.keys(incrementalChanges.stocks).length > 0 ||
      Object.keys(incrementalChanges.cashTransactions).length > 0 ||
      Object.keys(incrementalChanges.stockTransactions).length > 0 ||
      Object.keys(incrementalChanges.yearlySummaries).length > 0;

    if (hasChanges && isLoggedIn) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveDataToBackend();
        saveTimeoutRef.current = null;
      }, 2000);
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [incrementalChanges, isLoggedIn, saveDataToBackend, saveTimeoutRef]);

  // 5. 加载本地存储（仅初始未登录；从已登录登出/过期后不恢复旧缓存）
  useEffect(() => {
    if (typeof window !== 'undefined' && !isLoggedIn && !hasBeenLoggedInRef.current) {
      const savedData = localStorage.getItem('stockPortfolioData');
      const savedYears = localStorage.getItem('stockPortfolioYears');
      const savedSelectedYear = localStorage.getItem('stockPortfolioSelectedYear');
      if (savedData) {
        try {
          setYearData(JSON.parse(savedData));
        } catch (error) {
        }
      }
      if (savedYears) {
        try {
          setYears(JSON.parse(savedYears));
        } catch (error) {
        }
      }
      if (savedSelectedYear) setSelectedYear(savedSelectedYear);
    }
  }, [isLoggedIn, setYearData, setYears, setSelectedYear]);
}
