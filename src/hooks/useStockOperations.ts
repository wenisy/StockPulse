import { useState, useCallback } from 'react';
import { AlertInfo, IncrementalChanges, User, YearData } from '@/types/stock';
import {
  computeWeightedCostPrice,
  computeRemainingCostAfterSell,
  computeRealizedProfit,
} from '@/lib/portfolio/cost-basis';
import {
  applyStockTransactionToYear,
  removeStockFromAllYears,
  mergeEditedRowData,
} from '@/lib/portfolio/year-data';
import {
  appendStockTxIncremental,
  appendYearlySummary,
} from '@/lib/portfolio/incremental';

export interface UseStockOperationsProps {
  yearData: { [year: string]: YearData };
  setYearData: React.Dispatch<React.SetStateAction<{ [year: string]: YearData }>>;
  setIncrementalChanges: React.Dispatch<React.SetStateAction<IncrementalChanges>>;
  setAlertInfo: (info: AlertInfo | null) => void;
  currentUser: User | null;
  years: string[];
}

export interface EditedRowData {
  [year: string]: {
    quantity: string;
    unitPrice: string;
    costPrice: string;
    symbol?: string;
  };
}

export function useStockOperations({
  yearData,
  setYearData,
  setIncrementalChanges,
  setAlertInfo,
  currentUser,
  years,
}: UseStockOperationsProps) {
  // 表单状态
  const [newStockName, setNewStockName] = useState("");
  const [newShares, setNewShares] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newYearEndPrice, setNewYearEndPrice] = useState("");
  const [newStockSymbol, setNewStockSymbol] = useState("");
  const [transactionType, setTransactionType] = useState<"buy" | "sell">("buy");

  // 编辑状态
  const [editingStockName, setEditingStockName] = useState<string | null>(null);
  const [editedRowData, setEditedRowData] = useState<EditedRowData | null>(null);

  // 重置表单
  const resetForm = useCallback(() => {
    setNewStockName("");
    setNewShares("");
    setNewPrice("");
    setNewYearEndPrice("");
    setNewStockSymbol("");
    setTransactionType("buy");
  }, []);

  /**
   * 把一笔股票交易落到 yearData + incrementalChanges。
   * 这取代了原 updateStockInternal（与 usePortfolioData.updateStock 重复实现），
   * 现在两者都通过 lib 的 applyStockTransactionToYear / appendStockTxIncremental 完成。
   */
  const commitStockTransaction = useCallback(
    (
      year: string,
      stockName: string,
      shares: number,
      price: number,
      costPrice: number,
      transactionShares: number,
      transactionPrice: number,
      txType: 'buy' | 'sell',
      symbol?: string,
      beforeCostPrice?: number,
    ) => {
      setYearData((prev) => {
        const next = applyStockTransactionToYear(prev, year, {
          stockName,
          shares,
          price,
          costPrice,
          transactionShares,
          transactionPrice,
          transactionType: txType,
          symbol,
          beforeCostPrice,
          userUuid: currentUser?.uuid,
        });

        const newStocks = next[year].stocks;
        const stockSnapshot =
          newStocks.find((s) => s.name === stockName) ?? {
            name: stockName,
            shares,
            price,
            costPrice,
            id: '',
            symbol: symbol ?? '',
            userUuid: currentUser?.uuid,
          };
        const stockTx =
          next[year].stockTransactions[next[year].stockTransactions.length - 1];
        const cashTx =
          next[year].cashTransactions[next[year].cashTransactions.length - 1];

        setIncrementalChanges((prevInc) =>
          appendStockTxIncremental(prevInc, year, {
            stock: stockSnapshot,
            stockTx,
            cashTx,
            cashBalance: next[year].cashBalance,
          }),
        );

        return next;
      });
    },
    [currentUser, setYearData, setIncrementalChanges],
  );

  // 确认添加股票
  const confirmAddNewStock = useCallback(
    (selectedYear: string) => {
      if (!newStockName || !newShares || !newPrice || !selectedYear) return;

      const stockName = newStockName.trim();
      const transactionShares = parseInt(newShares, 10);
      const transactionPrice = parseFloat(newPrice);
      const yearEndPrice = newYearEndPrice ? parseFloat(newYearEndPrice) : null;
      const stockSymbol = newStockSymbol.trim();

      if (isNaN(transactionShares) || isNaN(transactionPrice)) return;

      const currentStock = yearData[selectedYear]?.stocks?.find(
        (s) => s.name === stockName,
      );
      const oldShares = currentStock ? currentStock.shares : 0;
      const oldCostPrice = currentStock ? currentStock.costPrice : 0;

      let newSharesValue = 0;
      let newCostPrice = 0;
      let transactionCost = 0;

      if (transactionType === 'buy') {
        newSharesValue = oldShares + transactionShares;
        transactionCost = transactionShares * transactionPrice;
        newCostPrice = computeWeightedCostPrice(
          oldShares,
          oldCostPrice,
          transactionShares,
          transactionPrice,
        );

        if ((yearData[selectedYear]?.cashBalance || 0) < transactionCost) {
          setAlertInfo({
            isOpen: true,
            title: '现金不足',
            description: '购买股票的现金不足，现金余额将变为负数',
            onConfirm: () => {
              setYearData((prev) => {
                const updated = { ...prev };
                updated[selectedYear].cashBalance =
                  (updated[selectedYear].cashBalance || 0) - transactionCost;
                return updated;
              });
              commitStockTransaction(
                selectedYear,
                stockName,
                newSharesValue,
                yearEndPrice || transactionPrice,
                newCostPrice,
                transactionShares,
                transactionPrice,
                transactionType,
                stockSymbol,
                oldCostPrice,
              );
              resetForm();
              setAlertInfo(null);
            },
            onCancel: () => setAlertInfo(null),
          });
          return;
        }
      } else {
        if (transactionShares > oldShares) {
          setAlertInfo({
            isOpen: true,
            title: '卖出失败',
            description: '卖出股数超过持有股数',
            onCancel: () => setAlertInfo(null),
          });
          return;
        }

        newSharesValue = oldShares - transactionShares;
        transactionCost = transactionShares * transactionPrice;
        newCostPrice = computeRemainingCostAfterSell(
          oldShares,
          oldCostPrice,
          transactionShares,
          transactionPrice,
        );
      }

      const displayYearEndPrice =
        yearEndPrice !== null
          ? yearEndPrice
          : currentStock
            ? currentStock.price
            : transactionPrice;
      const displayYearEndPriceText =
        yearEndPrice !== null
          ? displayYearEndPrice.toFixed(2)
          : `${displayYearEndPrice.toFixed(2)}（未填入）`;

      let profitInfo = '';
      if (transactionType === 'sell' && oldCostPrice > 0) {
        const profit = computeRealizedProfit(
          oldCostPrice,
          transactionShares,
          transactionPrice,
        );
        const profitPercentage = (transactionPrice / oldCostPrice - 1) * 100;
        profitInfo = `\n          预计盈利: ${profit.toFixed(2)} (${profitPercentage.toFixed(2)}%)`;
      }

      const description = `
          股票: ${stockName}
          交易类型: ${transactionType === 'buy' ? '买入' : '卖出'}
          股数: ${transactionShares}
          交易价格: ${transactionPrice.toFixed(2)}
          当前价格: ${displayYearEndPriceText}
          原成本价: ${oldCostPrice.toFixed(2)}
          新成本价: ${newCostPrice.toFixed(2)}${profitInfo}
          ${stockSymbol ? `股票代码: ${stockSymbol}` : ''}
        `;

      setAlertInfo({
        isOpen: true,
        title: '确认交易',
        description,
        onConfirm: () => {
          setYearData((prev) => {
            const updated = { ...prev };
            if (transactionType === 'buy') {
              updated[selectedYear].cashBalance =
                (updated[selectedYear].cashBalance || 0) - transactionCost;
            } else {
              updated[selectedYear].cashBalance =
                (updated[selectedYear].cashBalance || 0) + transactionCost;
            }
            return updated;
          });
          commitStockTransaction(
            selectedYear,
            stockName,
            newSharesValue,
            displayYearEndPrice,
            newCostPrice,
            transactionShares,
            transactionPrice,
            transactionType,
            stockSymbol,
            oldCostPrice,
          );
          resetForm();
          setAlertInfo(null);
        },
        onCancel: () => setAlertInfo(null),
      });
    },
    [
      newStockName,
      newShares,
      newPrice,
      newYearEndPrice,
      newStockSymbol,
      transactionType,
      yearData,
      setYearData,
      setAlertInfo,
      commitStockTransaction,
      resetForm,
    ],
  );

  // 编辑行
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
          initialEditedData[year] = {
            quantity: '',
            unitPrice: '',
            costPrice: '',
            symbol: '',
          };
        }
      });
      setEditedRowData(initialEditedData);
    },
    [years, yearData],
  );

  // 保存行
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

        // 把 affected 的快照拼装到 incrementalChanges
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

  // 输入变化
  const handleInputChange = useCallback(
    (
      year: string,
      field: 'quantity' | 'unitPrice' | 'costPrice' | 'symbol',
      value: string,
    ) => {
      if (editingStockName && editedRowData) {
        setEditedRowData((prev) => {
          if (!prev) return null;
          return { ...prev, [year]: { ...prev[year], [field]: value } };
        });
      }
    },
    [editingStockName, editedRowData],
  );

  // 删除股票
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
              updatedStocks[year] = updatedStocks[year].filter(
                (stock) => stock.name !== stockName,
              );
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
    // 表单状态
    newStockName,
    setNewStockName,
    newShares,
    setNewShares,
    newPrice,
    setNewPrice,
    newYearEndPrice,
    setNewYearEndPrice,
    newStockSymbol,
    setNewStockSymbol,
    transactionType,
    setTransactionType,

    // 编辑状态
    editingStockName,
    editedRowData,

    // 方法
    resetForm,
    confirmAddNewStock,
    handleEditRow,
    handleSaveRow,
    handleInputChange,
    handleDeleteStock,
  };
}
