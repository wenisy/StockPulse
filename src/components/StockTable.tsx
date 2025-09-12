"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { YearFilter } from '@/components/ui/year-filter';
import { cn } from '@/lib/utils';
import { Edit, Eye, EyeOff, Save, Trash2 } from 'lucide-react';
import { TableCell, YearData } from '@/types/stock';

interface StockTableProps {
  years: string[];
  filteredYears: string[];
  table: {
    headers: string[];
    rows: any[][];
    totalRow: any[];
  };
  yearData: { [year: string]: YearData };
  hiddenStocks: { [stockName: string]: boolean };
  editingStockName: string | null;
  editedRowData: {
    [year: string]: { quantity: string; unitPrice: string; costPrice: string; symbol?: string };
  } | null;
  selectedYear: string;
  latestYear: string;
  lastRefreshTime: Date | null;
  currency: string;
  formatLargeNumber: (value: number, currency: string) => string;
  toggleStockVisibility: (stockName: string) => void;
  handleEditRow: (stockName: string) => void;
  handleSaveRow: (stockName: string) => void;
  handleInputChange: (year: string, field: 'quantity' | 'unitPrice' | 'costPrice' | 'symbol', value: string) => void;
  handleDeleteStock: (stockName: string) => void;
  handleYearFilterSelectionChange: (selected: string[]) => void;
}

/**
 * 持仓明细表组件
 * 显示股票持仓明细，支持编辑、删除和可见性切换
 */
