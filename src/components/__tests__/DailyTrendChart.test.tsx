import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DailyTrendChart from '@/components/DailyTrendChart';
import { CalendarData } from '@/types/stock';

// Mock recharts to avoid SVG rendering issues in jsdom
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
  };
});

jest.mock('@/hooks/useResolvedColors', () => ({
  useResolvedColors: () => ({
    brand: '#6366f1',
    fg: '#1e293b',
    fgMuted: '#64748b',
    bgElevated: '#ffffff',
    bgSubtle: '#f8fafc',
    borderDefault: '#e2e8f0',
    borderSubtle: '#f1f5f9',
    success: '#22c55e',
    danger: '#ef4444',
    chartColors: ['#6366f1'],
  }),
}));

// Mock useCalendarData so DailyTrendChart can be tested without network calls
const mockFetchCalendarData = jest.fn().mockResolvedValue(undefined);

const withData: CalendarData[] = [
  {
    date: '2025-05-01',
    totalGain: 100,
    totalGainPercent: 0.2,
    totalValue: 50000,
    hasData: true,
    hasTransaction: false,
    stocks: [],
  },
  {
    date: '2025-05-02',
    totalGain: 200,
    totalGainPercent: 0.4,
    totalValue: 51000,
    hasData: true,
    hasTransaction: false,
    stocks: [],
  },
];

const setupMock = (calendarData: CalendarData[], isLoading = false) => {
  jest.mock('@/hooks/useCalendarData', () => ({
    useCalendarData: () => ({
      calendarData,
      isLoading,
      error: null,
      fetchCalendarData: mockFetchCalendarData,
      monthlySummary: null,
      yearlySummary: null,
      fetchYearlySummary: jest.fn(),
      generateDailySnapshot: jest.fn(),
    }),
  }));
};

// Since jest.mock is hoisted, use a single mock with configurable return
let mockCalendarData: CalendarData[] = [];
let mockIsLoading = false;

jest.mock('@/hooks/useCalendarData', () => ({
  useCalendarData: () => ({
    calendarData: mockCalendarData,
    isLoading: mockIsLoading,
    error: null,
    fetchCalendarData: mockFetchCalendarData,
    monthlySummary: null,
    yearlySummary: null,
    fetchYearlySummary: jest.fn(),
    generateDailySnapshot: jest.fn(),
  }),
}));

const defaultProps = {
  currency: 'USD',
  formatLargeNumber: (value: number, _currency: string) => value.toLocaleString('zh-CN'),
};

describe('DailyTrendChart', () => {
  beforeEach(() => {
    mockCalendarData = [];
    mockIsLoading = false;
    mockFetchCalendarData.mockClear();
  });

  test('空数据时显示暂无数据提示', () => {
    mockCalendarData = [];
    render(<DailyTrendChart {...defaultProps} />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  test('isLoading 时显示骨架屏，不渲染折线图', () => {
    mockIsLoading = true;
    render(<DailyTrendChart {...defaultProps} />);
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    expect(screen.queryByText('暂无数据')).not.toBeInTheDocument();
  });

  test('有效数据时渲染折线图', () => {
    mockCalendarData = withData;
    render(<DailyTrendChart {...defaultProps} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.queryByText('暂无数据')).not.toBeInTheDocument();
  });

  test('hasData=false 的数据点被过滤，不渲染折线图', () => {
    mockCalendarData = withData.map((d) => ({ ...d, hasData: false }));
    render(<DailyTrendChart {...defaultProps} />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  test('totalValue=0 的数据点被过滤', () => {
    mockCalendarData = withData.map((d) => ({ ...d, totalValue: 0 }));
    render(<DailyTrendChart {...defaultProps} />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  test('渲染月份标签和导航按钮', () => {
    mockCalendarData = withData;
    render(<DailyTrendChart {...defaultProps} />);
    // Navigation buttons should be present
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  test('点击上一月后 fetchCalendarData 被调用', () => {
    mockCalendarData = withData;
    render(<DailyTrendChart {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // First button is prev month (ChevronLeft)
    fireEvent.click(buttons[0]);
    expect(mockFetchCalendarData).toHaveBeenCalled();
  });
});
