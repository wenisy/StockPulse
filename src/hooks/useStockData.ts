import { useState, useCallback } from 'react';
import { YearData, StockTransaction, CashTransaction } from '@/types/stock';
import { stockInitialData } from '@/components/data';
import { v4 as uuidv4 } from 'uuid';

export const useStockData = () => {
  const initialData: { [year: string]: YearData } = stockInitialData;

  const [yearData, setYearData] = useState<{ [year: string]: YearData }>(initialData);
  const [years, setYears] = useState<string[]>(
    Object.keys(initialData).sort((a, b) => parseInt(b) - parseInt(a))
  );
  const [filteredYears, setFilteredYears] = useState<string[]>(
    Object.keys(initialData).sort((a, b) => parseInt(b) - parseInt(a))
  );

  // 年份筛选状态
  const [setYearFilter] = useState<(value: string) => void>(
    () => (value: string) => {
      if (value === "all") {
        setFilteredYears(years);
      } else {
        // 单选模式
        setFilteredYears([value]);
      }
    }
  );

  const addNewYear = useCallback((newYear: string) => {
    if (!newYear || years.includes(newYear)) {
      return false;
    }

    // 获取上一年的年份
    const previousYear = (parseInt(newYear) - 1).toString();
    const previousYearData = yearData[previousYear];

    // 继承上一年的股票持仓和现金余额
    const newYearData: YearData = {
      stocks: previousYearData?.stocks?.map(stock => ({
        ...stock,
        // 保持上一年的年末价格
      })) || [],
      stockTransactions: [],     // 新年份交易记录清空
      cashTransactions: [],      // 新年份现金交易清空
      cashBalance: previousYearData?.cashBalance || 0,  // 继承现金余额
    };

    setYearData(prev => ({
      ...prev,
      [newYear]: newYearData,
    }));

    const updatedYears = [...years, newYear].sort((a, b) => parseInt(b) - parseInt(a));
    setYears(updatedYears);
    setFilteredYears(updatedYears);
    
    return true;
  }, [years, yearData]);

  const addCashTransaction = useCallback((
    year: string,
    type: 'deposit' | 'withdraw',
    amount: number
  ) => {
    if (!year || amount <= 0) {
      return false;
    }

    const transaction: CashTransaction = {
      id: uuidv4(),
      type,
      amount,
      date: new Date().toISOString(),
    };

    setYearData(prev => {
      const currentData = prev[year] || {
        stocks: [],
        stockTransactions: [],
        cashTransactions: [],
        cashBalance: 0,
      };

      const newBalance = type === 'deposit' 
        ? currentData.cashBalance + amount
        : currentData.cashBalance - amount;

      return {
        ...prev,
        [year]: {
          ...currentData,
          cashTransactions: [...currentData.cashTransactions, transaction],
          cashBalance: newBalance,
        },
      };
    });

    return true;
  }, []);

  const addStockTransaction = useCallback((
    year: string,
    stockName: string,
    stockSymbol: string,
    type: 'buy' | 'sell',
    shares: number,
    price: number,
    yearEndPrice?: number
  ) => {
    if (!year || !stockName || shares <= 0 || price <= 0) {
      return false;
    }

    const transaction: StockTransaction = {
      id: uuidv4(),
      stockName,
      stockSymbol,
      type,
      shares,
      price,
      date: new Date().toISOString(),
    };

    setYearData(prev => {
      const currentData = prev[year] || {
        stocks: [],
        stockTransactions: [],
        cashTransactions: [],
        cashBalance: 0,
      };

      // 更新股票交易记录
      const newTransactions = [...currentData.stockTransactions, transaction];

      // 重新计算股票持仓
      const stockMap = new Map();
      
      // 处理所有交易记录
      newTransactions.forEach(trans => {
        const key = trans.stockName;
        if (!stockMap.has(key)) {
          stockMap.set(key, {
            name: trans.stockName,
            symbol: trans.stockSymbol,
            shares: 0,
            totalCost: 0,
            price: yearEndPrice || trans.price,
          });
        }

        const stock = stockMap.get(key);
        if (trans.type === 'buy') {
          stock.totalCost += trans.shares * trans.price;
          stock.shares += trans.shares;
        } else {
          // 卖出时按照平均成本价计算
          const avgCost = stock.shares > 0 ? stock.totalCost / stock.shares : trans.price;
          stock.totalCost -= trans.shares * avgCost;
          stock.shares -= trans.shares;
        }

        // 更新价格
        if (yearEndPrice !== undefined) {
          stock.price = yearEndPrice;
        }
      });

      // 转换为数组，过滤掉持仓为0的股票
      const updatedStocks = Array.from(stockMap.values())
        .filter(stock => stock.shares > 0)
        .map(stock => ({
          ...stock,
          costPrice: stock.shares > 0 ? stock.totalCost / stock.shares : 0,
        }));

      // 计算现金变化
      const transactionCost = type === 'buy' 
        ? shares * price 
        : -(shares * price); // 卖出增加现金

      const newCashBalance = currentData.cashBalance - transactionCost;

      return {
        ...prev,
        [year]: {
          ...currentData,
          stocks: updatedStocks,
          stockTransactions: newTransactions,
          cashBalance: newCashBalance,
        },
      };
    });

    return true;
  }, []);

  const updateStock = useCallback((
    stockName: string,
    year: string,
    quantity: number,
    unitPrice: number,
    costPrice: number,
    symbol?: string
  ) => {
    setYearData(prev => {
      const currentData = prev[year];
      if (!currentData) return prev;

      const updatedStocks = currentData.stocks.map(stock => {
        if (stock.name === stockName) {
          return {
            ...stock,
            shares: quantity,
            price: unitPrice,
            costPrice: costPrice,
            symbol: symbol || stock.symbol,
          };
        }
        return stock;
      });

      return {
        ...prev,
        [year]: {
          ...currentData,
          stocks: updatedStocks,
        },
      };
    });
  }, []);

  const deleteStock = useCallback((stockName: string) => {
    setYearData(prev => {
      const newData = { ...prev };
      
      Object.keys(newData).forEach(year => {
        newData[year] = {
          ...newData[year],
          stocks: newData[year].stocks.filter(stock => stock.name !== stockName),
          stockTransactions: newData[year].stockTransactions.filter(
            transaction => transaction.stockName !== stockName
          ),
        };
      });

      return newData;
    });
  }, []);

  const handleYearFilterSelectionChange = useCallback((selected: string[]) => {
    if (selected.length === 0) {
      setFilteredYears(years);
    } else {
      setFilteredYears(selected);
    }
  }, [years]);

  return {
    yearData,
    setYearData,
    years,
    setYears,
    filteredYears,
    setFilteredYears,
    setYearFilter,
    addNewYear,
    addCashTransaction,
    addStockTransaction,
    updateStock,
    deleteStock,
    handleYearFilterSelectionChange,
  };
};
