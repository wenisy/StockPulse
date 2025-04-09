import {
  Stock,
  YearData,
  CashTransaction,
  StockTransaction,
  StockSymbol,
  PriceData,
  ExchangeRates
} from '@/types/stock';

describe('测试辅助函数', () => {
  test('测试辅助函数存在', () => {
    expect(true).toBe(true);
  });
});

/**
 * 创建测试用的股票数据
 */
export const createTestStock = (
  name: string,
  shares: number,
  price: number,
  costPrice: number,
  id: string = 'test-id',
  symbol?: string
): Stock => ({
  name,
  shares,
  price,
  costPrice,
  id,
  symbol
});

/**
 * 创建测试用的现金交易数据
 */
export const createTestCashTransaction = (
  amount: number,
  type: 'deposit' | 'withdraw' | 'buy' | 'sell',
  date: string = new Date().toISOString().split('T')[0],
  stockName?: string,
  description?: string
): CashTransaction => ({
  amount,
  type,
  date,
  stockName,
  description
});

/**
 * 创建测试用的股票交易数据
 */
export const createTestStockTransaction = (
  stockName: string,
  type: 'buy' | 'sell',
  shares: number,
  price: number,
  date: string = new Date().toISOString().split('T')[0],
  beforeCostPrice: number = 0,
  afterCostPrice: number = 0
): StockTransaction => ({
  stockName,
  type,
  shares,
  price,
  date,
  beforeCostPrice,
  afterCostPrice
});

/**
 * 创建测试用的年度数据
 */
export const createTestYearData = (
  stocks: Stock[] = [],
  cashTransactions: CashTransaction[] = [],
  stockTransactions: StockTransaction[] = [],
  cashBalance: number = 0
): YearData => ({
  stocks,
  cashTransactions,
  stockTransactions,
  cashBalance
});

/**
 * 创建测试用的股票符号数据
 */
export const createTestStockSymbols = (): StockSymbol[] => [
  { symbol: '0700.HK', name: 'Tencent' },
  { symbol: 'GOOGL', name: 'Google' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'PLTR', name: 'Palantir' },
  { symbol: 'RKLB', name: 'Rocket Lab' }
];

/**
 * 创建测试用的价格数据
 */
export const createTestPriceData = (): PriceData => ({
  'HKD': {
    price: 0.12864384,
    name: 'HKD-USD',
    lastUpdated: '2025-04-08'
  },
  'CNY': {
    price: 0.14,
    name: 'CNY-USD',
    lastUpdated: '2025-04-08'
  },
  '0700.HK': {
    price: 56.67,
    originalPrice: 440.4,
    currency: 'HKD',
    name: 'Tencent',
    lastUpdated: '2025-04-08'
  },
  'GOOGL': {
    price: 144.7,
    name: 'Google',
    lastUpdated: '2025-04-08'
  },
  'TSLA': {
    price: 221.86,
    name: 'Tesla',
    lastUpdated: '2025-04-08'
  }
});

/**
 * 创建测试用的汇率数据
 */
export const createTestExchangeRates = (): ExchangeRates => ({
  USD: 1,
  HKD: 0.12864384,
  CNY: 0.14
});

/**
 * 模拟localStorage
 */
export const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => {
      return store[key] || null;
    }),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    getStore: () => store
  };
};

/**
 * 模拟fetch API
 */
export const createMockFetch = () => {
  return jest.fn().mockImplementation((url: string) => {
    if (url.includes('/data/symbols.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          stocks: createTestStockSymbols()
        })
      });
    } else if (url.includes('/data/prices.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(createTestPriceData())
      });
    } else if (url.includes('/api/updatePrices')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            'GOOGL': { price: 150 },
            '0700.HK': { price: 60 }
          }
        })
      });
    } else if (url.includes('/api/login')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          token: 'test-token'
        })
      });
    } else {
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Not found' })
      });
    }
  });
};
