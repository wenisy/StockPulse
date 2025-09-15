import { useState, useCallback } from 'react';
import { PriceData, ExchangeRates, StockSymbol, YearData } from '@/types/stock';

export const usePriceData = () => {
  const [priceData, setPriceData] = useState<PriceData>({});
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});
  const [stockSymbols, setStockSymbols] = useState<StockSymbol[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  const getBasePath = () => {
    if (typeof window !== "undefined") {
      return window.location.hostname === "localhost" ? "" : "";
    }
    return "";
  };

  const updateLatestPrices = useCallback((prices: PriceData) => {
    setPriceData(prices);
    setExchangeRates({
      HKD: prices["HKD"]?.price || 1,
      CNY: prices["CNY"]?.price || 1,
    });

    // 更新股票符号列表
    const symbols = Object.keys(prices)
      .filter(key => !["HKD", "CNY"].includes(key))
      .map(symbol => ({ symbol, name: symbol }));
    setStockSymbols(symbols);
  }, []);

  const refreshPrices = useCallback(async (
    isManual = false,
    yearData: { [year: string]: YearData },
    setYearData: (data: { [year: string]: YearData }) => void
  ) => {
    if (isLoading) return;

    setIsLoading(true);
    setLoadingMessage(isManual ? "手动刷新价格中..." : "自动刷新价格中...");

    try {
      const basePath = getBasePath();
      const response = await fetch(`${basePath}/data/prices.json`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const prices: PriceData = await response.json();
      updateLatestPrices(prices);

      // 获取最新年份
      const latestYear = new Date().getFullYear().toString();
      
      // 更新最新年份的股票价格
      setYearData(prev => {
        const newData = { ...prev };
        
        if (newData[latestYear]?.stocks) {
          newData[latestYear] = {
            ...newData[latestYear],
            stocks: newData[latestYear].stocks.map(stock => {
              const priceInfo = prices[stock.symbol || ""];
              if (priceInfo) {
                return {
                  ...stock,
                  price: priceInfo.price,
                };
              }
              return stock;
            }),
          };
        }

        return newData;
      });

      setLastRefreshTime(new Date());
      setLoadingMessage(isManual ? "手动刷新完成" : "自动刷新完成");
      
      setTimeout(() => {
        setLoadingMessage("");
      }, 2000);

    } catch (error) {
      console.error("刷新价格失败:", error);
      setLoadingMessage(
        isManual 
          ? "手动刷新失败，请检查网络连接" 
          : "自动刷新失败，将稍后重试"
      );
      
      setTimeout(() => {
        setLoadingMessage("");
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, updateLatestPrices]);

  const convertToCurrency = useCallback((
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): number => {
    if (fromCurrency === toCurrency) return amount;
    
    // 转换为USD基准
    let usdAmount = amount;
    if (fromCurrency === "HKD") {
      usdAmount = amount * (exchangeRates.HKD || 1);
    } else if (fromCurrency === "CNY") {
      usdAmount = amount * (exchangeRates.CNY || 1);
    }
    
    // 从USD转换为目标货币
    if (toCurrency === "HKD") {
      return usdAmount / (exchangeRates.HKD || 1);
    } else if (toCurrency === "CNY") {
      return usdAmount / (exchangeRates.CNY || 1);
    }
    
    return usdAmount;
  }, [exchangeRates]);

  const formatLargeNumber = useCallback((num: number, targetCurrency: string) => {
    const absNum = Math.abs(num);
    const sign = num < 0 ? "-" : "";
    
    let formattedNum: string;
    if (absNum >= 1000000) {
      formattedNum = (absNum / 1000000).toFixed(1) + "M";
    } else if (absNum >= 1000) {
      formattedNum = (absNum / 1000).toFixed(1) + "K";
    } else {
      formattedNum = absNum.toLocaleString();
    }
    
    return `${sign}${formattedNum} ${targetCurrency}`;
  }, []);

  return {
    priceData,
    setPriceData,
    exchangeRates,
    setExchangeRates,
    stockSymbols,
    setStockSymbols,
    isLoading,
    setIsLoading,
    loadingMessage,
    setLoadingMessage,
    lastRefreshTime,
    setLastRefreshTime,
    updateLatestPrices,
    refreshPrices,
    convertToCurrency,
    formatLargeNumber,
  };
};
