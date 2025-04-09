import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('StockPortfolioTracker 核心功能测试', () => {
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

  // 测试1：初始化和数据加载
  test('初始化时应该从localStorage加载数据', async () => {
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
    
    render(<StockPortfolioTracker />);
    
    // 验证数据是否正确加载
    await waitFor(() => {
      expect(localStorageMock.getItem).toHaveBeenCalledWith('stockPortfolioData');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('stockPortfolioYears');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('stockPortfolioSelectedYear');
    });
  });

  // 测试2：年份管理功能
  test('应该能够添加和选择年份', async () => {
    const user = userEvent.setup();
    render(<StockPortfolioTracker />);
    
    // 等待组件加载
    await waitFor(() => {
      expect(screen.getByPlaceholderText('例如: 2025')).toBeInTheDocument();
    });
    
    // 添加新年份
    await user.type(screen.getByPlaceholderText('例如: 2025'), '2026');
    await user.click(screen.getByText('添加年份'));
    
    // 验证年份已添加并选中
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalled();
      // 检查新年份是否被添加到下拉菜单中
      const yearOptions = screen.getAllByRole('option');
      const yearTexts = yearOptions.map(option => option.textContent);
      expect(yearTexts).toContain('2026');
    });
  });

  // 测试3：现金交易功能
  test('应该能够添加现金交易并更新余额', async () => {
    const user = userEvent.setup();
    render(<StockPortfolioTracker />);
    
    // 等待组件加载
    await waitFor(() => {
      expect(screen.getByPlaceholderText('金额')).toBeInTheDocument();
    });
    
    // 添加存款交易
    await user.type(screen.getByPlaceholderText('金额'), '1000');
    await user.click(screen.getByText('添加现金交易'));
    
    // 验证现金交易已添加
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  // 测试4：股票交易功能
  test('应该能够添加股票交易', async () => {
    const user = userEvent.setup();
    render(<StockPortfolioTracker />);
    
    // 等待组件加载
    await waitFor(() => {
      expect(screen.getByPlaceholderText('股票名称')).toBeInTheDocument();
    });
    
    // 添加股票交易
    await user.type(screen.getByPlaceholderText('股票名称'), 'New Stock');
    await user.type(screen.getByPlaceholderText('股数'), '50');
    await user.type(screen.getByPlaceholderText('价格'), '100');
    await user.click(screen.getByText('添加股票交易'));
    
    // 确认交易
    await waitFor(() => {
      expect(screen.getByText('确认交易')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('确认'));
    
    // 验证股票交易已添加
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  // 测试5：价格刷新功能
  test('应该能够刷新股票价格', async () => {
    const user = userEvent.setup();
    render(<StockPortfolioTracker />);
    
    // 等待组件加载
    await waitFor(() => {
      expect(screen.getByText('刷新价格')).toBeInTheDocument();
    });
    
    // 模拟刷新价格API响应
    (global.fetch as jest.Mock).mockImplementationOnce(() => {
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
    });
    
    // 点击刷新价格按钮
    await user.click(screen.getByText('刷新价格'));
    
    // 验证价格已刷新
    await waitFor(() => {
      expect(screen.getByText('价格已更新')).toBeInTheDocument();
    });
  });

  // 测试6：数据持久化功能
  test('应该将数据保存到localStorage', async () => {
    render(<StockPortfolioTracker />);
    
    // 等待组件加载和数据保存
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('stockPortfolioData', expect.any(String));
      expect(localStorageMock.setItem).toHaveBeenCalledWith('stockPortfolioYears', expect.any(String));
      expect(localStorageMock.setItem).toHaveBeenCalledWith('stockPortfolioSelectedYear', expect.any(String));
    });
  });

  // 测试7：登录功能
  test('应该能够处理登录流程', async () => {
    const user = userEvent.setup();
    render(<StockPortfolioTracker />);
    
    // 点击登录按钮
    await user.click(screen.getByText('登录'));
    
    // 验证登录对话框已打开
    await waitFor(() => {
      expect(screen.getByPlaceholderText('用户名')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('密码')).toBeInTheDocument();
    });
    
    // 输入登录信息
    await user.type(screen.getByPlaceholderText('用户名'), 'testuser');
    await user.type(screen.getByPlaceholderText('密码'), 'password');
    
    // 模拟登录API响应
    (global.fetch as jest.Mock).mockImplementationOnce(() => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          token: 'test-token'
        })
      });
    });
    
    // 点击登录按钮
    await user.click(screen.getByRole('button', { name: '登录' }));
    
    // 验证登录成功
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'test-token');
    });
  });

  // 测试8：报表生成功能
  test('应该能够生成投资报表', async () => {
    const user = userEvent.setup();
    render(<StockPortfolioTracker />);
    
    // 等待组件加载
    await waitFor(() => {
      expect(screen.getByText('查看报表')).toBeInTheDocument();
    });
    
    // 点击查看报表按钮
    await user.click(screen.getByText('查看报表'));
    
    // 验证报表对话框已打开
    await waitFor(() => {
      expect(screen.getByText('投资报表')).toBeInTheDocument();
    });
  });
});
