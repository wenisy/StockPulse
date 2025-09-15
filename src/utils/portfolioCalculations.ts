import { YearData, ExchangeRates, StockChartData } from "@/types/stock";

/**
 * 转换货币金额
 */
export const convertToCurrency = (
  amount: number,
  targetCurrency: string,
  exchangeRates: ExchangeRates
): number => {
  const rate = exchangeRates[targetCurrency] || 1;
  return amount / rate;
};

/**
 * 格式化大数字
 */
export const formatLargeNumber = (
  num: number,
  targetCurrency: string,
  exchangeRates: ExchangeRates
): string => {
  const convertedNum = convertToCurrency(num, targetCurrency, exchangeRates);
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(
    convertedNum
  );
};

/**
 * 计算年度总价值
 */
export const calculateYearlyValues = (
  yearData: { [year: string]: YearData },
  hiddenStocks: { [stockName: string]: boolean }
): { [year: string]: { [stockName: string]: number; total: number } } => {
  const yearlyValues: {
    [year: string]: { [stockName: string]: number; total: number };
  } = {};

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
};

/**
 * 计算总价值
 */
export const calculateTotalValues = (
  yearData: { [year: string]: YearData },
  hiddenStocks: { [stockName: string]: boolean }
): { [year: string]: number } => {
  const totalValues: { [year: string]: number } = {};

  Object.keys(yearData).forEach((year) => {
    if (yearData[year] && yearData[year].stocks) {
      const stockValue = yearData[year].stocks.reduce(
        (acc, stock) =>
          hiddenStocks[stock.name] ? acc : acc + stock.shares * stock.price,
        0
      );
      totalValues[year] = stockValue + (yearData[year].cashBalance || 0);
    } else {
      totalValues[year] = 0;
    }
  });

  return totalValues;
};

/**
 * 准备线图数据
 */
export const prepareLineChartData = (
  calculateYearlyValues: () => { [year: string]: { [stockName: string]: number; total: number } },
  yearData: { [year: string]: YearData },
  latestYear: string,
  hiddenStocks: { [stockName: string]: boolean }
): { [key: string]: string | number }[] => {
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
};

/**
 * 准备百分比柱状图数据
 */
export const preparePercentageBarChartData = (
  yearData: { [year: string]: YearData },
  latestYear: string,
  hiddenStocks: { [stockName: string]: boolean }
): StockChartData[] => {
  const result: StockChartData[] = [];
  const yearTotals: { [year: string]: number } = {};

  Object.keys(yearData).forEach((year) => {
    if (yearData[year] && yearData[year].stocks) {
      yearTotals[year] = yearData[year].stocks.reduce(
        (total, stock) =>
          hiddenStocks[stock.name]
            ? total
            : total + stock.shares * stock.price,
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
        const stockInYear = yearData[year].stocks.find(
          (s) => s.name === stockName
        );
        const stockValue = stockInYear
          ? stockInYear.shares * stockInYear.price
          : 0;
        const yearTotal = yearTotals[year] || 1;
        stockData[year] = (stockValue / yearTotal) * 100;
      } else {
        stockData[year] = 0;
      }
    });

    result.push(stockData);
  });

  return result;
};

/**
 * 获取基础路径
 */
export const getBasePath = (): string => {
  if (typeof window !== "undefined") {
    // 如果是GitHub Pages默认域名，使用/StockPulse前缀
    if (window.location.hostname.includes("github.io")) {
      return "/StockPulse";
    }
    // 如果是自定义域名，不使用前缀
    if (window.location.hostname === "stock.nodal.link") {
      return "";
    }
  }
  return "";
};

/**
 * 更新最新价格
 */
export const updateLatestPrices = (
  prices: { [symbol: string]: { price: number; currency?: string } },
  exchangeRates: ExchangeRates,
  latestYear: string,
  yearData: { [year: string]: YearData },
  setYearData: React.Dispatch<React.SetStateAction<{ [year: string]: YearData }>>
): void => {
  setYearData((prevYearData) => {
    const updatedYearData = { ...prevYearData };
    if (updatedYearData[latestYear] && updatedYearData[latestYear].stocks) {
      updatedYearData[latestYear].stocks.forEach((stock) => {
        if (stock.symbol && prices[stock.symbol]) {
          if (prices[stock.symbol].currency === "HKD") {
            stock.price = prices[stock.symbol].price * exchangeRates["HKD"];
          } else {
            stock.price = prices[stock.symbol].price;
          }
        }
      });
    }
    return updatedYearData;
  });
};

/**
 * 计算复合年增长率 (CAGR)
 */
export const getLatestYearGrowthRate = (
  years: string[],
  yearData: { [year: string]: YearData }
): string => {
  if (years.length < 1) return "";

  // 年份数组已经按照降序排列（最新的在前）
  const latestYear = years[0];
  const earliestYear = years[years.length - 1];

  // 计算投资年数（包括可能缺失的年份）
  const investmentYears = parseInt(latestYear) - parseInt(earliestYear) + 1;

  // 计算总价值函数
  const calculateTotalValue = (year: string) => {
    if (!yearData[year]?.stocks) return 0;
    const stockValue = yearData[year].stocks.reduce(
      (acc, stock) => acc + stock.shares * stock.price,
      0
    );
    return stockValue + (yearData[year].cashBalance || 0);
  };

  // 获取最新年份的总价值
  const currentValue = calculateTotalValue(latestYear);

  // 计算所有年份的累计投入现金
  let totalDeposits = 0;
  years.forEach((year) => {
    const deposits =
      yearData[year]?.cashTransactions.reduce(
        (sum, tx) => sum + (tx.type === "deposit" ? tx.amount : 0),
        0
      ) || 0;
    totalDeposits += deposits;
  });

  // 计算所有年份的累计提取现金
  let totalWithdrawals = 0;
  years.forEach((year) => {
    const withdrawals =
      yearData[year]?.cashTransactions.reduce(
        (sum, tx) => sum + (tx.type === "withdraw" ? tx.amount : 0),
        0
      ) || 0;
    totalWithdrawals += withdrawals;
  });

  // 累计净投入现金
  const netDeposits = totalDeposits - totalWithdrawals;

  if (netDeposits <= 0) return "";

  // 计算总收益率 = (当前总持仓价值 - 累计投入现金) / 累计投入现金
  const totalReturn = (currentValue - netDeposits) / netDeposits;

  // 计算复合年增长率(CAGR)
  // 公式：CAGR = ((1 + 总收益率)^(1/投资年数)) - 1
  const annualizedReturn =
    (Math.pow(1 + totalReturn, 1 / investmentYears) - 1) * 100;

  return annualizedReturn.toFixed(2);
};