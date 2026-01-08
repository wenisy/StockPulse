import { useMemo } from 'react';
import { StockValueMap, YearData } from '@/types/stock';

export interface UseTableDataProps {
  yearData: { [year: string]: YearData };
  years: string[];
  filteredYears: string[];
  hiddenStocks: { [stockName: string]: boolean };
}

export function useTableData({
  yearData,
  years,
  filteredYears,
  hiddenStocks,
}: UseTableDataProps) {
  const tableData = useMemo(() => {
    const stockSet = new Set<string>();
    Object.values(yearData).forEach((yearDataItem) => {
      if (yearDataItem && yearDataItem.stocks) {
        yearDataItem.stocks.forEach((stock) => stockSet.add(stock.name));
      }
    });

    const stockValues2025: StockValueMap = {};
    Object.values(yearData).forEach((yearDataItem) => {
      if (yearDataItem && yearDataItem.stocks) {
        yearDataItem.stocks.forEach((stock) => {
          if (stock.name in stockValues2025) return;
          const stockIn2025 = yearData["2025"]?.stocks?.find((s) => s.name === stock.name);
          if (stockIn2025) {
            stockValues2025[stock.name] = stockIn2025.shares * stockIn2025.price;
          } else {
            stockValues2025[stock.name] = 0;
          }
        });
      }
    });

    const stockNames = Array.from(stockSet).sort((a, b) => {
      const valueA = stockValues2025[a] || 0;
      const valueB = stockValues2025[b] || 0;
      return valueB - valueA;
    });

    const headers = ["visible", "股票名称", ...filteredYears, "操作"];

    const rows = stockNames.map((stockName) => {
      const row = [];
      row.push({ visibility: !hiddenStocks[stockName] });

      let symbol = "";
      for (let i = years.length - 1; i >= 0; i--) {
        const year = years[i];
        const stockInYear = yearData[year]?.stocks?.find((s) => s.name === stockName);
        if (stockInYear && stockInYear.symbol) {
          symbol = stockInYear.symbol;
          break;
        }
      }
      row.push({ name: stockName, symbol });

      filteredYears.forEach((year) => {
        if (yearData[year] && yearData[year].stocks) {
          const stockInYear = yearData[year].stocks.find((s) => s.name === stockName);
          row.push(
            stockInYear
              ? {
                  shares: stockInYear.shares,
                  price: stockInYear.price,
                  costPrice: stockInYear.costPrice,
                  symbol: stockInYear.symbol,
                }
              : null
          );
        } else {
          row.push(null);
        }
      });

      row.push(null);
      return row;
    });

    const totalRow = ["", "total", ...filteredYears.map(() => null), null];
    return { headers, rows, totalRow };
  }, [yearData, years, filteredYears, hiddenStocks]);

  return tableData;
}
