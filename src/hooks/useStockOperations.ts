import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AlertInfo, IncrementalChanges, User, YearData } from '@/types/stock';

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

  // 更新股票（内部方法）
  const updateStockInternal = useCallback(
    (
      year: string,
      stockName: string,
      shares: number,
      price: number,
      costPrice: number,
      transactionShares: number,
      transactionPrice: number,
      txType: "buy" | "sell",
      symbol?: string,
      beforeCostPrice?: number
    ) => {
      setYearData((prevYearData) => {
        const updatedYearData = { ...prevYearData };
        if (!updatedYearData[year]) {
          updatedYearData[year] = {
            stocks: [],
            cashTransactions: [],
            stockTransactions: [],
            cashBalance: 0,
          };
        }

        if (!updatedYearData[year].stocks) {
          updatedYearData[year].stocks = [];
        }

        const stockIndex = updatedYearData[year].stocks.findIndex((s) => s.name === stockName);
        const stockData = {
          name: stockName,
          shares,
          price,
          costPrice,
          id: stockIndex !== -1 ? updatedYearData[year].stocks[stockIndex].id : uuidv4(),
          symbol: symbol || (stockIndex !== -1 ? updatedYearData[year].stocks[stockIndex].symbol : ""),
          userUuid: currentUser?.uuid,
        };

        if (stockIndex !== -1) {
          updatedYearData[year].stocks[stockIndex] = stockData;
          if (shares <= 0) {
            updatedYearData[year].stocks = updatedYearData[year].stocks.filter((_, i) => i !== stockIndex);
          }
        } else if (shares > 0) {
          updatedYearData[year].stocks.push(stockData);
        }

        const stockTransaction = {
          stockName,
          type: txType,
          shares: transactionShares,
          price: transactionPrice,
          date: new Date().toISOString().split("T")[0],
          beforeCostPrice: beforeCostPrice ?? 0,
          afterCostPrice: costPrice,
          userUuid: currentUser?.uuid,
        };
        updatedYearData[year].stockTransactions.push(stockTransaction);

        const cashTransaction = {
          amount: txType === "buy" ? -transactionShares * transactionPrice : transactionShares * transactionPrice,
          type: txType as "buy" | "sell",
          date: new Date().toISOString().split("T")[0],
          stockName,
          userUuid: currentUser?.uuid,
        };
        updatedYearData[year].cashTransactions.push(cashTransaction);

        // 更新增量变化
        setIncrementalChanges((prev) => ({
          ...prev,
          stocks: {
            ...prev.stocks,
            [year]: [...(prev.stocks[year] || []), stockData],
          },
          stockTransactions: {
            ...prev.stockTransactions,
            [year]: [...(prev.stockTransactions[year] || []), stockTransaction],
          },
          cashTransactions: {
            ...prev.cashTransactions,
            [year]: [...(prev.cashTransactions[year] || []), cashTransaction],
          },
          yearlySummaries: {
            ...prev.yearlySummaries,
            [year]: { cashBalance: updatedYearData[year].cashBalance },
          },
        }));

        return updatedYearData;
      });
    },
    [currentUser, setYearData, setIncrementalChanges]
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

      const currentStock = yearData[selectedYear]?.stocks?.find((s) => s.name === stockName);
      const oldShares = currentStock ? currentStock.shares : 0;
      const oldCostPrice = currentStock ? currentStock.costPrice : 0;
      const oldTotalCost = oldShares * oldCostPrice;

      let newSharesValue = 0;
      let newTotalCost = 0;
      let newCostPrice = 0;
      let transactionCost = 0;

      if (transactionType === "buy") {
        newSharesValue = oldShares + transactionShares;
        transactionCost = transactionShares * transactionPrice;
        newTotalCost = oldTotalCost + transactionCost;
        newCostPrice = newSharesValue > 0 ? newTotalCost / newSharesValue : 0;

        if ((yearData[selectedYear]?.cashBalance || 0) < transactionCost) {
          setAlertInfo({
            isOpen: true,
            title: "现金不足",
            description: "购买股票的现金不足，现金余额将变为负数",
            onConfirm: () => {
              setYearData((prev) => {
                const updated = { ...prev };
                updated[selectedYear].cashBalance = (updated[selectedYear].cashBalance || 0) - transactionCost;
                return updated;
              });
              updateStockInternal(
                selectedYear,
                stockName,
                newSharesValue,
                yearEndPrice || transactionPrice,
                newCostPrice,
                transactionShares,
                transactionPrice,
                transactionType,
                stockSymbol,
                oldCostPrice
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
            title: "卖出失败",
            description: "卖出股数超过持有股数",
            onCancel: () => setAlertInfo(null),
          });
          return;
        }

        newSharesValue = oldShares - transactionShares;
        transactionCost = transactionShares * transactionPrice;
        const sellProceeds = transactionPrice * transactionShares;
        newTotalCost = oldTotalCost - sellProceeds;
        newCostPrice = newSharesValue > 0 ? newTotalCost / newSharesValue : 0;
      }

      const displayYearEndPrice =
        yearEndPrice !== null ? yearEndPrice : currentStock ? currentStock.price : transactionPrice;
      const displayYearEndPriceText =
        yearEndPrice !== null
          ? displayYearEndPrice.toFixed(2)
          : `${displayYearEndPrice.toFixed(2)}（未填入）`;

      let profitInfo = "";
      if (transactionType === "sell" && oldCostPrice > 0) {
        const profit = (transactionPrice - oldCostPrice) * transactionShares;
        const profitPercentage = (transactionPrice / oldCostPrice - 1) * 100;
        profitInfo = `\n          预计盈利: ${profit.toFixed(2)} (${profitPercentage.toFixed(2)}%)`;
      }

      const description = `
          股票: ${stockName}
          交易类型: ${transactionType === "buy" ? "买入" : "卖出"}
          股数: ${transactionShares}
          交易价格: ${transactionPrice.toFixed(2)}
          当前价格: ${displayYearEndPriceText}
          原成本价: ${oldCostPrice.toFixed(2)}
          新成本价: ${newCostPrice.toFixed(2)}${profitInfo}
          ${stockSymbol ? `股票代码: ${stockSymbol}` : ""}
        `;

      setAlertInfo({
        isOpen: true,
        title: "确认交易",
        description,
        onConfirm: () => {
          setYearData((prev) => {
            const updated = { ...prev };
            if (transactionType === "buy") {
              updated[selectedYear].cashBalance = (updated[selectedYear].cashBalance || 0) - transactionCost;
            } else {
              updated[selectedYear].cashBalance = (updated[selectedYear].cashBalance || 0) + transactionCost;
            }
            return updated;
          });
          updateStockInternal(
            selectedYear,
            stockName,
            newSharesValue,
            displayYearEndPrice,
            newCostPrice,
            transactionShares,
            transactionPrice,
            transactionType,
            stockSymbol,
            oldCostPrice
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
      updateStockInternal,
      resetForm,
    ]
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
            quantity: stock?.shares?.toString() || "",
            unitPrice: stock?.price?.toString() || "",
            costPrice: stock?.costPrice?.toString() || "",
            symbol: stock?.symbol || "",
          };
        } else {
          initialEditedData[year] = { quantity: "", unitPrice: "", costPrice: "", symbol: "" };
        }
      });
      setEditedRowData(initialEditedData);
    },
    [years, yearData]
  );

  // 保存行
  const handleSaveRow = useCallback(
    (stockName: string) => {
      setYearData((prevYearData) => {
        const updatedYearData: { [year: string]: YearData } = { ...prevYearData };
        if (!editedRowData) return updatedYearData;

        years.forEach((year) => {
          if (!updatedYearData[year]) {
            updatedYearData[year] = {
              stocks: [],
              cashTransactions: [],
              stockTransactions: [],
              cashBalance: 0,
            };
          }

          if (!updatedYearData[year].stocks) {
            updatedYearData[year].stocks = [];
          }

          const editedInfo = editedRowData[year];
          if (!editedInfo) return;

          const shares = parseInt(editedInfo.quantity, 10);
          const price = parseFloat(editedInfo.unitPrice);
          const costPrice = parseFloat(editedInfo.costPrice);
          const symbol = editedInfo.symbol;

          if (!isNaN(shares) && !isNaN(price) && !isNaN(costPrice)) {
            const stockIndex = updatedYearData[year].stocks.findIndex((s) => s.name === stockName);
            if (stockIndex !== -1) {
              updatedYearData[year].stocks[stockIndex] = {
                ...updatedYearData[year].stocks[stockIndex],
                shares,
                price,
                costPrice,
                symbol,
              };
            } else {
              updatedYearData[year].stocks.push({
                name: stockName,
                shares,
                price,
                costPrice,
                id: uuidv4(),
                symbol,
                userUuid: currentUser?.uuid,
              });
            }

            setIncrementalChanges((prev) => ({
              ...prev,
              stocks: {
                ...prev.stocks,
                [year]: [
                  ...(prev.stocks[year] || []),
                  {
                    name: stockName,
                    shares,
                    price,
                    costPrice,
                    symbol,
                    id: uuidv4(),
                    userUuid: currentUser?.uuid,
                  },
                ],
              },
              yearlySummaries: {
                ...prev.yearlySummaries,
                [year]: { cashBalance: updatedYearData[year].cashBalance },
              },
            }));
          } else if (updatedYearData[year].stocks) {
            updatedYearData[year].stocks = updatedYearData[year].stocks.filter((s) => s.name !== stockName);
          }
        });
        return updatedYearData;
      });
      setEditingStockName(null);
      setEditedRowData(null);
    },
    [years, editedRowData, currentUser, setYearData, setIncrementalChanges]
  );

  // 输入变化
  const handleInputChange = useCallback(
    (year: string, field: "quantity" | "unitPrice" | "costPrice" | "symbol", value: string) => {
      if (editingStockName && editedRowData) {
        setEditedRowData((prev) => {
          if (!prev) return null;
          return { ...prev, [year]: { ...prev[year], [field]: value } };
        });
      }
    },
    [editingStockName, editedRowData]
  );

  // 删除股票
  const handleDeleteStock = useCallback(
    (stockName: string) => {
      setAlertInfo({
        isOpen: true,
        title: "确认删除",
        description: `确定要删除 ${stockName} 吗？`,
        onConfirm: () => {
          setYearData((prevYearData) => {
            const updatedYearData: { [year: string]: YearData } = {};
            Object.keys(prevYearData).forEach((year) => {
              if (prevYearData[year] && prevYearData[year].stocks) {
                updatedYearData[year] = {
                  ...prevYearData[year],
                  stocks: prevYearData[year].stocks.filter((stock) => stock.name !== stockName),
                };
              } else {
                updatedYearData[year] = prevYearData[year];
              }
            });
            return updatedYearData;
          });

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
        confirmText: "确认",
        cancelText: "取消",
      });
    },
    [setYearData, setIncrementalChanges, setAlertInfo]
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
