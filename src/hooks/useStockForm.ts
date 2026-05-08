import { useState, useCallback } from 'react';
import { AlertInfo, IncrementalChanges, User, YearData } from '@/types/stock';
import {
  computeWeightedCostPrice,
  computeRemainingCostAfterSell,
  computeRealizedProfit,
} from '@/lib/portfolio/cost-basis';
import { applyStockTransactionToYear } from '@/lib/portfolio/year-data';
import { appendStockTxIncremental } from '@/lib/portfolio/incremental';

export interface UseStockFormProps {
  yearData: { [year: string]: YearData };
  setYearData: React.Dispatch<React.SetStateAction<{ [year: string]: YearData }>>;
  setIncrementalChanges: React.Dispatch<React.SetStateAction<IncrementalChanges>>;
  setAlertInfo: (info: AlertInfo | null) => void;
  currentUser: User | null;
}

/**
 * 管理"添加股票交易"的表单状态与提交逻辑。
 * 包括：表单字段、resetForm、commitStockTransaction（内部）、confirmAddNewStock。
 */
export function useStockForm({
  yearData,
  setYearData,
  setIncrementalChanges,
  setAlertInfo,
  currentUser,
}: UseStockFormProps) {
  const [newStockName, setNewStockName] = useState('');
  const [newShares, setNewShares] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newYearEndPrice, setNewYearEndPrice] = useState('');
  const [newStockSymbol, setNewStockSymbol] = useState('');
  const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');

  const resetForm = useCallback(() => {
    setNewStockName('');
    setNewShares('');
    setNewPrice('');
    setNewYearEndPrice('');
    setNewStockSymbol('');
    setTransactionType('buy');
  }, []);

  /** 内部：把一笔股票交易落到 yearData + incrementalChanges */
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

        const stockSnapshot =
          next[year].stocks.find((s) => s.name === stockName) ?? {
            name: stockName,
            shares,
            price,
            costPrice,
            id: '',
            symbol: symbol ?? '',
            userUuid: currentUser?.uuid,
          };
        const stockTx = next[year].stockTransactions[next[year].stockTransactions.length - 1];
        const cashTx = next[year].cashTransactions[next[year].cashTransactions.length - 1];

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

  const confirmAddNewStock = useCallback(
    (selectedYear: string) => {
      if (!newStockName || !newShares || !newPrice || !selectedYear) return;

      const stockName = newStockName.trim();
      const transactionShares = parseInt(newShares, 10);
      const transactionPrice = parseFloat(newPrice);
      const yearEndPrice = newYearEndPrice ? parseFloat(newYearEndPrice) : null;
      const stockSymbol = newStockSymbol.trim();

      if (isNaN(transactionShares) || isNaN(transactionPrice)) return;

      const currentStock = yearData[selectedYear]?.stocks?.find((s) => s.name === stockName);
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
                const currentYearData = prev[selectedYear];
                if (!currentYearData) return prev;
                return {
                  ...prev,
                  [selectedYear]: {
                    ...currentYearData,
                    cashBalance: (currentYearData.cashBalance || 0) - transactionCost,
                  },
                };
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
        const profit = computeRealizedProfit(oldCostPrice, transactionShares, transactionPrice);
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
            const currentYearData = prev[selectedYear];
            if (!currentYearData) return prev;
            const cashBalance = transactionType === 'buy'
              ? (currentYearData.cashBalance || 0) - transactionCost
              : (currentYearData.cashBalance || 0) + transactionCost;
            return {
              ...prev,
              [selectedYear]: {
                ...currentYearData,
                cashBalance,
              },
            };
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

  return {
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
    resetForm,
    confirmAddNewStock,
  };
}
