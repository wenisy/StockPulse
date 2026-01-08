import { useCallback, useMemo } from 'react';
import { StockChartData, YearData } from '@/types/stock';

export interface UseChartDataProps {
  yearData: { [year: string]: YearData };
  years: string[];
  latestYear: string;
  hiddenStocks: { [stockName: string]: boolean };
}

export function useChartData({
  yearData,
  years,
  latestYear,
  hiddenStocks,
}: UseChartDataProps) {
  // 计算年度值
  const calculateYearlyValues = useCallback(() => {
    const yearlyValues: { [year: string]: { [stockName: string]: number; total: number } } = {};
    Object.keys(yearData).forEach((year) => {
      yearlyValues[year] = { total: 0 };
      let yearTotal = 0;

      if (yearData[year] && yearData[year].stocks) {
        yearData[year].stocks.forEach((stock) => {
          if (!hiddenStocks[stock.name]) {
            const value = stock.shares * stock.price;
            yearlyValues[year][stock.name] = value;
            yearTotal += value;
          }
        });
      }
      yearlyValues[year]["total"] = yearTotal;
    });
    return yearlyValues;
  }, [yearData, hiddenStocks]);

  // 计算总值
  const totalValues = useMemo(() => {
    const values: { [year: string]: number } = {};
    Object.keys(yearData).forEach((year) => {
      if (yearData[year] && yearData[year].stocks) {
        const stockValue = yearData[year].stocks.reduce(
          (acc, stock) => (hiddenStocks[stock.name] ? acc : acc + stock.shares * stock.price),
          0
        );
        values[year] = stockValue + (yearData[year].cashBalance || 0);
      } else {
        values[year] = 0;
      }
    });
    return values;
  }, [yearData, hiddenStocks]);

  // 准备折线图数据
  const lineChartData = useMemo(() => {
    const yearlyValues = calculateYearlyValues();
    const latestStocks = new Set<string>();

    if (yearData[latestYear] && yearData[latestYear].stocks) {
      yearData[latestYear].stocks.forEach((stock) => {
        if (!hiddenStocks[stock.name]) {
          latestStocks.add(stock.name);
        }
      });
    }

    const allStocks = new Set<string>();
    Object.values(yearData).forEach((yearDataItem) => {
      if (yearDataItem && yearDataItem.stocks) {
        yearDataItem.stocks.forEach((stock) => {
          if (latestStocks.has(stock.name) && !hiddenStocks[stock.name]) {
            allStocks.add(stock.name);
          }
        });
      }
    });

    return Object.keys(yearData).map((year) => {
      const dataPoint: { [key: string]: string | number } = { year };
      allStocks.forEach((stockName) => {
        dataPoint[stockName] = yearlyValues[year][stockName] || 0;
      });
      dataPoint["total"] = yearlyValues[year]["total"];
      return dataPoint;
    });
  }, [calculateYearlyValues, yearData, latestYear, hiddenStocks]);

  // 准备柱状图数据
  const barChartData = useMemo(() => {
    const result: StockChartData[] = [];
    const yearTotals: { [year: string]: number } = {};

    Object.keys(yearData).forEach((year) => {
      if (yearData[year] && yearData[year].stocks) {
        yearTotals[year] = yearData[year].stocks.reduce(
          (total, stock) => (hiddenStocks[stock.name] ? total : total + stock.shares * stock.price),
          0
        );
      } else {
        yearTotals[year] = 0;
      }
    });

    const latestStocks = new Set<string>();
    if (yearData[latestYear] && yearData[latestYear].stocks) {
      yearData[latestYear].stocks.forEach((stock) => {
        if (!hiddenStocks[stock.name]) {
          latestStocks.add(stock.name);
        }
      });
    }

    latestStocks.forEach((stockName) => {
      const stockData: StockChartData = { name: stockName };

      Object.keys(yearData).forEach((year) => {
        if (yearData[year] && yearData[year].stocks) {
          const stockInYear = yearData[year].stocks.find((s) => s.name === stockName);
          const stockValue = stockInYear ? stockInYear.shares * stockInYear.price : 0;
          const yearTotal = yearTotals[year] || 1;
          stockData[year] = (stockValue / yearTotal) * 100;
        } else {
          stockData[year] = 0;
        }
      });

      result.push(stockData);
    });

    return result;
  }, [yearData, latestYear, hiddenStocks]);

  // 计算累计投入
  const calculateCumulativeInvested = useCallback(
    (year: string) => {
      let cumulativeInvested = 0;
      const sortedYears = [...years].sort();
      for (const y of sortedYears) {
        if (y > year) break;
        if (yearData[y] && yearData[y].cashTransactions) {
          cumulativeInvested += yearData[y].cashTransactions.reduce(
            (acc, tx) =>
              acc + (tx.type === "deposit" ? tx.amount : tx.type === "withdraw" ? -tx.amount : 0),
            0
          );
        }
      }
      return cumulativeInvested;
    },
    [years, yearData]
  );

  // 计算总投入
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

  // 计算投资回报
  const calculateInvestmentReturn = useCallback(
    (yearValue: string) => {
      const totalInvestment = calculateTotalInvestment(yearValue);
      const portfolioValue = totalValues[yearValue] || 0;
      const absoluteReturn = portfolioValue - totalInvestment;
      const percentageReturn = totalInvestment > 0 ? (absoluteReturn / totalInvestment) * 100 : 0;

      return { totalInvestment, portfolioValue, absoluteReturn, percentageReturn };
    },
    [calculateTotalInvestment, totalValues]
  );

  // 获取年化收益率
  const getLatestYearGrowthRate = useCallback(() => {
    if (years.length < 1) return "";

    const latestYearValue = years[0];
    const earliestYear = years[years.length - 1];
    const investmentYears = parseInt(latestYearValue) - parseInt(earliestYear) + 1;

    const calculateTotalValue = (year: string) => {
      if (!yearData[year]?.stocks) return 0;
      const stockValue = yearData[year].stocks.reduce(
        (acc, stock) => acc + stock.shares * stock.price,
        0
      );
      return stockValue + (yearData[year].cashBalance || 0);
    };

    const currentValue = calculateTotalValue(latestYearValue);

    let totalDeposits = 0;
    years.forEach((year) => {
      const deposits =
        yearData[year]?.cashTransactions.reduce(
          (sum, tx) => sum + (tx.type === "deposit" ? tx.amount : 0),
          0
        ) || 0;
      totalDeposits += deposits;
    });

    let totalWithdrawals = 0;
    years.forEach((year) => {
      const withdrawals =
        yearData[year]?.cashTransactions.reduce(
          (sum, tx) => sum + (tx.type === "withdraw" ? tx.amount : 0),
          0
        ) || 0;
      totalWithdrawals += withdrawals;
    });

    const netDeposits = totalDeposits - totalWithdrawals;
    if (netDeposits <= 0) return "";

    const totalReturn = (currentValue - netDeposits) / netDeposits;
    const annualizedReturn = (Math.pow(1 + totalReturn, 1 / investmentYears) - 1) * 100;

    return annualizedReturn.toFixed(2);
  }, [years, yearData]);

  return {
    totalValues,
    lineChartData,
    barChartData,
    calculateYearlyValues,
    calculateCumulativeInvested,
    calculateTotalInvestment,
    calculateInvestmentReturn,
    getLatestYearGrowthRate,
  };
}
