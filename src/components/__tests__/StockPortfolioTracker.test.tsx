import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StockPortfolioTracker from '../StockPortfolioTracker';
import { stockInitialData } from '../data';

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

describe('StockPortfolioTracker 组件', () => {
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    localStorageMock.clear();

    // 模拟fetch返回成功响应
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

  test('应该正确渲染组件标题', async () => {
    render(<StockPortfolioTracker />);
    expect(screen.getByText('股票投资组合追踪工具')).toBeInTheDocument();
  });

  test('应该显示初始年份数据', async () => {
    render(<StockPortfolioTracker />);

    // 等待数据加载
    await waitFor(() => {
      // 检查是否显示了初始数据中的年份
      const years = Object.keys(stockInitialData);
      const latestYear = years[years.length - 1];
      expect(screen.getByText(latestYear)).toBeInTheDocument();
    });
  });

  test('应该能够添加新年份', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<StockPortfolioTracker />);
    });

    // 输入新年份
    const newYearInput = screen.getByPlaceholderText('例如: 2025');
    await user.type(newYearInput, '2026');

    // 点击添加年份按钮
    const addYearButton = screen.getByText('添加年份');
    await user.click(addYearButton);

    // 验证新年份已添加
    await waitFor(() => {
      // 选择器中应该有新年份
      const selectValue = screen.getByRole('combobox').querySelector('[data-slot="select-value"]');
      expect(selectValue).toHaveTextContent('2026');
    });
  });

  test('应该能够添加现金交易', async () => {
    const user = userEvent.setup();

    // 设置localStorage中的初始数据
    const mockYearData = {
      '2025': {
        stocks: [],
        cashTransactions: [],
        stockTransactions: [],
        cashBalance: 5000
      }
    };

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'stockPortfolioData') {
        return JSON.stringify(mockYearData);
      } else if (key === 'stockPortfolioYears') {
        return JSON.stringify(['2025']);
      } else if (key === 'stockPortfolioSelectedYear') {
        return '2025';
      }
      return null;
    });

    await act(async () => {
      render(<StockPortfolioTracker />);
    });

    // 点击现金按钮
    const cashButton = screen.getByText('现金');
    await user.click(cashButton);

    // 输入现金交易金额
    const amountInput = screen.getByPlaceholderText('金额');
    await user.type(amountInput, '1000');

    // 选择交易类型
    const typeSelect = screen.getByRole('combobox', { name: /交易类型/i });
    await user.click(typeSelect);
    await user.click(screen.getByText('存入'));

    // 点击添加按钮
    const addButton = screen.getByText('添加');
    await user.click(addButton);

    // 验证交易已添加
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  test('应该能够添加股票交易', async () => {
    const user = userEvent.setup();

    // 设置localStorage中的初始数据
    const mockYearData = {
      '2025': {
        stocks: [],
        cashTransactions: [],
        stockTransactions: [],
        cashBalance: 5000
      }
    };

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'stockPortfolioData') {
        return JSON.stringify(mockYearData);
      } else if (key === 'stockPortfolioYears') {
        return JSON.stringify(['2025']);
      } else if (key === 'stockPortfolioSelectedYear') {
        return '2025';
      }
      return null;
    });

    await act(async () => {
      render(<StockPortfolioTracker />);
    });

    // 点击股票按钮
    const stockButton = screen.getByText('股票');
    await user.click(stockButton);

    // 输入股票名称
    const stockNameInput = screen.getByPlaceholderText('股票名称');
    await user.type(stockNameInput, 'Test Stock');

    // 输入股数
    const sharesInput = screen.getByPlaceholderText('股数');
    await user.type(sharesInput, '10');

    // 输入价格
    const priceInput = screen.getByPlaceholderText('价格');
    await user.type(priceInput, '100');

    // 选择交易类型
    const typeSelect = screen.getByRole('combobox', { name: /交易类型/i });
    await user.click(typeSelect);
    await user.click(screen.getByText('买入'));

    // 点击添加按钮
    const addButton = screen.getByText('添加');
    await user.click(addButton);

    // 模拟确认对话框
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  test('应该能够刷新股票价格', async () => {
    const user = userEvent.setup();

    // 设置localStorage中的初始数据
    const mockYearData = {
      '2025': {
        stocks: [
          { name: 'GOOGL', shares: 100, price: 120, costPrice: 100, id: 'test-id-1' },
          { name: '0700.HK', shares: 50, price: 50, costPrice: 40, id: 'test-id-2' }
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
        return JSON.stringify(['2025']);
      } else if (key === 'stockPortfolioSelectedYear') {
        return '2025';
      }
      return null;
    });

    await act(async () => {
      render(<StockPortfolioTracker />);
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

    // 点击刷新按钮
    const refreshButton = screen.getByText('刷新');
    await user.click(refreshButton);

    // 验证价格已刷新
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  test('应该能够切换股票可见性', async () => {
    const user = userEvent.setup();

    // 设置localStorage中的初始数据，包含一些股票
    const mockYearData = {
      '2025': {
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
        return JSON.stringify(['2025']);
      } else if (key === 'stockPortfolioSelectedYear') {
        return '2025';
      }
      return null;
    });

    await act(async () => {
      render(<StockPortfolioTracker />);
    });

    // 等待组件加载并渲染股票表格
    await waitFor(() => {
      expect(screen.getByText('Test Stock')).toBeInTheDocument();
    });

    // 找到并点击可见性按钮
    const visibilityButton = screen.getByTestId('visibility-Test Stock');
    await user.click(visibilityButton);

    // 验证可见性已切换
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  test('应该能够编辑股票数据', async () => {
    const user = userEvent.setup();

    // 设置localStorage中的初始数据，包含一些股票
    const mockYearData = {
      '2025': {
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
        return JSON.stringify(['2025']);
      } else if (key === 'stockPortfolioSelectedYear') {
        return '2025';
      }
      return null;
    });

    await act(async () => {
      render(<StockPortfolioTracker />);
    });

    // 等待组件加载并渲染股票表格
    await waitFor(() => {
      expect(screen.getByText('Test Stock')).toBeInTheDocument();
    });

    // 找到并点击编辑图标按钮
    const editIcon = screen.getByTestId('edit-Test Stock');
    await user.click(editIcon);

    // 修改数量
    await waitFor(() => {
      expect(screen.getByTestId('quantity-input-2025')).toBeInTheDocument();
    });

    const quantityInput = screen.getByTestId('quantity-input-2025');
    await user.clear(quantityInput);
    await user.type(quantityInput, '200');

    // 点击保存按钮
    const saveButton = screen.getByTestId('save-Test Stock');
    await user.click(saveButton);

    // 验证数据已保存
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  test('应该能够删除股票', async () => {
    const user = userEvent.setup();

    // 设置localStorage中的初始数据，包含一些股票
    const mockYearData = {
      '2025': {
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
        return JSON.stringify(['2025']);
      } else if (key === 'stockPortfolioSelectedYear') {
        return '2025';
      }
      return null;
    });

    await act(async () => {
      render(<StockPortfolioTracker />);
    });

    // 等待组件加载并渲染股票表格
    await waitFor(() => {
      expect(screen.getByText('Test Stock')).toBeInTheDocument();
    });

    // 找到并点击删除图标按钮
    const deleteIcon = screen.getByTestId('delete-Test Stock');
    await user.click(deleteIcon);

    // 确认删除
    await waitFor(() => {
      expect(screen.getByText('确认删除')).toBeInTheDocument();
    });

    // 点击确认按钮
    const confirmButton = screen.getByText('确认');
    await user.click(confirmButton);

    // 验证股票已删除
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  test('应该能够生成投资报表', async () => {
    const user = userEvent.setup();

    // 设置localStorage中的初始数据，包含一些股票
    const mockYearData = {
      '2025': {
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
        return JSON.stringify(['2025']);
      } else if (key === 'stockPortfolioSelectedYear') {
        return '2025';
      }
      return null;
    });

    await act(async () => {
      render(<StockPortfolioTracker />);
    });

    // 等待组件加载并渲染股票表格
    await waitFor(() => {
      expect(screen.getByText('Test Stock')).toBeInTheDocument();
    });

    // 找到并点击查看报表按钮
    const reportButton = screen.getByTestId('report-button-2025');
    await user.click(reportButton);

    // 验证报表对话框已打开
    await waitFor(() => {
      expect(screen.getByText('投资报表')).toBeInTheDocument();
    });
  });

  test('应该能够登录', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<StockPortfolioTracker />);
    });

    // 点击登录按钮
    const loginButton = screen.getByText('登录');
    await user.click(loginButton);

    // 验证登录对话框已打开
    await waitFor(() => {
      expect(screen.getByText('请输入用户名和密码')).toBeInTheDocument();
    });

    // 输入用户名和密码
    const usernameInput = screen.getByPlaceholderText('用户名');
    const passwordInput = screen.getByPlaceholderText('密码');
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password');

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
    const submitButton = screen.getByRole('button', { name: '登录' });
    await user.click(submitButton);

    // 验证登录成功
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'test-token');
    });
  });
});
