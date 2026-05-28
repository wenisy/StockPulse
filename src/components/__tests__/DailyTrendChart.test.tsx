import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DailyTrendChart from '@/components/DailyTrendChart';
import { CalendarData } from '@/types/stock';
import { YearlyMonthSummary } from '@/hooks/useCalendarData';

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
}));

const defaultProps = {
  currency: 'USD',
  formatLargeNumber: (value: number, _: string) => value.toLocaleString('zh-CN'),
};

const withDailyData: CalendarData[] = [
  { date: '2025-05-01', totalGain: 100, totalGainPercent: 0.2, totalValue: 50000, hasData: true, hasTransaction: false, stocks: [] },
  { date: '2025-05-02', totalGain: 200, totalGainPercent: 0.4, totalValue: 51000, hasData: true, hasTransaction: false, stocks: [] },
];

const withMonthlyData: YearlyMonthSummary[] = [
  { month: '01', totalGain: 1000, totalGainPercent: 2.0, tradingDaysCount: 20, profitDays: 12, lossDays: 8, winRate: 60 },
  { month: '02', totalGain: -500, totalGainPercent: -0.98, tradingDaysCount: 18, profitDays: 8, lossDays: 10, winRate: 44 },
  { month: '03', totalGain: 1500, totalGainPercent: 2.96, tradingDaysCount: 21, profitDays: 13, lossDays: 8, winRate: 62 },
];

describe('DailyTrendChart', () => {
  beforeEach(() => {
    mockCalendarData = [];
    mockYearlySummary = null;
    mockIsLoading = false;
    mockError = null;
    mockFetchCalendarData.mockClear();
    mockFetchYearlySummary.mockClear();
  });

  // ── Daily mode ──────────────────────────────────────────────────────────────

  test('空数据时显示暂无数据提示', () => {
    render(<DailyTrendChart {...defaultProps} />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
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

  // ── Monthly mode ────────────────────────────────────────────────────────────

  test('切换到按月模式调用 fetchYearlySummary', () => {
    render(<DailyTrendChart {...defaultProps} />);
    const monthlyBtn = screen.getByText('按月');
    fireEvent.click(monthlyBtn);
    expect(mockFetchYearlySummary).toHaveBeenCalled();
  });

  test('按月模式有数据时渲染折线图', () => {
    mockYearlySummary = withMonthlyData;
    render(<DailyTrendChart {...defaultProps} />);
    fireEvent.click(screen.getByText('按月'));
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  test('按月模式无数据时显示暂无数据', () => {
    mockYearlySummary = [];
    render(<DailyTrendChart {...defaultProps} />);
    fireEvent.click(screen.getByText('按月'));
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  // ── Controls ────────────────────────────────────────────────────────────────

  test('隐藏金额按钮存在', () => {
    render(<DailyTrendChart {...defaultProps} />);
    expect(screen.getByText('隐藏金额')).toBeInTheDocument();
  });

  test('点击隐藏金额后按钮文字变为"已隐藏"', () => {
    render(<DailyTrendChart {...defaultProps} />);
    const btn = screen.getByText('隐藏金额');
    fireEvent.click(btn);
    expect(screen.getByText('已隐藏')).toBeInTheDocument();
    expect(screen.queryByText('隐藏金额')).not.toBeInTheDocument();
  });

  test('再次点击隐藏金额恢复"隐藏金额"文字', () => {
    render(<DailyTrendChart {...defaultProps} />);
    const btn = screen.getByText('隐藏金额');
    fireEvent.click(btn);
    fireEvent.click(screen.getByText('已隐藏'));
    expect(screen.getByText('隐藏金额')).toBeInTheDocument();
  });

  test('数据点 < 5 时不渲染 Brush', () => {
    // withDailyData has 2 points, < 5
    mockCalendarData = withDailyData;
    render(<DailyTrendChart {...defaultProps} />);
    expect(screen.queryByTestId('brush')).not.toBeInTheDocument();
  });

  test('数据点 ≥ 5 时渲染 Brush', () => {
    mockCalendarData = Array.from({ length: 5 }, (_, i) => ({
      date: `2025-05-${String(i + 1).padStart(2, '0')}`,
      totalGain: 100 * i,
      totalGainPercent: 0.2 * i,
      totalValue: 50000 + i * 1000,
      hasData: true,
      hasTransaction: false,
      stocks: [],
    }));
    render(<DailyTrendChart {...defaultProps} />);
    expect(screen.getByTestId('brush')).toBeInTheDocument();
  });

  test('月份导航按钮存在', () => {
    render(<DailyTrendChart {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4); // 按日 按月 ← →
  });
});
