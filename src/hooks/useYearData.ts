import { useState, useCallback } from 'react';
import {
  CashTransaction,
  ExchangeRates,
  IncrementalChanges,
  User,
  YearData,
} from '@/types/stock';
import { stockInitialData } from '@/components/data';
import {
  convertToCurrency as convertToCurrencyPure,
  formatLargeNumber as formatLargeNumberPure,
} from '@/lib/portfolio/currency';
import {
  applyCashTransactionToYear,
  applyStockTransactionToYear,
  carryOverYearData,
} from '@/lib/portfolio/year-data';
import { isDuplicateCashTx } from '@/lib/portfolio/duplicate-tx';
import {
  appendCashTxIncremental,
  appendStockTxIncremental,
  appendYearlySummary,
} from '@/lib/portfolio/incremental';
import { sortYearsDesc, computeLatestYear } from '@/lib/portfolio/years';

export interface UseYearDataProps {
  currentUser: User | null;
}

export interface UseYearDataReturn {
  yearData: { [year: string]: YearData };
  setYearData: React.Dispatch<React.SetStateAction<{ [year: string]: YearData }>>;
  years: string[];
  setYears: React.Dispatch<React.SetStateAction<string[]>>;
  filteredYears: string[];
  setFilteredYears: React.Dispatch<React.SetStateAction<string[]>>;
  selectedYear: string;
  setSelectedYear: React.Dispatch<React.SetStateAction<string>>;
  comparisonYear: string;
  setComparisonYear: React.Dispatch<React.SetStateAction<string>>;
  latestYear: string;
  exchangeRates: ExchangeRates;
  setExchangeRates: React.Dispatch<React.SetStateAction<ExchangeRates>>;
  incrementalChanges: IncrementalChanges;
  setIncrementalChanges: React.Dispatch<React.SetStateAction<IncrementalChanges>>;
  addNewYear: (newYearValue: string) => void;
  addCashTransaction: (amount: number, type: 'deposit' | 'withdraw', year: string) => void;
  updateStock: (
    year: string,
    stockName: string,
    shares: number,
    price: number,
    costPrice: number,
    transactionShares: number,
    transactionPrice: number,
    transactionType: 'buy' | 'sell',
    symbol?: string,
    beforeCostPrice?: number
  ) => void;
  convertToCurrency: (amount: number, targetCurrency: string) => number;
  formatLargeNumber: (num: number, targetCurrency: string) => string;
}

/**
 * 管理本地投资组合数据的状态与操作。
 * 不涉及任何网络 IO（fetch / localStorage），纯粹的状态层。
 */
export function useYearData({ currentUser }: UseYearDataProps): UseYearDataReturn {
  const initialData: { [year: string]: YearData } = stockInitialData;
  const initialYears = sortYearsDesc(Object.keys(initialData));

  const [yearData, setYearData] = useState<{ [year: string]: YearData }>(initialData);
  const [years, setYears] = useState<string[]>(initialYears);
  const [filteredYears, setFilteredYears] = useState<string[]>(initialYears);
  // years 是降序排列，[0] 是最新年，默认选最新年
  const [selectedYear, setSelectedYear] = useState(initialYears[0]);
  const [comparisonYear, setComparisonYear] = useState<string>(initialYears[0]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    USD: 1,
    HKD: 0.12864384,
    CNY: 0.14,
  });
  const [incrementalChanges, setIncrementalChanges] = useState<IncrementalChanges>({
    stocks: {},
    cashTransactions: {},
    stockTransactions: {},
    yearlySummaries: {},
  });

  const latestYear = computeLatestYear(years);

  const convertToCurrency = useCallback(
    (amount: number, targetCurrency: string): number =>
      convertToCurrencyPure(amount, targetCurrency, exchangeRates),
    [exchangeRates],
  );

  const formatLargeNumber = useCallback(
    (num: number, targetCurrency: string) =>
      formatLargeNumberPure(num, targetCurrency, exchangeRates),
    [exchangeRates],
  );

  const addNewYear = useCallback(
    (newYearValue: string) => {
      const result = carryOverYearData(yearData, years, newYearValue);
      if (result.alreadyExists) return;

      const trimmedYear = newYearValue.trim();
      setYearData(result.yearData);
      const newYears = sortYearsDesc([...years, trimmedYear]);
      setYears(newYears);
      setFilteredYears(newYears);
      setSelectedYear(trimmedYear);

      setIncrementalChanges((prev) =>
        appendYearlySummary(prev, trimmedYear, result.carriedCashBalance),
      );
    },
    [years, yearData],
  );

  const addCashTransaction = useCallback(
    (amount: number, type: 'deposit' | 'withdraw', year: string) => {
      const cashTransaction: CashTransaction = {
        amount: type === 'deposit' ? amount : -amount,
        type,
        date: new Date().toISOString().split('T')[0],
        userUuid: currentUser?.uuid,
      };

      setYearData((prevYearData) => {
        const nextYearData = applyCashTransactionToYear(prevYearData, year, cashTransaction);
        const newCashBalance = nextYearData[year]?.cashBalance ?? cashTransaction.amount;

        setIncrementalChanges((prev) => {
          const existingTransactions = prev.cashTransactions[year] || [];
          if (isDuplicateCashTx(existingTransactions, cashTransaction)) {
            return prev;
          }
          return appendCashTxIncremental(prev, year, cashTransaction, newCashBalance);
        });

        return nextYearData;
      });
    },
    [currentUser],
  );

  const updateStock = useCallback(
    (
      year: string,
      stockName: string,
      shares: number,
      price: number,
      costPrice: number,
      transactionShares: number,
      transactionPrice: number,
      transactionType: 'buy' | 'sell',
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
          transactionType,
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
    [currentUser],
  );

  return {
    yearData,
    setYearData,
    years,
    setYears,
    filteredYears,
    setFilteredYears,
    selectedYear,
    setSelectedYear,
    comparisonYear,
    setComparisonYear,
    latestYear,
    exchangeRates,
    setExchangeRates,
    incrementalChanges,
    setIncrementalChanges,
    addNewYear,
    addCashTransaction,
    updateStock,
    convertToCurrency,
    formatLargeNumber,
  };
}