const StockTable: React.FC<StockTableProps> = ({
  years,
  filteredYears,
  table,
  yearData,
  hiddenStocks,
  editingStockName,
  editedRowData,
  selectedYear,
  latestYear,
  lastRefreshTime,
  currency,
  formatLargeNumber,
  toggleStockVisibility,
  handleEditRow,
  handleSaveRow,
  handleInputChange,
  handleDeleteStock,
  handleYearFilterSelectionChange
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">持仓明细表</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">年份筛选：</span>
          <div className="w-64">
            <YearFilter
              options={[
                { label: '全部年份', value: 'all' },
                ...years.map(year => ({ label: year, value: year }))
              ]}
              selected={filteredYears.length === years.length ? ['all'] : filteredYears}
              onChange={handleYearFilterSelectionChange}
              placeholder="选择年份"
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto relative touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table className="min-w-full border-collapse border border-gray-300">
          <colgroup>
            <col className="hidden sm:table-column" style={{ width: '50px' }} />
            <col className="w-[80px] sm:w-[200px]" />
            {filteredYears.map((year) => (
              <col key={year} />
            ))}
            <col style={{ width: '100px' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="hidden sm:table-cell sticky left-0 z-20 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-100">
                {table.headers[0]}
              </th>
              <th className="sticky left-0 sm:left-[50px] z-20 px-2 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-100">
                <span className="sm:hidden">代码</span>
                <span className="hidden sm:inline">{table.headers[1]}</span>
              </th>
              {table.headers.slice(2, -1).map((header, index) => (
                <th key={index}
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-50">
                  {header}
                </th>
              ))}
              <th className="sticky right-0 z-20 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-100">
                {table.headers[table.headers.length - 1]}
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => {
              const stockName = (row[1] as { name: string }).name;
              const isHidden = hiddenStocks[stockName];

              return (
                <tr key={rowIndex} className={cn(
                  rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                  isHidden && 'opacity-50'
                )}>
                  <td className="hidden sm:table-cell sticky left-0 z-10 px-6 py-4 whitespace-nowrap text-center bg-inherit">
                    <Button
                      size="icon"
                      onClick={() => toggleStockVisibility(stockName)}
                      className="text-gray-500 hover:text-gray-700"
                      data-testid={`visibility-${stockName}`}
                      aria-label="可见性"
                    >
                      {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </td>
                  <td className="sticky left-0 sm:left-[50px] z-10 px-2 sm:px-6 py-4 bg-inherit max-w-[80px] sm:max-w-[200px]">
                    {editingStockName === stockName ? (
                      <div className="space-y-2">
                        <div className="hidden sm:block"><label className="text-sm">股票名称</label>
                          <Input type="text" value={stockName} disabled className="w-full text-xs sm:text-sm" />
                        </div>
                        <div><label className="text-sm">股票代码</label>
                          <Input type="text"
                            value={editedRowData?.[selectedYear]?.symbol || (row[1] as {
                              symbol?: string
                            }).symbol || ''}
                            onChange={(e) => handleInputChange(selectedYear, 'symbol', e.target.value)}
                            className="w-full text-xs sm:text-sm" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="hidden sm:block font-medium text-xs sm:text-sm truncate" title={(row[1] as { name: string }).name}>
                          {(row[1] as { name: string }).name}
                        </div>
                        {(row[1] as { symbol?: string }).symbol && (
                          <div className="text-xs sm:text-sm text-gray-900 sm:text-gray-500 truncate font-medium sm:font-normal" title={(row[1] as { symbol?: string }).symbol}>
                            {(row[1] as { symbol?: string }).symbol}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  {row.slice(2, -1).map((cell, cellIndex) => {
                    const year = filteredYears[cellIndex];
                    const isEditing = editingStockName === stockName;

                    if (isEditing) {
                      return (
                        <td key={cellIndex} className="px-6 py-4 whitespace-nowrap space-y-1 bg-inherit">
                          <div><label className="text-sm">数量</label><Input type="number" value={editedRowData?.[year]?.quantity || ''} onChange={(e) => handleInputChange(year, 'quantity', e.target.value)} className="w-24" data-testid={`quantity-input-${year}`} /></div>
                          <div><label className="text-sm">价格</label><Input type="number" value={editedRowData?.[year]?.unitPrice || ''} onChange={(e) => handleInputChange(year, 'unitPrice', e.target.value)} className="w-24" /></div>
                          <div><label className="text-sm">成本</label><Input type="number" value={editedRowData?.[year]?.costPrice || ''} onChange={(e) => handleInputChange(year, 'costPrice', e.target.value)} className="w-24" /></div>
                        </td>
                      );
                    } else if (cell) {
                      const stockData = (cell as unknown) as TableCell;
                      const { shares, price, costPrice } = stockData;

                      const isLatestPrice = year === latestYear && lastRefreshTime
                        ? (new Date().getTime() - lastRefreshTime.getTime()) / 1000 < 120
                        : false;

                      return (
                        <td key={cellIndex} className="px-6 py-4 whitespace-nowrap space-y-1 bg-inherit">
                          <div className="font-medium">
                            当前价值: {shares !== undefined && price !== undefined ?
                              `${formatLargeNumber(shares * price, currency)} (${shares} * ${formatLargeNumber(price, currency)})`
                              : 'N/A'}
                            {isLatestPrice && <span className="ml-2 text-xs text-green-500">实时</span>}
                          </div>
                          <div className="text-sm text-gray-500">
                            成本: {shares !== undefined && costPrice !== undefined ?
                              `${formatLargeNumber(shares * costPrice, currency)} (${shares} * ${formatLargeNumber(costPrice, currency)})`
                              : 'N/A'}
                          </div>
                        </td>
                      );
                    } else {
                      return <td key={cellIndex} className="px-6 py-4 whitespace-nowrap bg-inherit"> - </td>;
                    }
                  })}
                  <td className="sticky right-0 z-10 px-6 py-4 whitespace-nowrap space-x-2 bg-inherit">
                    {editingStockName === stockName ? (
                      <Button
                        size="icon"
                        onClick={() => handleSaveRow(stockName)}
                        className="text-green-500 hover:text-green-700"
                        data-testid={`save-${stockName}`}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        onClick={() => handleEditRow(stockName)}
                        className="text-blue-500 hover:text-blue-700"
                        data-testid={`edit-${stockName}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      onClick={() => handleDeleteStock(stockName)}
                      className="text-red-500 hover:text-red-700"
                      data-testid={`delete-${stockName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="sticky left-0 z-10 px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider bg-gray-100">
                {table.totalRow[0]}
              </td>
              <td className="sticky left-[50px] z-10 px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider bg-gray-100">
                {table.totalRow[1]}
              </td>
              {filteredYears.map((year) => (
                <td key={year}
                  className="px-6 py-3 text-center text-sm font-semibold uppercase tracking-wider bg-gray-100">
                  {yearData[year] && yearData[year].stocks
                    ? formatLargeNumber(
                      yearData[year].stocks.reduce(
                        (acc, stock) => hiddenStocks[stock.name] ? acc : acc + stock.shares * stock.price,
                        0
                      ) + (yearData[year].cashBalance || 0),
                      currency
                    )
                    : '-'}
                </td>
              ))}
              <td className="sticky right-0 z-10 px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider bg-gray-100">
                {table.totalRow[table.totalRow.length - 1]}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default StockTable;
