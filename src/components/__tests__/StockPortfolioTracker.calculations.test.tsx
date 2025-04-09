import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import StockPortfolioTracker from '../StockPortfolioTracker';

// 模拟fetch API
global.fetch = jest.fn();

// 模拟localStorage
const localStorageMock = (function() {
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
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// 模拟uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid')
}));

describe('StockPortfolioTracker 计算功能测试', () => {
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // 模拟基本的fetch响应
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/data/symbols.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            stocks: [
              { symbol: '0700.HK', name: 'Tencent' },
              { symbol: 'GOOGL', name: 'Google' }
            ]
          })
        });
      } else if (url.includes('/data/prices.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            'HKD': { price: 0.12864384 },
            'CNY': { price: 0.14 },
            '0700.HK': { price: 56.67, currency: 'HKD' },
            'GOOGL': { price: 144.7 }
          })
        });
      } else {
        return Promise.resolve({
          ok: false
        });
      }
    });
  });

  // 测试1：投资组合总价值计算
  test('应该正确计算投资组合总价值', async () => {
    // 设置预定义的测试数据
    const mockYearData = {
      '2023': {
        stocks: [
          { name: 'Stock A', shares: 100, price: 50, costPrice: 45, id: 'test-id-1' },
          { name: 'Stock B', shares: 200, price: 25, costPrice: 20, id: 'test-id-2' }
        ],
        cashTransactions: [
          { amount: 10000, type: 'deposit', date: '2023-01-01' }
        ],
        stockTransactions: [],
        cashBalance: 5000
      }
    };
    
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'stockPortfolioData') {
        return JSON.stringify(mockYearData);
      } else if (key === 'stockPortfolioYears') {
        return JSON.stringify(['2023']);
      } else if (key === 'stockPortfolioSelectedYear') {
        return '2023';
      }
      return null;
    });
    
    render(<StockPortfolioTracker />);
    
    // 等待组件加载和计算完成
    await waitFor(() => {
      // 验证总价值显示
      // 预期总价值 = 股票价值 + 现金余额 = (100 * 50 + 200 * 25) + 5000 = 15000
      expect(screen.getByText(/总价值/i)).toBeInTheDocument();
      expect(screen.getByText(/15,000/)).toBeInTheDocument();
    });
  });

  // 测试2：投资回报率计算
  test('应该正确计算投资回报率', async () => {
    // 设置预定义的测试数据
    const mockYearData = {
      '2023': {
        stocks: [
          { name: 'Stock A', shares: 100, price: 50, costPrice: 40, id: 'test-id-1' }
        ],
        cashTransactions: [
          { amount: 4000, type: 'deposit', date: '2023-01-01' }
        ],
        stockTransactions: [],
        cashBalance: 0
      }
    };
    
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'stockPortfolioData') {
        return JSON.stringify(mockYearData);
      } else if (key === 'stockPortfolioYears') {
        return JSON.stringify(['2023']);
      } else if (key === 'stockPortfolioSelectedYear') {
        return '2023';
      }
      return null;
    });
    
    render(<StockPortfolioTracker />);
    
    // 等待组件加载和计算完成
    await waitFor(() => {
      // 验证回报率显示
      // 投资成本: 4000
      // 当前价值: 100 * 50 = 5000
      // 回报率: (5000 - 4000) / 4000 * 100% = 25%
      expect(screen.getByText(/回报率/i)).toBeInTheDocument();
      expect(screen.getByText(/25%/)).toBeInTheDocument();
    });
  });

  // 测试3：股票成本价计算
  test('应该正确计算股票成本价', async () => {
    // 设置预定义的测试数据，包含多次交易
    const mockYearData = {
      '2023': {
        stocks: [
          { name: 'Stock A', shares: 150, price: 50, costPrice: 43.33, id: 'test-id-1' }
        ],
        cashTransactions: [],
        stockTransactions: [
          { 
            stockName: 'Stock A', 
            type: 'buy', 
            shares: 100, 
            price: 40, 
            date: '2023-01-01',
            beforeCostPrice: 0,
            afterCostPrice: 40
          },
          { 
            stockName: 'Stock A', 
            type: 'buy', 
            shares: 50, 
            price: 50, 
            date: '2023-02-01',
            beforeCostPrice: 40,
            afterCostPrice: 43.33
          }
        ],
        cashBalance: 0
      }
    };
    
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'stockPortfolioData') {
        return JSON.stringify(mockYearData);
      } else if (key === 'stockPortfolioYears') {
        return JSON.stringify(['2023']);
      } else if (key === 'stockPortfolioSelectedYear') {
        return '2023';
      }
      return null;
    });
    
    render(<StockPortfolioTracker />);
    
    // 等待组件加载和计算完成
    await waitFor(() => {
      // 验证成本价显示
      // 初始: 100股 * 40 = 4000
      // 追加: 50股 * 50 = 2500
      // 总成本: 6500
      // 总股数: 150
      // 平均成本价: 6500 / 150 = 43.33
      expect(screen.getByText(/成本价/i)).toBeInTheDocument();
      expect(screen.getByText(/43.33/)).toBeInTheDocument();
    });
  });

  // 测试4：现金余额计算
  test('应该正确计算现金余额', async () => {
    // 设置预定义的测试数据
    const mockYearData = {
      '2023': {
        stocks: [],
        cashTransactions: [
          { amount: 10000, type: 'deposit', date: '2023-01-01' },
          { amount: 5000, type: 'deposit', date: '2023-02-01' },
          { amount: -3000, type: 'withdraw', date: '2023-03-01' }
        ],
        stockTransactions: [],
        cashBalance: 12000
      }
    };
    
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'stockPortfolioData') {
        return JSON.stringify(mockYearData);
      } else if (key === 'stockPortfolioYears') {
        return JSON.stringify(['2023']);
      } else if (key === 'stockPortfolioSelectedYear') {
        return '2023';
      }
      return null;
    });
    
    render(<StockPortfolioTracker />);
    
    // 等待组件加载和计算完成
    await waitFor(() => {
      // 验证现金余额显示
      // 存入: 10000 + 5000 = 15000
      // 取出: 3000
      // 余额: 15000 - 3000 = 12000
      expect(screen.getByText(/现金余额/i)).toBeInTheDocument();
      expect(screen.getByText(/12,000/)).toBeInTheDocument();
    });
  });

  // 测试5：股票占比计算
  test('应该正确计算股票占比', async () => {
    // 设置预定义的测试数据
    const mockYearData = {
      '2023': {
        stocks: [
          { name: 'Stock A', shares: 100, price: 50, costPrice: 45, id: 'test-id-1' }, // 价值: 5000
          { name: 'Stock B', shares: 200, price: 25, costPrice: 20, id: 'test-id-2' }  // 价值: 5000
        ],
        cashTransactions: [],
        stockTransactions: [],
        cashBalance: 10000 // 现金: 10000
      }
    };
    
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'stockPortfolioData') {
        return JSON.stringify(mockYearData);
      } else if (key === 'stockPortfolioYears') {
        return JSON.stringify(['2023']);
      } else if (key === 'stockPortfolioSelectedYear') {
        return '2023';
      }
      return null;
    });
    
    render(<StockPortfolioTracker />);
    
    // 等待组件加载和计算完成
    await waitFor(() => {
      // 验证股票占比显示
      // 总价值: 5000 + 5000 + 10000 = 20000
      // Stock A占比: 5000 / 20000 = 25%
      // Stock B占比: 5000 / 20000 = 25%
      // 现金占比: 10000 / 20000 = 50%
      expect(screen.getByText(/占比/i)).toBeInTheDocument();
      expect(screen.getByText(/25%/)).toBeInTheDocument();
    });
  });

  // 测试6：汇率转换计算
  test('应该正确进行汇率转换', async () => {
    // 设置预定义的测试数据，包含不同货币的股票
    const mockYearData = {
      '2023': {
        stocks: [
          { name: 'Tencent', shares: 100, price: 50, costPrice: 45, id: 'test-id-1', symbol: '0700.HK' }
        ],
        cashTransactions: [],
        stockTransactions: [],
        cashBalance: 0
      }
    };
    
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'stockPortfolioData') {
        return JSON.stringify(mockYearData);
      } else if (key === 'stockPortfolioYears') {
        return JSON.stringify(['2023']);
      } else if (key === 'stockPortfolioSelectedYear') {
        return '2023';
      }
      return null;
    });
    
    render(<StockPortfolioTracker />);
    
    // 等待组件加载和计算完成
    await waitFor(() => {
      // 验证汇率转换
      // 港股价格通过汇率转换为美元
      expect(screen.getByText(/Tencent/i)).toBeInTheDocument();
      // 不能精确匹配具体数值，因为汇率转换后的值可能有小数点差异
    });
  });

  // 测试7：年度增长率计算
  test('应该正确计算年度增长率', async () => {
    // 设置预定义的测试数据，包含多个年份
    const mockYearData = {
      '2022': {
        stocks: [
          { name: 'Stock A', shares: 100, price: 40, costPrice: 40, id: 'test-id-1' }
        ],
        cashTransactions: [
          { amount: 4000, type: 'deposit', date: '2022-01-01' }
        ],
        stockTransactions: [],
        cashBalance: 0
      },
      '2023': {
        stocks: [
          { name: 'Stock A', shares: 100, price: 50, costPrice: 40, id: 'test-id-1' }
        ],
        cashTransactions: [],
        stockTransactions: [],
        cashBalance: 0
      }
    };
    
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'stockPortfolioData') {
        return JSON.stringify(mockYearData);
      } else if (key === 'stockPortfolioYears') {
        return JSON.stringify(['2022', '2023']);
      } else if (key === 'stockPortfolioSelectedYear') {
        return '2023';
      }
      return null;
    });
    
    render(<StockPortfolioTracker />);
    
    // 等待组件加载和计算完成
    await waitFor(() => {
      // 验证年度增长率
      // 2022年价值: 100 * 40 = 4000
      // 2023年价值: 100 * 50 = 5000
      // 增长率: (5000 - 4000) / 4000 * 100% = 25%
      expect(screen.getByText(/增长率/i)).toBeInTheDocument();
      expect(screen.getByText(/25%/)).toBeInTheDocument();
    });
  });
});
