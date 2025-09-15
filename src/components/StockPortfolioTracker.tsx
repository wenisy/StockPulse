"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, MoreHorizontal } from "lucide-react";
import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
import RetirementCalculator from "./RetirementCalculator";
import { useUserSettings } from "@/hooks/useUserSettings";
import UserProfileManager, { UserProfileManagerHandle } from "./UserProfileManager";
import ReportDialog from "./ReportDialog";
import InvestmentOverview from "./InvestmentOverview";
import StockTable from "./StockTable";
import PortfolioForms from "./PortfolioForms";
import PortfolioCharts from "./PortfolioCharts";
import PortfolioSummary from "./PortfolioSummary";
import { usePortfolioState } from "@/hooks/usePortfolioState";
import {
  calculateYearlyValues,
  calculateTotalValues,
  prepareLineChartData,
  preparePercentageBarChartData,
  formatLargeNumber,
  getLatestYearGrowthRate
} from "@/utils/portfolioCalculations";

const StockPortfolioTracker: React.FC = () => {
  // 使用自定义Hook管理投资组合状态
  const portfolioState = usePortfolioState();

  // 解构状态和方法
  const {
    yearData,
    years,
    filteredYears,
    selectedYear,
    priceData,
    isLoading,
    currency,
    exchangeRates,
    isLoggedIn,
    currentUser,
    isMoreMenuOpen,
    setIsMoreMenuOpen,
    refreshPrices,
  } = portfolioState;

  // 本地状态
  const [showPositionChart, setShowPositionChart] = useState(true);
  const [hiddenSeries, setHiddenSeries] = useState<{
    [dataKey: string]: boolean;
  }>({});
  const [hiddenStocks] = useState<{
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
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedReportYear, setSelectedReportYear] = useState<string | null>(null);
  const [comparisonYear, setComparisonYear] = useState<string>(years[0]);

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
  } = useUserSettings(currentUser, isLoggedIn, () => {});

  const userProfileRef = useRef<UserProfileManagerHandle>(null);

  const latestYear = years.length > 0 ? Math.max(...years.map(Number)).toString() : "2024";

  // 使用useMemo优化计算
  const yearlyValues = useMemo(() =>
    calculateYearlyValues(yearData, hiddenStocks),
    [yearData, hiddenStocks]
  );

  const totalValues = useMemo(() =>
    calculateTotalValues(yearData, hiddenStocks),
    [yearData, hiddenStocks]
  );

  const lineChartData = useMemo(() =>
    prepareLineChartData(
      () => yearlyValues,
      yearData,
      latestYear,
      hiddenStocks
    ),
    [yearlyValues, yearData, latestYear, hiddenStocks]
  );

  const barChartData = useMemo(() =>
    preparePercentageBarChartData(yearData, latestYear, hiddenStocks),
    [yearData, latestYear, hiddenStocks]
  );

  // 获取最新年增长率
  const latestYearGrowthRate = useMemo(() =>
    getLatestYearGrowthRate(years, yearData),
    [years, yearData]
  );

  // 表格数据
  const tableData = useMemo(() => {
    const stockSet = new Set<string>();
    Object.values(yearData).forEach((yearDataItem) => {
      if (yearDataItem && yearDataItem.stocks) {
        yearDataItem.stocks.forEach((stock) => stockSet.add(stock.name));
      }
    });

    const stockValues2025: { [key: string]: number } = {};
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

  // 事件处理函数
  const handleLegendClick = useCallback((data: { value: string }) => {
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
  }, []);

  const handleReportClick = useCallback((year: string) => {
    setSelectedReportYear(year);
    setIsReportDialogOpen(true);
  }, []);

  const calculateCumulativeInvested = useCallback((year: string) => {
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
  }, [years, yearData]);

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

  // 副作用
  useEffect(() => {
    if (lastRefreshTime) {
      const timer = setTimeout(() => {
        setLastRefreshTime(null);
      }, 120000);
      return () => clearTimeout(timer);
    }
  }, [lastRefreshTime]);

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
  }, [isMoreMenuOpen, setIsMoreMenuOpen]);

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
              setCurrentUser={(user) => {
                // 这里可以添加用户状态更新逻辑
                console.log('User updated:', user);
              }}
              setIsLoggedIn={(loggedIn) => {
                // 这里可以添加登录状态更新逻辑
                console.log('Login status updated:', loggedIn);
              }}
              setAlertInfo={setAlertInfo}
              onDataFetch={async () => {
                // 这里可以添加数据获取逻辑
                console.log('Data fetch requested');
              }}
              onRefreshPrices={refreshPrices}
              currency={currency}
              latestYear={latestYear}
              totalValues={totalValues}
              formatLargeNumber={(value, curr) =>
                formatLargeNumber(value, curr || currency, exchangeRates)
              }
              getLatestYearGrowthRate={() => latestYearGrowthRate}
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

      {/* 使用新的表单组件 */}
      <PortfolioForms
        newYear={portfolioState.newYear}
        setNewYear={portfolioState.setNewYear}
        addNewYear={portfolioState.addNewYear}
        years={years}
        selectedYear={selectedYear}
        handleYearChange={portfolioState.handleYearChange}
        cashTransactionAmount={portfolioState.cashTransactionAmount}
        setCashTransactionAmount={portfolioState.setCashTransactionAmount}
        cashTransactionType={portfolioState.cashTransactionType}
        setCashTransactionType={portfolioState.setCashTransactionType}
        addCashTransaction={portfolioState.addCashTransaction}
        yearData={yearData}
        currency={currency}
        formatLargeNumber={(num, curr) => formatLargeNumber(num, curr, exchangeRates)}
        setCurrency={portfolioState.setCurrency}
        newStockName={portfolioState.newStockName}
        setNewStockName={portfolioState.setNewStockName}
        newStockSymbol={portfolioState.newStockSymbol}
        setNewStockSymbol={portfolioState.setNewStockSymbol}
        transactionType={portfolioState.transactionType}
        setTransactionType={portfolioState.setTransactionType}
        newShares={portfolioState.newShares}
        setNewShares={portfolioState.setNewShares}
        newPrice={portfolioState.newPrice}
        setNewPrice={portfolioState.setNewPrice}
        newYearEndPrice={portfolioState.newYearEndPrice}
        setNewYearEndPrice={portfolioState.setNewYearEndPrice}
        confirmAddNewStock={portfolioState.confirmAddNewStock}
        latestYear={latestYear}
        priceData={priceData}
        refreshPrices={refreshPrices}
        isLoading={isLoading}
      />

      <InvestmentOverview
        years={years}
        comparisonYear={comparisonYear}
        setComparisonYear={setComparisonYear}
        calculateInvestmentReturn={calculateInvestmentReturn}
        formatLargeNumber={(num, curr) => formatLargeNumber(num, curr, exchangeRates)}
        currency={currency}
      />

      {/* 使用新的摘要组件 */}
      <PortfolioSummary
        years={years}
        totalValues={totalValues}
        formatLargeNumber={(num, curr) => formatLargeNumber(num, curr, exchangeRates)}
        currency={currency}
        handleReportClick={handleReportClick}
      />

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
            if (latestYearGrowthRate) {
              updateAnnualReturn(latestYearGrowthRate);
            }
          }}
          formatLargeNumber={(value, curr) =>
            formatLargeNumber(value, curr || currency, exchangeRates)
          }
        />
      </div>

      {/* 使用新的图表组件 */}
      <PortfolioCharts
        showPositionChart={showPositionChart}
        setShowPositionChart={setShowPositionChart}
        lineChartData={lineChartData}
        barChartData={barChartData}
        years={years}
        hiddenStocks={hiddenStocks}
        hiddenSeries={hiddenSeries}
        handleLegendClick={handleLegendClick}
        formatLargeNumber={(num, curr) => formatLargeNumber(num, curr, exchangeRates)}
        currency={currency}
      />

      <StockTable
        years={years}
        filteredYears={filteredYears}
        table={tableData}
        yearData={yearData}
        hiddenStocks={hiddenStocks}
        editingStockName={null}
        editedRowData={null}
        selectedYear={selectedYear}
        latestYear={latestYear}
        lastRefreshTime={lastRefreshTime}
        currency={currency}
        formatLargeNumber={(num, curr) => formatLargeNumber(num, curr, exchangeRates)}
        toggleStockVisibility={() => {}}
        handleEditRow={() => {}}
        handleSaveRow={() => {}}
        handleInputChange={() => {}}
        handleDeleteStock={() => {}}
        handleYearFilterSelectionChange={() => {}}
      />

      <ReportDialog
        isOpen={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        selectedYear={selectedReportYear}
        yearData={yearData}
        hiddenStocks={hiddenStocks}
        formatLargeNumber={(num, curr) => formatLargeNumber(num, curr, exchangeRates)}
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
