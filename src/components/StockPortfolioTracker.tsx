"use client";
import React from "react";

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
import RetirementCalculator from "./RetirementCalculator";

import { AlertDialog } from "./tracker/AlertDialog";
import { useTrackerState } from "./tracker/hooks/useTrackerState";
import { useTrackerCallbacks } from "./tracker/hooks/useTrackerCallbacks";
import { useTrackerEffects } from "./tracker/hooks/useTrackerEffects";

const StockPortfolioTracker: React.FC = () => {
  const trackerState = useTrackerState();

  const portfolioData = usePortfolioData({
    currentUser: trackerState.currentUser,
    isLoggedIn: trackerState.isLoggedIn,
    setAlertInfo: trackerState.setAlertInfo,
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
    fetchJsonData,
    refreshPrices,
    saveDataToBackend,
    getBasePath,
    formatLargeNumber,
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
  } = useUserSettings(
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
    loadUserSettings,
  });

  const alertInfo = trackerState.alertInfo;
  const currency = trackerState.currency;

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-8">
      <PortfolioHeader
        isLoggedIn={trackerState.isLoggedIn}
        currentUser={trackerState.currentUser}
        isLoading={isLoading}
        currency={currency}
        latestYear={latestYear}
        totalValues={chartData.totalValues}
        setCurrentUser={trackerState.setCurrentUser}
        setIsLoggedIn={trackerState.setIsLoggedIn}
        setAlertInfo={trackerState.setAlertInfo}
        onRefreshPrices={refreshPrices}
        onDataFetch={fetchJsonData}
        formatLargeNumber={(value, curr) => formatLargeNumber(value, curr || currency)}
        getLatestYearGrowthRate={chartData.getLatestYearGrowthRate}
      />

      <ControlPanel
        years={years}
        selectedYear={selectedYear}
        newYear={trackerState.newYear}
        latestYear={latestYear}
        setNewYear={trackerState.setNewYear}
        onYearChange={callbacks.handleYearChange}
        onAddNewYear={callbacks.addNewYear}
        cashTransactionAmount={trackerState.cashTransactionAmount}
        cashTransactionType={trackerState.cashTransactionType}
        isCashTransactionLoading={trackerState.isCashTransactionLoading}
        setCashTransactionAmount={trackerState.setCashTransactionAmount}
        setCashTransactionType={trackerState.setCashTransactionType}
        onAddCashTransaction={callbacks.addCashTransaction}
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
        onAddStock={callbacks.onAddStock}
        yearData={yearData}
        priceData={priceData}
        currency={currency}
        formatLargeNumber={formatLargeNumber}
        exchangeRates={exchangeRates}
        setCurrency={trackerState.setCurrency}
      />

      <InvestmentOverview
        years={years}
        comparisonYear={comparisonYear}
        setComparisonYear={setComparisonYear}
        calculateInvestmentReturn={chartData.calculateInvestmentReturn}
        formatLargeNumber={formatLargeNumber}
        currency={currency}
      />

      <PortfolioOverview
        totalValues={chartData.totalValues}
        years={years}
        yearData={yearData}
        currency={currency}
        formatLargeNumber={formatLargeNumber}
        onReportClick={callbacks.handleReportClick}
      />

      <div className="mt-8 p-6 border rounded-lg shadow bg-bg-elevated">
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
            if (latestRate) updateAnnualReturn(latestRate);
          }}
          formatLargeNumber={(value, curr) => formatLargeNumber(value, curr || currency)}
        />
      </div>

      <StockCharts
        showPositionChart={trackerState.showPositionChart}
        setShowPositionChart={trackerState.setShowPositionChart}
        lineChartData={chartData.lineChartData}
        barChartData={chartData.barChartData}
        years={years}
        hiddenStocks={trackerState.hiddenStocks}
        hiddenSeries={trackerState.hiddenSeries}
        handleLegendClick={callbacks.handleLegendClick}
        formatLargeNumber={formatLargeNumber}
        currency={currency}
      />

      <StockTable
        years={years}
        filteredYears={filteredYears}
        table={tableData}
        yearData={yearData}
        hiddenStocks={trackerState.hiddenStocks}
        editingStockName={stockOperations.editingStockName}
        editedRowData={stockOperations.editedRowData}
        selectedYear={selectedYear}
        latestYear={latestYear}
        lastRefreshTime={lastRefreshTime}
        currency={currency}
        formatLargeNumber={formatLargeNumber}
        toggleStockVisibility={callbacks.toggleStockVisibility}
        handleEditRow={stockOperations.handleEditRow}
        handleSaveRow={stockOperations.handleSaveRow}
        handleInputChange={stockOperations.handleInputChange}
        handleDeleteStock={stockOperations.handleDeleteStock}
        handleYearFilterSelectionChange={callbacks.handleYearFilterSelectionChange}
      />

      <ReportDialog
        isOpen={trackerState.isReportDialogOpen}
        onOpenChange={trackerState.setIsReportDialogOpen}
        selectedYear={trackerState.selectedReportYear}
        yearData={yearData}
        hiddenStocks={trackerState.hiddenStocks}
        formatLargeNumber={formatLargeNumber}
        currency={currency}
        totalPortfolioValue={
          trackerState.selectedReportYear
            ? (yearData[trackerState.selectedReportYear]?.stocks?.reduce(
                (acc, stock) =>
                  trackerState.hiddenStocks[stock.name] ? acc : acc + stock.shares * stock.price,
                0,
              ) || 0) + (yearData[trackerState.selectedReportYear]?.cashBalance || 0)
            : 0
        }
        cumulativeInvested={
          trackerState.selectedReportYear
            ? chartData.calculateCumulativeInvested(trackerState.selectedReportYear)
            : 0
        }
        currentUser={trackerState.currentUser}
      />

      <AlertDialog
        alertInfo={alertInfo}
        onOpenChange={(open) => {
          if (!open) trackerState.setAlertInfo(null);
        }}
      />
    </div>
  );
};

export default StockPortfolioTracker;
