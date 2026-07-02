'use client';

/**
 * 聚合 Tracker 的所有业务 hook，供新 Shell 下所有 section 共享。
 * 本文件不实现任何 UI，只是把旧 StockPortfolioTracker 的 hook 初始化编排抬升到 Context 层。
 *
 * ⚠️ 所有 hook 都是**直接复用**的，签名、行为与 legacy 完全一致。
 */

import React, { createContext, useContext, type ReactNode } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useChartData } from '@/hooks/useChartData';
import { useTableData } from '@/hooks/useTableData';
import { useStockOperations } from '@/hooks/useStockOperations';
import { useTrackerState } from '@/components/tracker/hooks/useTrackerState';
import { useTrackerCallbacks } from '@/components/tracker/hooks/useTrackerCallbacks';
import { useTrackerEffects } from '@/components/tracker/hooks/useTrackerEffects';

type TrackerState = ReturnType<typeof useTrackerState>;
type PortfolioData = ReturnType<typeof usePortfolioData>;
type StockOps = ReturnType<typeof useStockOperations>;
type ChartData = ReturnType<typeof useChartData>;
type TableData = ReturnType<typeof useTableData>;
type UserSettings = ReturnType<typeof useUserSettings>;
type Callbacks = ReturnType<typeof useTrackerCallbacks>;

export type PortfolioContextValue = {
  trackerState: TrackerState;
  portfolioData: PortfolioData;
  stockOperations: StockOps;
  chartData: ChartData;
  tableData: TableData;
  userSettings: UserSettings;
  callbacks: Callbacks;
};

const Ctx = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const trackerState = useTrackerState();

  const portfolioData = usePortfolioData({
    currentUser: trackerState.currentUser,
    isLoggedIn: trackerState.isLoggedIn,
    setAlertInfo: trackerState.setAlertInfo,
    setIsLoggedIn: trackerState.setIsLoggedIn,
    setCurrentUser: trackerState.setCurrentUser,
  });

  const {
    yearData,
    setYearData,
    years,
    setYears,
    setFilteredYears,
    selectedYear,
    setSelectedYear,
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
    fetchJsonData,
    refreshPrices,
    saveDataToBackend,
    getBasePath,
    filteredYears,
  } = portfolioData;

  const stockOperations = useStockOperations({
    yearData,
    setYearData,
    setIncrementalChanges: portfolioData.setIncrementalChanges,
    setAlertInfo: trackerState.setAlertInfo,
    currentUser: trackerState.currentUser,
    years,
  });

  const chartData = useChartData({
    yearData,
    years,
    latestYear,
    hiddenStocks: trackerState.hiddenStocks,
  });

  const tableData = useTableData({
    yearData,
    years,
    filteredYears,
    hiddenStocks: trackerState.hiddenStocks,
  });

  const userSettings = useUserSettings(
    trackerState.currentUser,
    trackerState.isLoggedIn,
    trackerState.setCurrentUser,
  );

  const callbacks = useTrackerCallbacks({
    trackerState,
    selectedYear,
    years,
    setSelectedYear,
    setFilteredYears,
    portfolioAddNewYear: portfolioData.addNewYear,
    portfolioAddCashTransaction: portfolioData.addCashTransaction,
    stockOpsConfirmAddNewStock: stockOperations.confirmAddNewStock,
  });

  useTrackerEffects({
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
    loadUserSettings: userSettings.loadUserSettings,
  });

  // 避免 "isLoading" 未使用 lint 警告
  void isLoading;

  const value: PortfolioContextValue = {
    trackerState,
    portfolioData,
    stockOperations,
    chartData,
    tableData,
    userSettings,
    callbacks,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePortfolio(): PortfolioContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePortfolio 必须在 PortfolioProvider 下使用');
  return v;
}
