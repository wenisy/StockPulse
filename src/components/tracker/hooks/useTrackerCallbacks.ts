import { useCallback } from 'react';
import type { useTrackerState } from './useTrackerState';

type TrackerState = ReturnType<typeof useTrackerState>;

export interface UseTrackerCallbacksProps {
  trackerState: TrackerState;
  selectedYear: string;
  years: string[];
  setSelectedYear: React.Dispatch<React.SetStateAction<string>>;
  setFilteredYears: React.Dispatch<React.SetStateAction<string[]>>;
  portfolioAddNewYear: (value: string) => void;
  portfolioAddCashTransaction: (amount: number, type: 'deposit' | 'withdraw', year: string) => void;
  stockOpsConfirmAddNewStock: (year: string) => void;
}

/**
 * 聚合 StockPortfolioTracker 中的业务 callback。
 * 所有 callback 通过 props 注入的 state setter 完成工作，不持有额外 state。
 */
export function useTrackerCallbacks({
  trackerState,
  selectedYear,
  years,
  setSelectedYear,
  setFilteredYears,
  portfolioAddNewYear,
  portfolioAddCashTransaction,
  stockOpsConfirmAddNewStock,
}: UseTrackerCallbacksProps) {
  const addNewYear = useCallback(() => {
    portfolioAddNewYear(trackerState.newYear);
    trackerState.setNewYear('');
  }, [portfolioAddNewYear, trackerState]);

  const addCashTransaction = useCallback(async () => {
    if (
      !trackerState.cashTransactionAmount ||
      !selectedYear ||
      trackerState.isCashTransactionLoading
    )
      return;
    const amount = parseFloat(trackerState.cashTransactionAmount);
    if (isNaN(amount)) return;

    trackerState.setIsCashTransactionLoading(true);
    try {
      portfolioAddCashTransaction(amount, trackerState.cashTransactionType, selectedYear);
      trackerState.setCashTransactionAmount('');
      trackerState.setAlertInfo({
        isOpen: true,
        title: '操作成功',
        description: `已${
          trackerState.cashTransactionType === 'deposit' ? '存入' : '取出'
        }现金 $${Math.abs(amount).toFixed(2)}`,
        onConfirm: () => trackerState.setAlertInfo(null),
        confirmText: '确定',
      });
    } catch (error) {
      trackerState.setAlertInfo({
        isOpen: true,
        title: '操作失败',
        description: '添加现金交易时发生错误，请稍后重试',
        onConfirm: () => trackerState.setAlertInfo(null),
        confirmText: '确定',
      });
    } finally {
      setTimeout(() => {
        trackerState.setIsCashTransactionLoading(false);
      }, 1000);
    }
  }, [trackerState, selectedYear, portfolioAddCashTransaction]);

  const onAddStock = useCallback(() => {
    stockOpsConfirmAddNewStock(selectedYear);
  }, [stockOpsConfirmAddNewStock, selectedYear]);

  const toggleStockVisibility = useCallback(
    (stockName: string) => {
      trackerState.setHiddenStocks((prev) => ({
        ...prev,
        [stockName]: !prev[stockName],
      }));
    },
    [trackerState],
  );

  const handleYearFilterSelectionChange = useCallback(
    (selected: string[]) => {
      if (selected.includes('all') || selected.length === 0) {
        trackerState.setYearFilterMode('all');
        setFilteredYears(years);
      } else {
        trackerState.setYearFilterMode('custom');
        setFilteredYears(selected.sort((a, b) => parseInt(b) - parseInt(a)));
      }
    },
    [trackerState, setFilteredYears, years],
  );

  const handleLegendClick = useCallback(
    (data: { value: string }) => {
      let key = data.value;
      if (data.value === '总计') {
        key = 'total';
      } else if (data.value.endsWith('年占比')) {
        key = data.value.replace('年占比', '');
      }
      trackerState.setHiddenSeries((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [trackerState],
  );

  const handleReportClick = useCallback(
    (year: string) => {
      trackerState.setSelectedReportYear(year);
      trackerState.setIsReportDialogOpen(true);
    },
    [trackerState],
  );

  const handleYearChange = useCallback(
    (newYearValue: string) => {
      setSelectedYear(newYearValue);
    },
    [setSelectedYear],
  );

  return {
    addNewYear,
    addCashTransaction,
    onAddStock,
    toggleStockVisibility,
    handleYearFilterSelectionChange,
    handleLegendClick,
    handleReportClick,
    handleYearChange,
  };
}
