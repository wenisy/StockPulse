/**
 * usePortfolioData —— 聚合 hook（向下兼容门面）
 *
 * 组合 useYearData（本地状态层）+ usePortfolioSync（IO 层），
 * 保持 UsePortfolioDataReturn 接口与重构前完全一致，
 * 使 StockPortfolioTracker 组件无需任何修改。
 *
 * 如需使用更细粒度的子 hook，可直接 import：
 *   import { useYearData } from './useYearData'
 *   import { usePortfolioSync } from './usePortfolioSync'
 */
import {
  ExchangeRates,
  IncrementalChanges,
  PriceData,
  User,
  YearData,
  AlertInfo,
} from '@/types/stock';
import { useYearData } from './useYearData';
import { usePortfolioSync } from './usePortfolioSync';

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
  addCashTransaction: (amount: number, type: 'deposit' | 'withdraw', year: string) => void;
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
  setAlertInfo,
}: UsePortfolioDataProps): UsePortfolioDataReturn {
  const yearDataHook = useYearData({ currentUser });

  const syncHook = usePortfolioSync({
    yearData: yearDataHook.yearData,
    incrementalChanges: yearDataHook.incrementalChanges,
    setYearData: yearDataHook.setYearData,
    setYears: yearDataHook.setYears,
    setFilteredYears: yearDataHook.setFilteredYears,
    setSelectedYear: yearDataHook.setSelectedYear,
    setComparisonYear: yearDataHook.setComparisonYear,
    setIncrementalChanges: yearDataHook.setIncrementalChanges,
    setAlertInfo,
  });

  return {
    // 来自 useYearData
    yearData: yearDataHook.yearData,
    setYearData: yearDataHook.setYearData,
    years: yearDataHook.years,
    setYears: yearDataHook.setYears,
    filteredYears: yearDataHook.filteredYears,
    setFilteredYears: yearDataHook.setFilteredYears,
    selectedYear: yearDataHook.selectedYear,
    setSelectedYear: yearDataHook.setSelectedYear,
    comparisonYear: yearDataHook.comparisonYear,
    setComparisonYear: yearDataHook.setComparisonYear,
    latestYear: yearDataHook.latestYear,
    exchangeRates: yearDataHook.exchangeRates,
    setExchangeRates: yearDataHook.setExchangeRates,
    incrementalChanges: yearDataHook.incrementalChanges,
    setIncrementalChanges: yearDataHook.setIncrementalChanges,
    addNewYear: yearDataHook.addNewYear,
    addCashTransaction: yearDataHook.addCashTransaction,
    updateStock: yearDataHook.updateStock,
    convertToCurrency: yearDataHook.convertToCurrency,
    formatLargeNumber: yearDataHook.formatLargeNumber,

    // 来自 usePortfolioSync
    isLoading: syncHook.isLoading,
    setIsLoading: syncHook.setIsLoading,
    priceData: syncHook.priceData,
    setPriceData: syncHook.setPriceData,
    lastRefreshTime: syncHook.lastRefreshTime,
    setLastRefreshTime: syncHook.setLastRefreshTime,
    fetchJsonData: syncHook.fetchJsonData,
    saveDataToBackend: syncHook.saveDataToBackend,
    refreshPrices: syncHook.refreshPrices,
    handleTokenExpired: syncHook.handleTokenExpired,
    getBasePath: syncHook.getBasePath,
  };
}
