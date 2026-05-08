import { useState, useCallback } from 'react';
import { AlertInfo, IncrementalChanges, User, YearData } from '@/types/stock';
import { removeStockFromAllYears, mergeEditedRowData } from '@/lib/portfolio/year-data';
import { appendYearlySummary } from '@/lib/portfolio/incremental';

export interface EditedRowData {
  [year: string]: {
    quantity: string;
    unitPrice: string;
    costPrice: string;
    symbol?: string;
  };
}

export interface UseStockRowEditProps {
  yearData: { [year: string]: YearData };
  setYearData: React.Dispatch<React.SetStateAction<{ [year: string]: YearData }>>;
  setIncrementalChanges: React.Dispatch<React.SetStateAction<IncrementalChanges>>;
  setAlertInfo: (info: AlertInfo | null) => void;
  currentUser: User | null;
  years: string[];
}

/**
 * 管理股票表格行编辑状态与删除操作。
 */
export function useStockRowEdit({
  yearData,
  setYearData,
  setIncrementalChanges,
  setAlertInfo,
  currentUser,
  years,
}: UseStockRowEditProps) {
  const [editingStockName, setEditingStockName] = useState<string | null>(null);
  const [editedRowData, setEditedRowData] = useState<EditedRowData | null>(null);

  const handleEditRow = useCallback(
    (stockName: string) => {
      setEditingStockName(stockName);
      const initialEditedData: EditedRowData = {};
      years.forEach((year) => {
        if (yearData[year] && yearData[year].stocks) {
          const stock = yearData[year].stocks.find((s) => s.name === stockName);
          initialEditedData[year] = {
            quantity: stock?.shares?.toString() || '',
            unitPrice: stock?.price?.toString() || '',
            costPrice: stock?.costPrice?.toString() || '',
            symbol: stock?.symbol || '',
          };
        } else {
          initialEditedData[year] = { quantity: '', unitPrice: '', costPrice: '', symbol: '' };
        }
      });
      setEditedRowData(initialEditedData);
    },
    [years, yearData],
  );

  const handleSaveRow = useCallback(
    (stockName: string) => {
      if (!editedRowData) return;

      setYearData((prevYearData) => {
        const result = mergeEditedRowData(
          prevYearData,
          stockName,
          editedRowData,
          years,
          currentUser?.uuid,
        );

        if (result.affected.length > 0) {
          setIncrementalChanges((prev) => {
            let next = prev;
            result.affected.forEach(({ year, stock, cashBalance }) => {
              next = {
                ...next,
                stocks: {
                  ...next.stocks,
                  [year]: [...(next.stocks[year] || []), stock],
                },
              };
              next = appendYearlySummary(next, year, cashBalance);
            });
            return next;
          });
        }

        return result.yearData;
      });
      setEditingStockName(null);
      setEditedRowData(null);
    },
    [years, editedRowData, currentUser, setYearData, setIncrementalChanges],
  );

  const handleInputChange = useCallback(
    (year: string, field: 'quantity' | 'unitPrice' | 'costPrice' | 'symbol', value: string) => {
      if (editingStockName && editedRowData) {
        setEditedRowData((prev) => {
          if (!prev) return null;
          return { ...prev, [year]: { ...prev[year], [field]: value } };
        });
      }
    },
    [editingStockName, editedRowData],
  );

  const handleDeleteStock = useCallback(
    (stockName: string) => {
      setAlertInfo({
        isOpen: true,
        title: '确认删除',
        description: `确定要删除 ${stockName} 吗？`,
        onConfirm: () => {
          setYearData((prev) => removeStockFromAllYears(prev, stockName));

          setIncrementalChanges((prev) => {
            const updatedStocks = { ...prev.stocks };
            Object.keys(updatedStocks).forEach((year) => {
              updatedStocks[year] = updatedStocks[year].filter((stock) => stock.name !== stockName);
            });
            return { ...prev, stocks: updatedStocks };
          });

          setAlertInfo(null);
        },
        onCancel: () => setAlertInfo(null),
        confirmText: '确认',
        cancelText: '取消',
      });
    },
    [setYearData, setIncrementalChanges, setAlertInfo],
  );

  return {
    editingStockName,
    editedRowData,
    handleEditRow,
    handleSaveRow,
    handleInputChange,
    handleDeleteStock,
  };
}
