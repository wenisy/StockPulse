import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import StockPortfolioTracker from '../StockPortfolioTracker';

// 业务 hook mocks（避免触发 fetch / 复杂状态）
const mockPortfolioData = {
  yearData: {
    '2024': {
      stocks: [
        { name: 'AAPL', shares: 10, price: 200, costPrice: 150, id: 'a1', symbol: 'AAPL' },
      ],
      cashTransactions: [],
      stockTransactions: [],
      cashBalance: 5000,
    },
  },
  setYearData: jest.fn(),
  years: ['2024'],
  setYears: jest.fn(),
  filteredYears: ['2024'],
  setFilteredYears: jest.fn(),
  selectedYear: '2024',
  setSelectedYear: jest.fn(),
  comparisonYear: '2024',
  setComparisonYear: jest.fn(),
  latestYear: '2024',
  isLoading: false,
  setIsLoading: jest.fn(),
  priceData: {},
  setPriceData: jest.fn(),
  exchangeRates: { USD: 1, HKD: 0.128, CNY: 0.14 },
  setExchangeRates: jest.fn(),
  lastRefreshTime: null,
  setLastRefreshTime: jest.fn(),
  incrementalChanges: { stocks: {}, cashTransactions: {}, stockTransactions: {}, yearlySummaries: {} },
  setIncrementalChanges: jest.fn(),
  fetchJsonData: jest.fn(),
  refreshPrices: jest.fn(),
  saveDataToBackend: jest.fn(),
  addNewYear: jest.fn(),
  addCashTransaction: jest.fn(),
  updateStock: jest.fn(),
  handleTokenExpired: jest.fn(),
  getBasePath: () => '',
  formatLargeNumber: (val: number) => val.toFixed(2),
  convertToCurrency: (v: number) => v,
};

jest.mock('@/hooks/usePortfolioData', () => ({
  usePortfolioData: () => mockPortfolioData,
}));

jest.mock('@/hooks/useStockOperations', () => ({
  useStockOperations: () => ({
    newStockName: '',
    setNewStockName: jest.fn(),
    newShares: '',
    setNewShares: jest.fn(),
    newPrice: '',
    setNewPrice: jest.fn(),
    newYearEndPrice: '',
    setNewYearEndPrice: jest.fn(),
    newStockSymbol: '',
    setNewStockSymbol: jest.fn(),
    transactionType: 'buy' as const,
    setTransactionType: jest.fn(),
    editingStockName: null,
    editedRowData: null,
    resetForm: jest.fn(),
    confirmAddNewStock: jest.fn(),
    handleEditRow: jest.fn(),
    handleSaveRow: jest.fn(),
    handleInputChange: jest.fn(),
    handleDeleteStock: jest.fn(),
  }),
}));

jest.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({
    retirementGoal: '',
    annualReturn: '',
    targetYears: '',
    calculationMode: 'rate' as const,
    updateRetirementGoal: jest.fn(),
    updateAnnualReturn: jest.fn(),
    updateTargetYears: jest.fn(),
    updateCalculationMode: jest.fn(),
    updateAllSettings: jest.fn(),
    loadUserSettings: jest.fn(),
  }),
}));

jest.mock('@/hooks/useChartData', () => ({
  useChartData: () => ({
    totalValues: { '2024': 7000 },
    lineChartData: [],
    barChartData: [],
    calculateYearlyValues: () => ({ '2024': { total: 2000 } }),
    calculateCumulativeInvested: () => 5000,
    calculateTotalInvestment: () => 5000,
    calculateInvestmentReturn: () => ({
      totalInvestment: 5000,
      portfolioValue: 7000,
      absoluteReturn: 2000,
      percentageReturn: 40,
    }),
    getLatestYearGrowthRate: () => '5.5',
  }),
}));

jest.mock('@/hooks/useTableData', () => ({
  useTableData: () => ({
    headers: ['visible', '股票名称', '2024', '操作'],
    rows: [],
    totalRow: ['', 'total', null, null],
  }),
}));

// Mock 重子组件，避免它们的依赖问题
jest.mock('../RetirementCalculator', () => () => null);
jest.mock('../ReportDialog', () => () => null);
jest.mock('../UserProfileManager', () => {
  const Mock = React.forwardRef(() => null);
  Mock.displayName = 'UserProfileManager';
  return { __esModule: true, default: Mock };
});
jest.mock('../StockCharts', () => () => null);
jest.mock('../ProfitLossCalendar', () => () => null);
jest.mock('../CompoundGrowthDialog', () => () => null);

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((k: string) => store[k] || null),
    setItem: jest.fn((k: string, v: string) => { store[k] = v; }),
    removeItem: jest.fn((k: string) => { delete store[k]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({ ok: true, json: async () => ({ stocks: [] }) } as Response),
) as jest.Mock;

describe('StockPortfolioTracker - 渲染', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('应用根组件能成功渲染（不崩）', async () => {
    const { container } = render(<StockPortfolioTracker />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });

  it('挂载时尝试读取 localStorage 中的 token/user', async () => {
    render(<StockPortfolioTracker />);
    await waitFor(() => {
      expect(localStorageMock.getItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('user');
    });
  });

  it('已登录用户能正常初始化', async () => {
    localStorageMock.setItem('token', 'test-token');
    localStorageMock.setItem('user', JSON.stringify({ username: 'test', uuid: 'u1' }));

    const { container } = render(<StockPortfolioTracker />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });
});

describe('StockPortfolioTracker - 主要 UI 元素', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('包含至少一个按钮', async () => {
    render(<StockPortfolioTracker />);
    await waitFor(() => {
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('包含输入框（添加年份/添加交易等）', async () => {
    render(<StockPortfolioTracker />);
    await waitFor(() => {
      const inputs = document.querySelectorAll('input');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });
});

describe('StockPortfolioTracker - 异常容错', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('localStorage user JSON 损坏时不崩', async () => {
    localStorageMock.setItem('user', '{not valid json');

    const { container } = render(<StockPortfolioTracker />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });

  it('fetch 失败时不崩', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network error'));
    localStorageMock.setItem('token', 'test-token');

    const { container } = render(<StockPortfolioTracker />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });
});
