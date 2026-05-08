import { v4 as uuidv4 } from 'uuid';
import type {
  CashTransaction,
  Stock,
  StockTransaction,
  YearData,
} from '@/types/stock';

/**
 * 年度数据状态变换（不可变）。
 *
 * 抽自 usePortfolioData / useStockOperations 的 setYearData 内联逻辑，
 * 行为完全锁定。所有函数接收旧 yearData，返回新 yearData，绝不 mutate 入参。
 *
 * 对应 spec：portfolio-domain
 * - 现金交易余额累加（含不存在年度自动初始化）
 * - 卖出股数超过持仓的拒绝（在 hook 层处理弹窗，本层只负责状态变换）
 * - 新建年份的结转
 * - 跨年股票删除
 * - 行编辑合并保存
 */

type YearDataMap = { [year: string]: YearData };

/**
 * 把一笔现金交易应用到某年度，返回新的 YearData。
 *
 * 行为：
 * - 若该年度不存在，自动初始化空的 YearData
 * - cashBalance += transaction.amount（amount 在 deposit 时为正、withdraw 时为负）
 * - cashTransactions 末尾追加该交易
 *
 * @param yearData 原年度数据（不会被修改）
 * @param year 目标年份
 * @param transaction 待添加的现金交易（amount 已经按 type 调好正负）
 */
export function applyCashTransactionToYear(
  yearData: YearDataMap,
  year: string,
  transaction: CashTransaction,
): YearDataMap {
  const updated = { ...yearData };
  const existing = updated[year];
  const target: YearData = existing
    ? {
        ...existing,
        cashTransactions: [...(existing.cashTransactions || []), transaction],
        cashBalance: (existing.cashBalance || 0) + transaction.amount,
      }
    : {
        stocks: [],
        cashTransactions: [transaction],
        stockTransactions: [],
        cashBalance: transaction.amount,
      };
  updated[year] = target;
  return updated;
}

/**
 * 把一笔股票交易应用到某年度，返回新的 YearData。
 *
 * 行为（对齐现有 hook：usePortfolioData.updateStock 与
 * useStockOperations.updateStockInternal 两份重复实现）：
 * - 若该年度不存在，自动初始化
 * - 若 stocks 中存在同名股票：替换；若新 shares ≤ 0 则从数组移除
 * - 若不存在且 shares > 0：新增（生成新 id）
 * - stockTransactions / cashTransactions 末尾各追加对应记录
 *
 * 注意：cashBalance 不在此处调整。买卖时的现金扣除/增加由调用方
 * （hook）单独处理，因为现金不足判定与弹窗逻辑在 hook 层。
 *
 * @param yearData 原年度数据
 * @param year 目标年份
 * @param input 交易输入参数（包含 shares 是"交易后总股数"，
 *              transactionShares 是本次交易的股数）
 */
export function applyStockTransactionToYear(
  yearData: YearDataMap,
  year: string,
  input: {
    stockName: string;
    shares: number;
    price: number;
    costPrice: number;
    transactionShares: number;
    transactionPrice: number;
    transactionType: 'buy' | 'sell';
    symbol?: string;
    beforeCostPrice?: number;
    userUuid?: string;
    /** 用于注入当前日期，便于测试。默认 new Date().toISOString().split('T')[0] */
    today?: string;
  },
): YearDataMap {
  const today = input.today ?? new Date().toISOString().split('T')[0];
  const updated = { ...yearData };
  const existing = updated[year] ?? {
    stocks: [],
    cashTransactions: [],
    stockTransactions: [],
    cashBalance: 0,
  };

  const stocks = [...(existing.stocks ?? [])];
  const stockIndex = stocks.findIndex((s) => s.name === input.stockName);

  const stockData: Stock = {
    name: input.stockName,
    shares: input.shares,
    price: input.price,
    costPrice: input.costPrice,
    id: stockIndex !== -1 ? stocks[stockIndex].id : uuidv4(),
    symbol:
      input.symbol || (stockIndex !== -1 ? stocks[stockIndex].symbol : ''),
    userUuid: input.userUuid,
  };

  let nextStocks = stocks;
  if (stockIndex !== -1) {
    nextStocks = [...stocks];
    nextStocks[stockIndex] = stockData;
    if (input.shares <= 0) {
      nextStocks = nextStocks.filter((_, i) => i !== stockIndex);
    }
  } else if (input.shares > 0) {
    nextStocks = [...stocks, stockData];
  }

  const stockTransaction: StockTransaction = {
    stockName: input.stockName,
    type: input.transactionType,
    shares: input.transactionShares,
    price: input.transactionPrice,
    date: today,
    beforeCostPrice: input.beforeCostPrice ?? 0,
    afterCostPrice: input.costPrice,
    userUuid: input.userUuid,
  };

  const cashTransaction: CashTransaction = {
    amount:
      input.transactionType === 'buy'
        ? -input.transactionShares * input.transactionPrice
        : input.transactionShares * input.transactionPrice,
    type: input.transactionType,
    date: today,
    stockName: input.stockName,
    userUuid: input.userUuid,
  };

  updated[year] = {
    ...existing,
    stocks: nextStocks,
    stockTransactions: [...(existing.stockTransactions ?? []), stockTransaction],
    cashTransactions: [...(existing.cashTransactions ?? []), cashTransaction],
  };

  return updated;
}

