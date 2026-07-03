/**
 * 共用的 PortfolioContext mock helper。
 * 注意：此文件不是测试文件，仅供其他测试 import 使用。
 * jest 配置需要排除此文件（或文件名不含 .test.）
 */
/* istanbul ignore file */

export const LATEST_YEAR = '2026';

export const makeStock = (overrides: Partial<{
  name: string; symbol: string; shares: number; price: number; costPrice: number; id: string;
}> = {}) => ({
  name: 'AAPL',
  symbol: 'AAPL',
  shares: 100,
  price: 200,
  costPrice: 150,
  id: 'test-a1',
  ...overrides,
});

export const makeYearData = (overrides: Record<string, unknown> = {}) => ({
  stocks: [makeStock()],
  cashTransactions: [],
  stockTransactions: [],
  cashBalance: 5000,
  ...overrides,
});

export const buildMockPortfolio = (overrides: Record<string, unknown> = {}) => ({
  trackerState: {
    currency: 'USD',
    hiddenStocks: {},
    alertInfo: null,
    setAlertInfo: jest.fn(),
    isReportDialogOpen: false,
    setIsReportDialogOpen: jest.fn(),
    selectedReportYear: LATEST_YEAR,
    isLoggedIn: false,
    currentUser: null,
    newYear: '',
    setNewYear: jest.fn(),
    cashTransactionType: 'deposit',
    cashTransactionAmount: '',
    setCashTransactionAmount: jest.fn(),
    setCashTransactionType: jest.fn(),
    isCashTransactionLoading: false,
    ...((overrides.trackerState as object) ?? {}),
  },
  portfolioData: {
    yearData: { [LATEST_YEAR]: makeYearData() },
    years: [LATEST_YEAR],
    latestYear: LATEST_YEAR,
    selectedYear: LATEST_YEAR,
    setSelectedYear: jest.fn(),
    formatLargeNumber: (v: number) => v.toFixed(2),
    refreshPrices: jest.fn(),
    ...((overrides.portfolioData as object) ?? {}),
  },
  chartData: {
    totalValues: { [LATEST_YEAR]: 25000 },
    lineChartData: [],
    barChartData: [],
    calculateCumulativeInvested: jest.fn().mockReturnValue(10000),
    calculateInvestmentReturn: jest.fn().mockReturnValue({ portfolioValue: 25000, absoluteReturn: 15000, percentageReturn: 150, totalInvestment: 10000 }),
    getLatestYearGrowthRate: jest.fn().mockReturnValue('20.00'),
    calculateYearlyValues: jest.fn().mockReturnValue({}),
    ...((overrides.chartData as object) ?? {}),
  },
  stockOperations: {
    newStockName: '',
    newStockSymbol: '',
    newShares: '',
    newPrice: '',
    newYearEndPrice: '',
    transactionType: 'buy' as const,
    setNewStockName: jest.fn(),
    setNewStockSymbol: jest.fn(),
    setNewShares: jest.fn(),
    setNewPrice: jest.fn(),
    setNewYearEndPrice: jest.fn(),
    setTransactionType: jest.fn(),
    handleDeleteStock: jest.fn(),
    ...((overrides.stockOperations as object) ?? {}),
  },
  callbacks: {
    onAddStock: jest.fn(),
    handleYearChange: jest.fn(),
    handleLegendClick: jest.fn(),
    handleReportClick: jest.fn(),
    addNewYear: jest.fn(),
    addCashTransaction: jest.fn().mockResolvedValue(true),
    toggleStockVisibility: jest.fn(),
    ...((overrides.callbacks as object) ?? {}),
  },
  tableData: {
    headers: [],
    rows: [],
    totalRow: [],
  },
  userSettings: {
    retirementGoal: 1000000,
    annualReturn: 8,
    targetYears: 20,
    calculationMode: 'rate' as const,
    updateRetirementGoal: jest.fn(),
    updateAnnualReturn: jest.fn(),
    updateTargetYears: jest.fn(),
    updateCalculationMode: jest.fn(),
    loadUserSettings: jest.fn(),
  },
  ...overrides,
});
