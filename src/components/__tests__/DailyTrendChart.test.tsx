import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import DailyTrendChart, { getISOWeek, aggregateByWeek } from '@/components/DailyTrendChart';
import { CalendarData } from '@/types/stock';
import { YearlyMonthSummary } from '@/hooks/useCalendarData';

// localStorage mock — shared across all tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    LineChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="line-chart">{children}</div>
    ),
    Line: () => <div data-testid="line" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cart-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Brush: () => <div data-testid="brush" />,
  };
});

jest.mock('@/hooks/useResolvedColors', () => ({
  useResolvedColors: () => ({
    brand: '#6366f1', fg: '#1e293b', fgMuted: '#64748b',
    bgElevated: '#ffffff', bgSubtle: '#f8fafc',
    borderDefault: '#e2e8f0', borderSubtle: '#f1f5f9',
    success: '#22c55e', danger: '#ef4444', chartColors: ['#6366f1'],
  }),
}));

const mockFetchCalendarData = jest.fn().mockResolvedValue(undefined);
const mockFetchYearlySummary = jest.fn().mockResolvedValue(undefined);

let mockCalendarData: CalendarData[] = [];
let mockYearlySummary: YearlyMonthSummary[] | null = null;
let mockIsLoading = false;
let mockError: string | null = null;

jest.mock('@/hooks/useCalendarData', () => ({
  useCalendarData: () => ({
    calendarData: mockCalendarData,
    yearlySummary: mockYearlySummary,
    isLoading: mockIsLoading,
    error: mockError,
    fetchCalendarData: mockFetchCalendarData,
    fetchYearlySummary: mockFetchYearlySummary,
    monthlySummary: null,
    generateDailySnapshot: jest.fn(),
  }),
  YearlyMonthSummary: {},
  getBackendDomain: () => '//stock-backend-tau.vercel.app',
}));

// Mock global fetch for 3M mode
global.fetch = jest.fn();

const defaultProps = {
  currency: 'USD',
  formatLargeNumber: (value: number, _: string) => value.toLocaleString('zh-CN'),
};

const makeDailyData = (count: number, startValue = 50000): CalendarData[] =>
  Array.from({ length: count }, (_, i) => ({
    date: `2025-05-${String(i + 1).padStart(2, '0')}`,
    totalGain: 100 * i,
    totalGainPercent: 0.2 * i,
    totalValue: startValue + i * 1000,
    hasData: true,
    hasTransaction: false,
    stocks: [],
  }));

const withDailyData = makeDailyData(2);
const withFiveDailyPoints = makeDailyData(5);

const withMonthlyData: YearlyMonthSummary[] = [
  { month: '01', totalGain: 1000, totalGainPercent: 2.0, tradingDaysCount: 20, profitDays: 12, lossDays: 8, winRate: 60 },
  { month: '02', totalGain: -500, totalGainPercent: -0.98, tradingDaysCount: 18, profitDays: 8, lossDays: 10, winRate: 44 },
];

