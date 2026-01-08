"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { AlertInfo, StockSymbol, User } from "@/types/stock";
import React, { useCallback, useEffect, useState, useRef } from "react";
import RetirementCalculator from "./RetirementCalculator";
import { useUserSettings } from "@/hooks/useUserSettings";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { useChartData } from "@/hooks/useChartData";
import { useTableData } from "@/hooks/useTableData";
import { useStockOperations } from "@/hooks/useStockOperations";

import ReportDialog from "./ReportDialog";
import InvestmentOverview from "./InvestmentOverview";
import StockCharts from "./StockCharts";
import StockTable from "./StockTable";
import PortfolioHeader from "./PortfolioHeader";
import ControlPanel from "./ControlPanel";
import PortfolioOverview from "./PortfolioOverview";

const StockPortfolioTracker: React.FC = () => {
  // 用户认证状态
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 弹窗状态
  const [alertInfo, setAlertInfo] = useState<AlertInfo | null>(null);

  // 使用自定义 Hook 管理投资组合数据
  const portfolioData = usePortfolioData({
    currentUser,
    isLoggedIn,
    setAlertInfo,
  });

  const {
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
    getBasePath,
    formatLargeNumber,
  } = portfolioData;

  // 年份筛选状态
  const [setYearFilter] = useState<(value: string) => void>(
    () => (value: string) => {
      if (value === "all") {
        setFilteredYears(years);
      } else {
        setFilteredYears([value]);
      }
    }
  );

  // 表单状态
  const [newYear, setNewYear] = useState("");
  const [cashTransactionAmount, setCashTransactionAmount] = useState("");
  const [cashTransactionType, setCashTransactionType] = useState<"deposit" | "withdraw">("deposit");
  const [isCashTransactionLoading, setIsCashTransactionLoading] = useState(false);

  // 图表状态
  const [showPositionChart, setShowPositionChart] = useState(true);
  const [hiddenSeries, setHiddenSeries] = useState<{ [dataKey: string]: boolean }>({});
  const [hiddenStocks, setHiddenStocks] = useState<{ [stockName: string]: boolean }>({});

  // 报告对话框状态
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedReportYear, setSelectedReportYear] = useState<string | null>(null);

  // 其他状态
  const [stockSymbols, setStockSymbols] = useState<StockSymbol[]>([]);
  const [currency, setCurrency] = useState("USD");

  // 股票操作 hook
  const stockOperations = useStockOperations({
    yearData,
    setYearData,
    setIncrementalChanges,
    setAlertInfo,
    currentUser,
    years,
  });

  // 图表数据 hook
  const chartData = useChartData({
    yearData,
    years,
    latestYear,
    hiddenStocks,
  });

  // 表格数据 hook
  const tableData = useTableData({
    yearData,
    years,
    filteredYears,
    hiddenStocks,
  });

  // 使用自定义 Hook 管理退休目标计算器相关状态
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

  // --- 初始化数据 ---
  useEffect(() => {
    const initializeData = async () => {
      const token = localStorage.getItem("token");
      const userJson = localStorage.getItem("user");
      let user: User | null = null;

      if (userJson) {
        try {
          user = JSON.parse(userJson);
          setCurrentUser(user);
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
            setExchangeRates({
              USD: 1,
              HKD: pricesData["HKD"]?.price || 0,
              CNY: pricesData["CNY"]?.price || 0,
            });
            // 更新最新价格
            setYearData((prevYearData) => {
              const updatedYearData = { ...prevYearData };
              if (updatedYearData[latestYear] && updatedYearData[latestYear].stocks) {
                updatedYearData[latestYear].stocks.forEach((stock) => {
                  if (stock.symbol && pricesData[stock.symbol]) {
                    if (pricesData[stock.symbol].currency === "HKD") {
                      stock.price = pricesData[stock.symbol].price * (pricesData["HKD"]?.price || 1);
                    } else {
                      stock.price = pricesData[stock.symbol].price;
                    }
                  }
                });
              }
              return updatedYearData;
            });
          }
        } catch (error) {
          console.error("获取最新价格时出错:", error);
        }
      }
    };

    initializeData();
  }, []);

  // 添加新年份
  const addNewYear = () => {
    portfolioData.addNewYear(newYear);
    setNewYear("");
  };

  // 添加现金交易
  const addCashTransaction = async () => {
    if (!cashTransactionAmount || !selectedYear || isCashTransactionLoading) return;
    const amount = parseFloat(cashTransactionAmount);
    if (isNaN(amount)) return;

    setIsCashTransactionLoading(true);

    try {
      portfolioData.addCashTransaction(amount, cashTransactionType, selectedYear);
      setCashTransactionAmount("");

      setAlertInfo({
        isOpen: true,
        title: "操作成功",
        description: `已${cashTransactionType === "deposit" ? "存入" : "取出"}现金 $${Math.abs(amount).toFixed(2)}`,
        onConfirm: () => setAlertInfo(null),
        confirmText: "确定",
      });
    } catch (error) {
      console.error("添加现金交易失败:", error);
      setAlertInfo({
        isOpen: true,
        title: "操作失败",
        description: "添加现金交易时发生错误，请稍后重试",
        onConfirm: () => setAlertInfo(null),
        confirmText: "确定",
      });
    } finally {
      setTimeout(() => {
        setIsCashTransactionLoading(false);
      }, 1000);
    }
  };

  // 添加股票
  const onAddStock = useCallback(() => {
    stockOperations.confirmAddNewStock(selectedYear);
  }, [stockOperations, selectedYear]);

  // 切换股票可见性
  const toggleStockVisibility = (stockName: string) => {
    setHiddenStocks((prev) => ({ ...prev, [stockName]: !prev[stockName] }));
  };

  // 处理 YearFilter 组件的选择变化
  const handleYearFilterSelectionChange = (selected: string[]) => {
    if (selected.includes("all")) {
      setYearFilter("all");
      setFilteredYears(years);
    } else if (selected.length === 0) {
      setYearFilter("all");
      setFilteredYears(years);
    } else {
      setYearFilter("custom");
      setFilteredYears(selected.sort((a, b) => parseInt(b) - parseInt(a)));
    }
  };

  const handleLegendClick = (data: { value: string }) => {
    let key = data.value;
    if (data.value === "总计") {
      key = "total";
    } else if (data.value.endsWith("年占比")) {
      key = data.value.replace("年占比", "");
    }
    setHiddenSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 刷新时间清除
  useEffect(() => {
    if (lastRefreshTime) {
      const timer = setTimeout(() => setLastRefreshTime(null), 120000);
      return () => clearTimeout(timer);
    }
  }, [lastRefreshTime, setLastRefreshTime]);

  // 本地存储
  useEffect(() => {
    if (typeof window !== "undefined" && !isLoggedIn) {
      localStorage.setItem("stockPortfolioData", JSON.stringify(yearData));
      localStorage.setItem("stockPortfolioYears", JSON.stringify(years));
      localStorage.setItem("stockPortfolioSelectedYear", selectedYear);
    }
  }, [yearData, years, selectedYear, isLoggedIn]);

  // 监听 incrementalChanges 变化，触发自动保存
  useEffect(() => {
    const hasChanges =
      Object.keys(incrementalChanges.stocks).length > 0 ||
      Object.keys(incrementalChanges.cashTransactions).length > 0 ||
      Object.keys(incrementalChanges.stockTransactions).length > 0 ||
      Object.keys(incrementalChanges.yearlySummaries).length > 0;

    if (hasChanges && isLoggedIn) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveDataToBackend();
        saveTimeoutRef.current = null;
      }, 2000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [incrementalChanges, isLoggedIn, saveDataToBackend]);

  // 加载本地存储
  useEffect(() => {
    if (typeof window !== "undefined" && !isLoggedIn) {
      const savedData = localStorage.getItem("stockPortfolioData");
      const savedYears = localStorage.getItem("stockPortfolioYears");
      const savedSelectedYear = localStorage.getItem("stockPortfolioSelectedYear");
      if (savedData) setYearData(JSON.parse(savedData));
      if (savedYears) setYears(JSON.parse(savedYears));
      if (savedSelectedYear) setSelectedYear(savedSelectedYear);
    }
  }, [isLoggedIn, setYearData, setYears, setSelectedYear]);

  const handleReportClick = (year: string) => {
    setSelectedReportYear(year);
    setIsReportDialogOpen(true);
  };

  const handleYearChange = useCallback(
    (newYearValue: string) => {
      setSelectedYear(newYearValue);
    },
    [setSelectedYear]
  );

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-8">
      {/* 头部 */}
      <PortfolioHeader
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        isLoading={isLoading}
        currency={currency}
        latestYear={latestYear}
        totalValues={chartData.totalValues}
        setCurrentUser={setCurrentUser}
        setIsLoggedIn={setIsLoggedIn}
        setAlertInfo={setAlertInfo}
        onRefreshPrices={refreshPrices}
        onDataFetch={fetchJsonData}
        formatLargeNumber={(value, curr) => formatLargeNumber(value, curr || currency)}
        getLatestYearGrowthRate={chartData.getLatestYearGrowthRate}
      />

      {/* 控制面板 */}
      <ControlPanel
        years={years}
        selectedYear={selectedYear}
        newYear={newYear}
        latestYear={latestYear}
        setNewYear={setNewYear}
        onYearChange={handleYearChange}
        onAddNewYear={addNewYear}
        cashTransactionAmount={cashTransactionAmount}
        cashTransactionType={cashTransactionType}
        isCashTransactionLoading={isCashTransactionLoading}
        setCashTransactionAmount={setCashTransactionAmount}
        setCashTransactionType={setCashTransactionType}
        onAddCashTransaction={addCashTransaction}
        newStockName={stockOperations.newStockName}
        newStockSymbol={stockOperations.newStockSymbol}
        newShares={stockOperations.newShares}
        newPrice={stockOperations.newPrice}
        newYearEndPrice={stockOperations.newYearEndPrice}
        transactionType={stockOperations.transactionType}
        setNewStockName={stockOperations.setNewStockName}
        setNewStockSymbol={stockOperations.setNewStockSymbol}
        setNewShares={stockOperations.setNewShares}
        setNewPrice={stockOperations.setNewPrice}
        setNewYearEndPrice={stockOperations.setNewYearEndPrice}
        setTransactionType={stockOperations.setTransactionType}
        onAddStock={onAddStock}
        yearData={yearData}
        priceData={priceData}
        currency={currency}
        formatLargeNumber={formatLargeNumber}
        exchangeRates={exchangeRates}
        setCurrency={setCurrency}
      />

      {/* 投资概览 */}
      <InvestmentOverview
        years={years}
        comparisonYear={comparisonYear}
        setComparisonYear={setComparisonYear}
        calculateInvestmentReturn={chartData.calculateInvestmentReturn}
        formatLargeNumber={formatLargeNumber}
        currency={currency}
      />

      {/* 持仓概览 */}
      <PortfolioOverview
        totalValues={chartData.totalValues}
        years={years}
        yearData={yearData}
        currency={currency}
        formatLargeNumber={formatLargeNumber}
        onReportClick={handleReportClick}
      />

      {/* 退休目标计算器 */}
      <div className="mt-8 p-6 border rounded-lg shadow bg-white">
        <h2 className="text-xl font-semibold mb-4">退休目标计算器</h2>
        <RetirementCalculator
          retirementGoal={retirementGoal}
          annualReturn={annualReturn}
          targetYears={targetYears}
          calculationMode={calculationMode}
          currency={currency}
          currentAmount={chartData.totalValues[latestYear] || 0}
          onRetirementGoalChange={updateRetirementGoal}
          onAnnualReturnChange={updateAnnualReturn}
          onTargetYearsChange={updateTargetYears}
          onCalculationModeChange={updateCalculationMode}
          onUseAverageReturn={() => {
            const latestRate = chartData.getLatestYearGrowthRate();
            if (latestRate) {
              updateAnnualReturn(latestRate);
            }
          }}
          formatLargeNumber={(value, curr) => formatLargeNumber(value, curr || currency)}
        />
      </div>

      {/* 图表 */}
      <StockCharts
        showPositionChart={showPositionChart}
        setShowPositionChart={setShowPositionChart}
        lineChartData={chartData.lineChartData}
        barChartData={chartData.barChartData}
        years={years}
        hiddenStocks={hiddenStocks}
        hiddenSeries={hiddenSeries}
        handleLegendClick={handleLegendClick}
        formatLargeNumber={formatLargeNumber}
        currency={currency}
      />

      {/* 股票表格 */}
      <StockTable
        years={years}
        filteredYears={filteredYears}
        table={tableData}
        yearData={yearData}
        hiddenStocks={hiddenStocks}
        editingStockName={stockOperations.editingStockName}
        editedRowData={stockOperations.editedRowData}
        selectedYear={selectedYear}
        latestYear={latestYear}
        lastRefreshTime={lastRefreshTime}
        currency={currency}
        formatLargeNumber={formatLargeNumber}
        toggleStockVisibility={toggleStockVisibility}
        handleEditRow={stockOperations.handleEditRow}
        handleSaveRow={stockOperations.handleSaveRow}
        handleInputChange={stockOperations.handleInputChange}
        handleDeleteStock={stockOperations.handleDeleteStock}
        handleYearFilterSelectionChange={handleYearFilterSelectionChange}
      />

      {/* 报告对话框 */}
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
                (acc, stock) => (hiddenStocks[stock.name] ? acc : acc + stock.shares * stock.price),
                0
              ) || 0) + (yearData[selectedReportYear]?.cashBalance || 0)
            : 0
        }
        cumulativeInvested={
          selectedReportYear ? chartData.calculateCumulativeInvested(selectedReportYear) : 0
        }
        currentUser={currentUser}
      />

      {/* 通用弹窗 */}
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
            {alertInfo?.onConfirm && (
              <Button onClick={alertInfo.onConfirm}>{alertInfo.confirmText || "确定"}</Button>
            )}
            {alertInfo?.onCancel && (
              <Button onClick={alertInfo.onCancel}>{alertInfo.cancelText || "取消"}</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockPortfolioTracker;
