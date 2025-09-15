import { useCallback, useMemo } from 'react';
import { YearData, StockChartData } from '@/types/stock';

export const useCalculations = (
  yearData: { [year: string]: YearData },
  years: string[],
  filteredYears: string[],
  hiddenStocks: { [stockName: string]: boolean },
  convertToCurrency: (amount: number, from: string, to: string) => number,
  currency: string
) => {
  
  const calculateYearlyValues = useCallback(() => {
    const yearlyValues: { [year: string]: number } = {};
    
    Object.keys(yearData).forEach(year => {
      const data = yearData[year];
      const stockValue = data.stocks
        .filter(stock => !hiddenStocks[stock.name])
        .reduce((acc, stock) => acc + stock.shares * stock.price, 0);
      const totalValue = stockValue + data.cashBalance;
      yearlyValues[year] = convertToCurrency(totalValue, "USD", currency);
    });
    
    return yearlyValues;
  }, [yearData, hiddenStocks, convertToCurrency, currency]);

  const calculateTotalValues = useCallback(() => {
    return calculateYearlyValues();
  }, [calculateYearlyValues]);

  const prepareLineChartData = useCallback(() => {
    const data: StockChartData[] = [];
    const stockNames = new Set<string>();

    // 收集所有股票名称
    Object.values(yearData).forEach(data => {
      data.stocks.forEach(stock => {
        if (!hiddenStocks[stock.name]) {
          stockNames.add(stock.name);
        }
      });
    });

    filteredYears.forEach(year => {
      const yearDataItem = yearData[year];
      if (!yearDataItem) return;

      const dataPoint: StockChartData = {
        year,
        现金: convertToCurrency(yearDataItem.cashBalance, "USD", currency),
      };

      stockNames.forEach(stockName => {
        const stock = yearDataItem.stocks.find(s => s.name === stockName);
        if (stock) {
          dataPoint[stockName] = convertToCurrency(
            stock.shares * stock.price,
            "USD",
            currency
          );
        } else {
          dataPoint[stockName] = 0;
        }
      });

      data.push(dataPoint);
    });

    return data.sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [yearData, filteredYears, hiddenStocks, convertToCurrency, currency]);

  const preparePercentageBarChartData = useCallback(() => {
    const data: StockChartData[] = [];
    const stockNames = new Set<string>();

    // 收集所有股票名称
    Object.values(yearData).forEach(data => {
      data.stocks.forEach(stock => {
        if (!hiddenStocks[stock.name]) {
          stockNames.add(stock.name);
        }
      });
    });

    filteredYears.forEach(year => {
      const yearDataItem = yearData[year];
      if (!yearDataItem) return;

      const totalValue = yearDataItem.stocks
        .filter(stock => !hiddenStocks[stock.name])
        .reduce((acc, stock) => acc + stock.shares * stock.price, 0) + 
        yearDataItem.cashBalance;

      if (totalValue <= 0) return;

      const dataPoint: StockChartData = {
        year,
        现金: (yearDataItem.cashBalance / totalValue) * 100,
      };

      stockNames.forEach(stockName => {
        const stock = yearDataItem.stocks.find(s => s.name === stockName);
        if (stock) {
          dataPoint[stockName] = ((stock.shares * stock.price) / totalValue) * 100;
        } else {
          dataPoint[stockName] = 0;
        }
      });

      data.push(dataPoint);
    });

    return data.sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [yearData, filteredYears, hiddenStocks]);

  const getLatestYearGrowthRate = useCallback(() => {
    const sortedYears = years.sort((a, b) => parseInt(a) - parseInt(b));
    if (sortedYears.length < 2) return null;

    const latestYear = sortedYears[sortedYears.length - 1];
    const previousYear = sortedYears[sortedYears.length - 2];

    const latestValue = calculateYearlyValues()[latestYear] || 0;
    const previousValue = calculateYearlyValues()[previousYear] || 0;

    if (previousValue <= 0) return null;

    const growthRate = ((latestValue - previousValue) / previousValue) * 100;
    return growthRate;
  }, [years, calculateYearlyValues]);

  const tableData = useCallback(() => {
    const allStockNames = new Set<string>();
    
    Object.values(yearData).forEach(data => {
      data.stocks.forEach(stock => allStockNames.add(stock.name));
    });

    return Array.from(allStockNames).map(stockName => {
      const row: any = { stockName };
      
      years.forEach(year => {
        const stock = yearData[year]?.stocks.find(s => s.name === stockName);
        if (stock) {
          row[`${year}_quantity`] = stock.shares;
          row[`${year}_unitPrice`] = stock.price;
          row[`${year}_costPrice`] = stock.costPrice;
          row[`${year}_value`] = convertToCurrency(
            stock.shares * stock.price,
            "USD",
            currency
          );
          row[`${year}_symbol`] = stock.symbol;
        } else {
          row[`${year}_quantity`] = 0;
          row[`${year}_unitPrice`] = 0;
          row[`${year}_costPrice`] = 0;
          row[`${year}_value`] = 0;
          row[`${year}_symbol`] = "";
        }
      });
      
      return row;
    });
  }, [yearData, years, convertToCurrency, currency]);

  const calculateCumulativeInvested = useCallback((targetYear: string) => {
    let cumulativeInvested = 0;
    
    years
      .filter(year => parseInt(year) <= parseInt(targetYear))
      .forEach(year => {
        const data = yearData[year];
        if (data) {
          // 累计现金投入
          data.cashTransactions.forEach(transaction => {
            if (transaction.type === 'deposit') {
              cumulativeInvested += convertToCurrency(transaction.amount, "USD", currency);
            }
          });
          
          // 累计股票投入（按成本价计算）
          data.stocks.forEach(stock => {
            if (!hiddenStocks[stock.name]) {
              cumulativeInvested += convertToCurrency(
                stock.shares * stock.costPrice,
                "USD",
                currency
              );
            }
          });
        }
      });
    
    return cumulativeInvested;
  }, [yearData, years, hiddenStocks, convertToCurrency, currency]);

  const calculateTotalInvestment = useCallback((targetYear: string) => {
    let totalCashDeposited = 0;
    
    years
      .filter(year => parseInt(year) <= parseInt(targetYear))
      .forEach(year => {
        const data = yearData[year];
        if (data) {
          data.cashTransactions.forEach(transaction => {
            if (transaction.type === 'deposit') {
              totalCashDeposited += convertToCurrency(transaction.amount, "USD", currency);
            } else {
              totalCashDeposited -= convertToCurrency(transaction.amount, "USD", currency);
            }
          });
        }
      });
    
    return totalCashDeposited;
  }, [yearData, years, convertToCurrency, currency]);

  const calculateInvestmentReturn = useCallback((targetYear: string) => {
    const totalInvestment = calculateTotalInvestment(targetYear);
    const totalValues = calculateTotalValues();
    const portfolioValue = totalValues[targetYear] || 0;
    
    const absoluteReturn = portfolioValue - totalInvestment;
    const percentageReturn = totalInvestment > 0 
      ? (absoluteReturn / totalInvestment) * 100 
      : 0;

    return {
      totalInvestment,
      portfolioValue,
      absoluteReturn,
      percentageReturn,
    };
  }, [calculateTotalInvestment, calculateTotalValues]);

  // 使用 useMemo 缓存计算结果
  const memoizedValues = useMemo(() => {
    const lineChartData = prepareLineChartData();
    const barChartData = preparePercentageBarChartData();
    const totalValues = calculateTotalValues();
    const table = tableData();
    
    return {
      lineChartData,
      barChartData,
      totalValues,
      table,
    };
  }, [prepareLineChartData, preparePercentageBarChartData, calculateTotalValues, tableData]);

  return {
    calculateYearlyValues,
    calculateTotalValues,
    prepareLineChartData,
    preparePercentageBarChartData,
    getLatestYearGrowthRate,
    tableData,
    calculateCumulativeInvested,
    calculateTotalInvestment,
    calculateInvestmentReturn,
    ...memoizedValues,
  };
};