describe('DailyTrendChart — 组件渲染', () => {
  beforeEach(() => {
    mockCalendarData = [];
    mockYearlySummary = null;
    mockIsLoading = false;
    mockError = null;
    mockFetchCalendarData.mockClear();
    mockFetchYearlySummary.mockClear();
    localStorageMock.clear();
    (global.fetch as jest.Mock).mockReset();
  });

  test('空数据时显示暂无数据提示', () => {
    render(<DailyTrendChart {...defaultProps} />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  test('isLoading 时显示骨架屏', () => {
    mockIsLoading = true;
    render(<DailyTrendChart {...defaultProps} />);
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    expect(screen.queryByText('暂无数据')).not.toBeInTheDocument();
  });

  test('有效日数据时渲染折线图', () => {
    mockCalendarData = withDailyData;
    render(<DailyTrendChart {...defaultProps} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  test('hasData=false 的数据点被过滤', () => {
    mockCalendarData = withDailyData.map((d) => ({ ...d, hasData: false }));
    render(<DailyTrendChart {...defaultProps} />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  test('totalValue=0 的数据点被过滤', () => {
    mockCalendarData = withDailyData.map((d) => ({ ...d, totalValue: 0 }));
    render(<DailyTrendChart {...defaultProps} />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  test('error 状态显示错误提示', () => {
    mockError = '网络错误';
    render(<DailyTrendChart {...defaultProps} />);
    expect(screen.getByText('数据加载失败，请重试')).toBeInTheDocument();
  });

  test('点击隐藏金额后按钮文字变为"已隐藏"', () => {
    render(<DailyTrendChart {...defaultProps} />);
    fireEvent.click(screen.getByText('隐藏金额'));
    expect(screen.getByText('已隐藏')).toBeInTheDocument();
  });

  test('再次点击隐藏金额恢复"隐藏金额"文字', () => {
    render(<DailyTrendChart {...defaultProps} />);
    fireEvent.click(screen.getByText('隐藏金额'));
    fireEvent.click(screen.getByText('已隐藏'));
    expect(screen.getByText('隐藏金额')).toBeInTheDocument();
  });

  test('数据点 < 5 时不渲染 Brush', () => {
    mockCalendarData = withDailyData; // 2 points
    render(<DailyTrendChart {...defaultProps} />);
    expect(screen.queryByTestId('brush')).not.toBeInTheDocument();
  });

  test('数据点 ≥ 5 时渲染 Brush', () => {
    mockCalendarData = withFiveDailyPoints;
    render(<DailyTrendChart {...defaultProps} />);
    expect(screen.getByTestId('brush')).toBeInTheDocument();
  });

  test('渲染范围选择器 [1月][3月][1年]', () => {
    render(<DailyTrendChart {...defaultProps} />);
    expect(screen.getByText('1月')).toBeInTheDocument();
    expect(screen.getByText('3月')).toBeInTheDocument();
    expect(screen.getByText('1年')).toBeInTheDocument();
  });
});

describe('DailyTrendChart — 范围切换', () => {
  beforeEach(() => {
    mockCalendarData = [];
    mockYearlySummary = null;
    mockIsLoading = false;
    mockError = null;
    mockFetchCalendarData.mockClear();
    mockFetchYearlySummary.mockClear();
    localStorageMock.clear();
    (global.fetch as jest.Mock).mockReset();
  });

  test('3M 范围触发 3 次 raw fetch（不重复调用 hook）', async () => {
    // Make localStorage.getItem return a token for this test
    localStorageMock.getItem.mockImplementation((key: string) =>
      key === 'token' ? 'test-token' : null
    );
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<DailyTrendChart {...defaultProps} />);

    // Use act(async) to flush state updates AND async effects (fetchThreeMonths)
    await act(async () => {
      fireEvent.click(screen.getByText('3月'));
      // Let the async fetchThreeMonths complete
      await new Promise((r) => setTimeout(r, 200));
    });

    expect(global.fetch).toHaveBeenCalledTimes(3);

    // Cleanup: reset getItem to default behavior
    localStorageMock.getItem.mockImplementation((key: string) => localStorageMock['store']?.[key] ?? null);
  });

  test('切换到 1年范围调用 fetchYearlySummary', () => {
    render(<DailyTrendChart {...defaultProps} />);
    fireEvent.click(screen.getByText('1年'));
    expect(mockFetchYearlySummary).toHaveBeenCalled();
  });

  test('1年范围有数据时渲染折线图', () => {
    mockYearlySummary = withMonthlyData;
    render(<DailyTrendChart {...defaultProps} />);
    fireEvent.click(screen.getByText('1年'));
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  test('1年范围无数据时显示暂无数据', () => {
    mockYearlySummary = [];
    render(<DailyTrendChart {...defaultProps} />);
    fireEvent.click(screen.getByText('1年'));
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  test('1年范围不渲染 Brush', () => {
    mockYearlySummary = withMonthlyData;
    render(<DailyTrendChart {...defaultProps} />);
    fireEvent.click(screen.getByText('1年'));
    expect(screen.queryByTestId('brush')).not.toBeInTheDocument();
  });

  test('月份导航按钮存在', () => {
    render(<DailyTrendChart {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(5); // 1月 3月 1年 ← →
  });
});

// ── aggregateByWeek unit tests ────────────────────────────────────────────────

describe('aggregateByWeek', () => {
  const makePoint = (date: string, totalValue: number, totalGain: number): CalendarData => ({
    date,
    totalValue,
    totalGain,
    totalGainPercent: 0,
    hasData: true,
    hasTransaction: false,
    stocks: [],
  });

  test('空数据返回空数组', () => {
    expect(aggregateByWeek([])).toEqual([]);
  });

  test('过滤 hasData=false 的点', () => {
    const data: CalendarData[] = [{ ...makePoint('2025-05-01', 50000, 100), hasData: false }];
    expect(aggregateByWeek(data)).toEqual([]);
  });

  test('同一周多天时取最后一天的 totalValue，累加 totalGain', () => {
    // 2025-05-05 (Mon) .. 2025-05-09 (Fri) = ISO week 19
    const data = [
      makePoint('2025-05-05', 50000, 100),
      makePoint('2025-05-07', 51000, 200),
      makePoint('2025-05-09', 52000, 300),
    ];
    const result = aggregateByWeek(data);
    expect(result).toHaveLength(1);
    expect(result[0].totalValue).toBe(52000); // last day
    expect(result[0].totalGain).toBe(600);    // cumulative
  });

  test('跨周时生成多个数据点', () => {
    // Week 19: 2025-05-05..09, Week 20: 2025-05-12..16
    const data = [
      makePoint('2025-05-09', 52000, 300),
      makePoint('2025-05-16', 53000, 400),
    ];
    const result = aggregateByWeek(data);
    expect(result).toHaveLength(2);
  });

  test('正确计算周涨跌幅', () => {
    // weekEndValue=52000, totalGain=2000 → weekStartValue=50000 → gainPercent=4%
    const data = [makePoint('2025-05-09', 52000, 2000)];
    const result = aggregateByWeek(data);
    expect(result[0].totalGainPercent).toBeCloseTo(4, 1);
  });
});

// ── getISOWeek cross-year tests ────────────────────────────────────────────────

describe('getISOWeek', () => {
  test('2024-12-30 应该是 ISO 2025 年第 1 周', () => {
    const { year, week } = getISOWeek(new Date('2024-12-30'));
    expect(year).toBe(2025);
    expect(week).toBe(1);
  });

  test('2024-12-29 应该是 ISO 2024 年第 52 周', () => {
    const { year, week } = getISOWeek(new Date('2024-12-29'));
    expect(year).toBe(2024);
    expect(week).toBe(52);
  });

  test('2025-01-01 应该是 ISO 2025 年第 1 周', () => {
    const { year, week } = getISOWeek(new Date('2025-01-01'));
    expect(year).toBe(2025);
    expect(week).toBe(1);
  });

  test('2025-05-09 应该是 ISO 2025 年第 19 周', () => {
    const { year, week } = getISOWeek(new Date('2025-05-09'));
    expect(year).toBe(2025);
    expect(week).toBe(19);
  });
});
