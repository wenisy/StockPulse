import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
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

// 模拟recharts组件，避免ResponsiveContainer的警告
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: '100%', height: '100%' }}>
        {children}
      </div>
    ),
  };
});

describe('StockPortfolioTracker 异步测试', () => {
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
            'HKD': { price: 0.12864384, lastUpdated: '2025-04-08' },
            'CNY': { price: 0.14, lastUpdated: '2025-04-08' },
            '0700.HK': { price: 56.67, currency: 'HKD', lastUpdated: '2025-04-08' },
            'GOOGL': { price: 144.7, lastUpdated: '2025-04-08' }
          })
        });
      } else {
        return Promise.resolve({
          ok: false
        });
      }
    });
  });

  // 测试1：组件初始化和数据加载
  test('应该正确初始化组件并加载数据', async () => {
    await act(async () => {
      render(<StockPortfolioTracker />);
    });
    
    // 验证组件标题
    expect(screen.getByText('股票投资组合追踪工具')).toBeInTheDocument();
    
    // 验证年份选择区域
    expect(screen.getByText('选择年份')).toBeInTheDocument();
    
    // 验证添加年份区域
    expect(screen.getByText('添加新年份')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('例如: 2025')).toBeInTheDocument();
    
    // 验证现金交易区域
    expect(screen.getByText(/添加\/更新现金数量/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('金额')).toBeInTheDocument();
    
    // 验证股票交易区域
    expect(screen.getByText(/添加\/更新股票/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('股票名称')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('股票代码 (如 BABA)')).toBeInTheDocument();
    
    // 验证登录按钮
    expect(screen.getByText('登录')).toBeInTheDocument();
    
    // 验证刷新价格按钮
    expect(screen.getByText('刷新价格')).toBeInTheDocument();
  });

  // 测试2：localStorage数据加载
  test('应该从localStorage加载数据', async () => {
    // 设置localStorage中的初始数据
    const mockYearData = {
      '2023': {
        stocks: [
          { name: 'Test Stock', shares: 100, price: 50, costPrice: 45, id: 'test-id-1' }
        ],
        cashTransactions: [],
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
    
    await act(async () => {
      render(<StockPortfolioTracker />);
    });
    
    // 验证数据是否正确加载
    await waitFor(() => {
      expect(localStorageMock.getItem).toHaveBeenCalledWith('stockPortfolioData');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('stockPortfolioYears');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('stockPortfolioSelectedYear');
    });
  });

  // 测试3：fetch API调用
  test('应该调用fetch API获取股票符号和价格数据', async () => {
    await act(async () => {
      render(<StockPortfolioTracker />);
    });
    
    // 验证fetch API调用
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/data/symbols.json'));
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/data/prices.json'));
    });
  });
});
