import type {
  CashTransaction,
  IncrementalChanges,
  Stock,
  StockTransaction,
} from '@/types/stock';

/**
 * 增量变更（incrementalChanges）的拼装。
 *
 * 抽自 usePortfolioData.ts:640-658 与 useStockOperations.ts:124-142
 * 的拼装逻辑。incrementalChanges 是前端尚未同步到后端的变更暂存区，
 * 由 saveDataToBackend 一次性 POST 到 /api/updateNotion。
 *
 * 对应 spec：portfolio-domain → 增量变更拼装
 */

/**
 * 把一笔股票相关变更追加到 incrementalChanges。
 *
 * 行为：同时向四张表追加记录：
 * - stocks[year]
 * - stockTransactions[year]
 * - cashTransactions[year]
 * - yearlySummaries[year].cashBalance
 */
export function appendStockTxIncremental(
  prev: IncrementalChanges,
  year: string,
  payload: {
    stock: Stock;
    stockTx: StockTransaction;
    cashTx: CashTransaction;
    cashBalance: number;
  },
): IncrementalChanges {
  return {
    ...prev,
    stocks: {
      ...prev.stocks,
      [year]: [...(prev.stocks[year] || []), payload.stock],
    },
    stockTransactions: {
      ...prev.stockTransactions,
      [year]: [...(prev.stockTransactions[year] || []), payload.stockTx],
    },
    cashTransactions: {
      ...prev.cashTransactions,
      [year]: [...(prev.cashTransactions[year] || []), payload.cashTx],
    },
    yearlySummaries: {
      ...prev.yearlySummaries,
      [year]: { cashBalance: payload.cashBalance },
    },
  };
}

/**
 * 把一笔纯现金交易追加到 incrementalChanges。
 *
 * 行为：向 cashTransactions[year] 追加交易，同时更新
 * yearlySummaries[year].cashBalance。
 *
 * 注意：调用方应先用 isDuplicateCashTx 判定，重复时不应调用本函数。
 */
export function appendCashTxIncremental(
  prev: IncrementalChanges,
  year: string,
  cashTx: CashTransaction,
  newCashBalance: number,
): IncrementalChanges {
  return {
    ...prev,
    cashTransactions: {
      ...prev.cashTransactions,
      [year]: [...(prev.cashTransactions[year] || []), cashTx],
    },
    yearlySummaries: {
      ...prev.yearlySummaries,
      [year]: { cashBalance: newCashBalance },
    },
  };
}

/**
 * 仅更新 incrementalChanges.yearlySummaries[year].cashBalance。
 *
 * 用于"新建年份只携带 cashBalance 一项"或"行编辑只更新汇总"等场景。
 */
export function appendYearlySummary(
  prev: IncrementalChanges,
  year: string,
  cashBalance: number,
): IncrementalChanges {
  return {
    ...prev,
    yearlySummaries: {
      ...prev.yearlySummaries,
      [year]: { cashBalance },
    },
  };
}
