import {
  appendStockTxIncremental,
  appendCashTxIncremental,
  appendYearlySummary,
} from '@/lib/portfolio/incremental';
import type {
  CashTransaction,
  IncrementalChanges,
  Stock,
  StockTransaction,
} from '@/types/stock';

const empty = (): IncrementalChanges => ({
  stocks: {},
  cashTransactions: {},
  stockTransactions: {},
  yearlySummaries: {},
});

const buildStock = (overrides: Partial<Stock> = {}): Stock => ({
  name: 'NVDA',
  shares: 50,
  price: 100,
  costPrice: 80,
  id: 'stock-1',
  symbol: 'NVDA',
  ...overrides,
});

const buildStockTx = (
  overrides: Partial<StockTransaction> = {},
): StockTransaction => ({
  stockName: 'NVDA',
  type: 'buy',
  shares: 50,
  price: 100,
  date: '2024-06-01',
  beforeCostPrice: 0,
  afterCostPrice: 100,
  ...overrides,
});

const buildCashTx = (
  overrides: Partial<CashTransaction> = {},
): CashTransaction => ({
  amount: -5000,
  type: 'buy',
  date: '2024-06-01',
  stockName: 'NVDA',
  ...overrides,
});

describe('appendStockTxIncremental（股票交易四表同步追加）', () => {
  it('新年首次买入：四表均新增一条', () => {
    const next = appendStockTxIncremental(empty(), '2024', {
      stock: buildStock(),
      stockTx: buildStockTx(),
      cashTx: buildCashTx(),
      cashBalance: 5000,
    });
    expect(next.stocks['2024']).toHaveLength(1);
    expect(next.stockTransactions['2024']).toHaveLength(1);
    expect(next.cashTransactions['2024']).toHaveLength(1);
    expect(next.yearlySummaries['2024']).toEqual({ cashBalance: 5000 });
  });

  it('已有交易再买入：在末尾追加，前面记录保留', () => {
    const prev = appendStockTxIncremental(empty(), '2024', {
      stock: buildStock(),
      stockTx: buildStockTx(),
      cashTx: buildCashTx(),
      cashBalance: 5000,
    });
    const next = appendStockTxIncremental(prev, '2024', {
      stock: buildStock({ id: 'stock-2', shares: 70 }),
      stockTx: buildStockTx({ shares: 20 }),
      cashTx: buildCashTx({ amount: -2000 }),
      cashBalance: 3000,
    });
    expect(next.stocks['2024']).toHaveLength(2);
    expect(next.stockTransactions['2024']).toHaveLength(2);
    expect(next.cashTransactions['2024']).toHaveLength(2);
    expect(next.yearlySummaries['2024']).toEqual({ cashBalance: 3000 });
  });

  it('不修改入参（不可变）', () => {
    const prev = empty();
    appendStockTxIncremental(prev, '2024', {
      stock: buildStock(),
      stockTx: buildStockTx(),
      cashTx: buildCashTx(),
      cashBalance: 5000,
    });
    expect(prev.stocks).toEqual({});
  });

  it('不同年份独立追加，互不干扰', () => {
    const prev = appendStockTxIncremental(empty(), '2024', {
      stock: buildStock(),
      stockTx: buildStockTx(),
      cashTx: buildCashTx(),
      cashBalance: 5000,
    });
    const next = appendStockTxIncremental(prev, '2025', {
      stock: buildStock(),
      stockTx: buildStockTx({ date: '2025-06-01' }),
      cashTx: buildCashTx({ date: '2025-06-01' }),
      cashBalance: 7000,
    });
    expect(next.stocks['2024']).toHaveLength(1);
    expect(next.stocks['2025']).toHaveLength(1);
    expect(next.yearlySummaries['2025']).toEqual({ cashBalance: 7000 });
  });
});

describe('appendCashTxIncremental（纯现金交易追加）', () => {
  it('追加现金交易并更新 cashBalance', () => {
    const next = appendCashTxIncremental(
      empty(),
      '2024',
      { amount: 1000, type: 'deposit', date: '2024-01-15' },
      1000,
    );
    expect(next.cashTransactions['2024']).toEqual([
      { amount: 1000, type: 'deposit', date: '2024-01-15' },
    ]);
    expect(next.yearlySummaries['2024']).toEqual({ cashBalance: 1000 });
  });

  it('多次追加：同年累计', () => {
    const a = appendCashTxIncremental(
      empty(),
      '2024',
      { amount: 1000, type: 'deposit', date: '2024-01-15' },
      1000,
    );
    const b = appendCashTxIncremental(
      a,
      '2024',
      { amount: -500, type: 'withdraw', date: '2024-02-15' },
      500,
    );
    expect(b.cashTransactions['2024']).toHaveLength(2);
    expect(b.yearlySummaries['2024']).toEqual({ cashBalance: 500 });
  });
});

describe('appendYearlySummary（仅更新 cashBalance）', () => {
  it('新年份：写入摘要', () => {
    const next = appendYearlySummary(empty(), '2025', 1000);
    expect(next.yearlySummaries['2025']).toEqual({ cashBalance: 1000 });
    expect(next.cashTransactions).toEqual({});
  });

  it('已有摘要：覆盖更新', () => {
    const prev = appendYearlySummary(empty(), '2024', 500);
    const next = appendYearlySummary(prev, '2024', 1500);
    expect(next.yearlySummaries['2024']).toEqual({ cashBalance: 1500 });
  });
});