/**
 * 新建年份时的结转。
 *
 * 行为：
 * - 找到所有"小于 newYear"中最大的年份作为参考年
 * - 复制参考年的 stocks（深拷贝单个 stock 对象）
 * - cashBalance 继承参考年
 * - 若 cashBalance > 0，自动追加一笔 type=deposit、description='上年结余' 的现金交易
 * - 若新年已存在则不修改
 *
 * @returns 包含新年的 YearDataMap，以及推导出的 carriedCashBalance（hook 层
 *          需要它来更新 incrementalChanges.yearlySummaries）
 */
export function carryOverYearData(
  yearData: YearDataMap,
  years: string[],
  newYear: string,
  options?: { today?: string },
): { yearData: YearDataMap; carriedCashBalance: number; alreadyExists: boolean } {
  const trimmed = newYear.trim();
  if (!trimmed || years.includes(trimmed)) {
    return { yearData, carriedCashBalance: 0, alreadyExists: true };
  }

  const referenceYear = years
    .filter((y) => y < trimmed)
    .sort((a, b) => b.localeCompare(a))[0];

  const referenceData = referenceYear ? yearData[referenceYear] : null;
  const stocksToCarryOver =
    referenceData?.stocks?.map((stock) => ({ ...stock })) || [];
  const cashToCarryOver = referenceData?.cashBalance || 0;

  const newYearItem: YearData = {
    stocks: stocksToCarryOver,
    cashTransactions: [],
    stockTransactions: [],
    cashBalance: cashToCarryOver,
  };

  if (cashToCarryOver > 0) {
    const today = options?.today ?? new Date().toISOString().split('T')[0];
    newYearItem.cashTransactions.push({
      amount: cashToCarryOver,
      type: 'deposit',
      date: today,
      description: '上年结余',
    });
  }

  return {
    yearData: { ...yearData, [trimmed]: newYearItem },
    carriedCashBalance: cashToCarryOver,
    alreadyExists: false,
  };
}

/**
 * 跨年删除股票。
 *
 * 行为：从所有年份的 stocks 数组中移除同名股票；
 * cashTransactions / stockTransactions 不变（保留历史流水）。
 */
export function removeStockFromAllYears(
  yearData: YearDataMap,
  stockName: string,
): YearDataMap {
  const updated: YearDataMap = {};
  Object.keys(yearData).forEach((year) => {
    const item = yearData[year];
    if (item && item.stocks) {
      updated[year] = {
        ...item,
        stocks: item.stocks.filter((stock) => stock.name !== stockName),
      };
    } else {
      updated[year] = item;
    }
  });
  return updated;
}

/** 行编辑保存的输入：每年的字符串字段 */
export interface EditedRowEntry {
  quantity: string;
  unitPrice: string;
  costPrice: string;
  symbol?: string;
}

/**
 * 行编辑合并保存。
 *
 * 行为：
 * - 对每个 year，将 edited.quantity/unitPrice/costPrice 解析为数字
 * - 全部解析成功 → 该年存在则更新 stock，不存在则新增
 * - 任一字段解析失败 → 视为清仓（若该年存在则从 stocks 移除）
 *
 * @returns 新 yearData + 受影响年份与对应快照（供 incrementalChanges 拼装）
 */
export function mergeEditedRowData(
  yearData: YearDataMap,
  stockName: string,
  editedRows: { [year: string]: EditedRowEntry },
  years: string[],
  userUuid?: string,
): {
  yearData: YearDataMap;
  affected: { year: string; stock: Stock; cashBalance: number }[];
} {
  const updated: YearDataMap = { ...yearData };
  const affected: { year: string; stock: Stock; cashBalance: number }[] = [];

  years.forEach((year) => {
    const existing = updated[year] ?? {
      stocks: [],
      cashTransactions: [],
      stockTransactions: [],
      cashBalance: 0,
    };
    const stocks = [...(existing.stocks ?? [])];

    const edited = editedRows[year];
    if (!edited) {
      updated[year] = { ...existing, stocks };
      return;
    }

    const shares = parseInt(edited.quantity, 10);
    const price = parseFloat(edited.unitPrice);
    const costPrice = parseFloat(edited.costPrice);
    const symbol = edited.symbol;

    if (!isNaN(shares) && !isNaN(price) && !isNaN(costPrice)) {
      const idx = stocks.findIndex((s) => s.name === stockName);
      let stockSnapshot: Stock;
      if (idx !== -1) {
        const merged: Stock = {
          ...stocks[idx],
          shares,
          price,
          costPrice,
          symbol,
        };
        stocks[idx] = merged;
        stockSnapshot = merged;
      } else {
        const created: Stock = {
          name: stockName,
          shares,
          price,
          costPrice,
          id: uuidv4(),
          symbol,
          userUuid,
        };
        stocks.push(created);
        stockSnapshot = created;
      }
      updated[year] = { ...existing, stocks };
      affected.push({
        year,
        stock: stockSnapshot,
        cashBalance: updated[year].cashBalance,
      });
    } else {
      updated[year] = {
        ...existing,
        stocks: stocks.filter((s) => s.name !== stockName),
      };
    }
  });

  return { yearData: updated, affected };
}
