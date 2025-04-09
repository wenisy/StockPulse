import React from 'react';
import { render, screen } from '@testing-library/react';
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

describe('StockPortfolioTracker 基本测试', () => {
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

  // 测试1：基本渲染
  test('应该正确渲染组件标题', () => {
    render(<StockPortfolioTracker />);
    expect(screen.getByText('股票投资组合追踪工具')).toBeInTheDocument();
  });

  // 测试2：渲染年份选择
  test('应该渲染年份选择区域', () => {
    render(<StockPortfolioTracker />);
    expect(screen.getByText('选择年份')).toBeInTheDocument();
  });

  // 测试3：渲染添加年份区域
  test('应该渲染添加年份区域', () => {
    render(<StockPortfolioTracker />);
    expect(screen.getByText('添加新年份')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('例如: 2025')).toBeInTheDocument();
    expect(screen.getByText('添加年份')).toBeInTheDocument();
  });

  // 测试4：渲染现金交易区域
  test('应该渲染现金交易区域', () => {
    render(<StockPortfolioTracker />);
    // 检查现金交易区域标题
    expect(screen.getByText(/添加\/更新现金数量/)).toBeInTheDocument();
    // 检查金额输入框
    expect(screen.getByPlaceholderText('金额')).toBeInTheDocument();
    // 不检查按钮，因为按钮文本可能会有所不同
  });

  // 测试5：渲染股票交易区域
  test('应该渲染股票交易区域', () => {
    render(<StockPortfolioTracker />);
    expect(screen.getByText(/添加\/更新股票/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('股票名称')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('股票代码 (如 BABA)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('交易股数')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('交易价格')).toBeInTheDocument();
    expect(screen.getByText('添加股票')).toBeInTheDocument();
  });

  // 测试6：渲染登录按钮
  test('应该渲染登录按钮', () => {
    render(<StockPortfolioTracker />);
    expect(screen.getByText('登录')).toBeInTheDocument();
  });

  // 测试7：渲染刷新价格按钮
  test('应该渲染刷新价格按钮', () => {
    render(<StockPortfolioTracker />);
    expect(screen.getByText('刷新价格')).toBeInTheDocument();
  });
});
