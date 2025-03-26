import { Stock, YearData, PriceData } from './types';

// 获取基础路径
export function getBasePath() {
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('github.io')) {
      return '/StockPulse';
    }
  }
  return '';
}

// 货币转换
export function convertToCurrency(amount: number, exchangeRates: { [key: string]: number }, targetCurrency: string): number {
  const rate = exchangeRates[targetCurrency] || 1;
  return amount / rate;
}

// 格式化大数字
export function formatLargeNumber(num: number, exchangeRates: { [key: string]: number }, targetCurrency: string) {
  const convertedNum = convertToCurrency(num, exchangeRates, targetCurrency);
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(convertedNum);
}

// 计算到达目标所需年数
export function calculateYearsToGoal(currentAmount: number, goalAmount: number, returnRate: number) {
  if (returnRate <= 0) return Infinity;
  const years = Math.log(goalAmount / currentAmount) / Math.log(1 + returnRate / 100);
  return Math.ceil(years);
}

// 计算所需回报率
export function calculateRequiredReturnRate(currentAmount: number, goalAmount: number, years: number) {
  if (years <= 0) return Infinity;
  return (Math.pow(goalAmount / currentAmount, 1 / years) - 1) * 100;
}

// 更新最新价格
export function updateStocksWithLatestPrices(
  yearData: { [year: string]: YearData },
  latestYear: string,
  prices: PriceData,
  exchangeRates: { [key: string]: number }
) {
  const updatedYearData = { ...yearData };
  
  if (updatedYearData[latestYear] && updatedYearData[latestYear].stocks) {
    updatedYearData[latestYear].stocks.forEach(stock => {
      if (stock.symbol && prices[stock.symbol]) {
        if (prices[stock.symbol].currency === 'HKD') {
          stock.price = prices[stock.symbol].price * exchangeRates['HKD'];
        } else {
          stock.price = prices[stock.symbol].price;
        }
      }
    });
  }
  
  return updatedYearData;
}

// 计算年度价值
export function calculateYearlyValues(
  yearData: { [year: string]: YearData },
  hiddenStocks: { [stockName: string]: boolean }
) {
  const yearlyValues: { [year: string]: { [stockName: string]: number; total: number } } = {};
  
  Object.keys(yearData).forEach((year) => {
    yearlyValues[year] = {};
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
    
    yearlyValues[year]['total'] = yearTotal;
  });
  
  return yearlyValues;
}

// 计算总价值
export function calculateTotalValues(
  yearData: { [year: string]: YearData },
  hiddenStocks: { [stockName: string]: boolean }
) {
  const totalValues: { [year: string]: number } = {};
  
  Object.keys(yearData).forEach((year) => {
    if (yearData[year] && yearData[year].stocks) {
      const stockValue = yearData[year].stocks.reduce(
        (acc, stock) => hiddenStocks[stock.name] ? acc : acc + stock.shares * stock.price, 
        0
      );
      totalValues[year] = stockValue + (yearData[year].cashBalance || 0);
    } else {
      totalValues[year] = 0;
    }
  });
  
  return totalValues;
}

// 准备折线图数据
export function prepareLineChartData(
  yearData: { [year: string]: YearData },
  latestYear: string,
  hiddenStocks: { [stockName: string]: boolean }
) {
  const yearlyValues = calculateYearlyValues(yearData, hiddenStocks);
  const latestStocks = new Set<string>();

  if (yearData[latestYear] && yearData[latestYear].stocks) {
    yearData[latestYear].stocks.forEach(stock => {
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
    dataPoint['total'] = yearlyValues[year]['total'];
    return dataPoint;
  });
}

// 准备百分比柱状图数据
export function preparePercentageBarChartData(
  yearData: { [year: string]: YearData },
  latestYear: string,
  hiddenStocks: { [stockName: string]: boolean }
) {
  const result: { name: string; [year: string]: number }[] = [];
  const yearTotals: { [year: string]: number } = {};

  Object.keys(yearData).forEach((year) => {
    if (yearData[year] && yearData[year].stocks) {
      yearTotals[year] = yearData[year].stocks.reduce(
        (total, stock) => hiddenStocks[stock.name] ? total : total + stock.shares * stock.price,
        0
      );
    } else {
      yearTotals[year] = 0;
    }
  });

  const latestStocks = new Set<string>();
  if (yearData[latestYear] && yearData[latestYear].stocks) {
    yearData[latestYear].stocks.forEach(stock => {
      if (!hiddenStocks[stock.name]) {
        latestStocks.add(stock.name);
      }
    });
  }

  latestStocks.forEach((stockName) => {
    const stockData: { name: string; [year: string]: number } = { name: stockName };

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
}

// 更新股票
export function updateStock(
  updatedYearData: { [year: string]: YearData },
  year: string,
  stockName: string,
  shares: number,
  price: number,
  costPrice: number,
  transactionShares: number,
  transactionPrice: number,
  transactionType: 'buy' | 'sell',
  symbol?: string
) {
  if (!updatedYearData[year]) {
    updatedYearData[year] = { stocks: [], cashTransactions: [], stockTransactions: [], cashBalance: 0 };
  }

  if (!updatedYearData[year].stocks) {
    updatedYearData[year].stocks = [];
  }

  const stockIndex = updatedYearData[year].stocks.findIndex((s) => s.name === stockName);
  const stockTransaction: StockTransaction = {
    stockName,
    type: transactionType,
    shares: transactionShares,
    price: transactionPrice,
    date: new Date().toISOString().split('T')[0],
  };

  if (!updatedYearData[year].stockTransactions) {
    updatedYearData[year].stockTransactions = [];
  }
  
  updatedYearData[year].stockTransactions.push(stockTransaction);

  if (stockIndex >= 0) {
    if (shares <= 0) {
      updatedYearData[year].stocks.splice(stockIndex, 1);
    } else {
      updatedYearData[year].stocks[stockIndex].shares = shares;
      updatedYearData[year].stocks[stockIndex].price = price;
      updatedYearData[year].stocks[stockIndex].costPrice = costPrice;
      if (symbol) {
        updatedYearData[year].stocks[stockIndex].symbol = symbol;
      }
    }
  } else if (shares > 0) {
    updatedYearData[year].stocks.push({
      name: stockName,
      shares,
      price,
      costPrice,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      symbol
    });
  }

  return updatedYearData;
}
