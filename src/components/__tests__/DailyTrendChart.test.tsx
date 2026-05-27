import React from 'react';
import { render, screen } from '@testing-library/react';
import DailyTrendChart from '@/components/DailyTrendChart';
import { CalendarData } from '@/types/stock';

// Recharts uses ResizeObserver internally; already mocked in jest.setup.js.
// Mock recharts to avoid SVG rendering issues in jsdom.
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

// Mock useResolvedColors to return predictable values in tests
jest.mock('@/hooks/useResolvedColors', () => ({
  useResolvedColors: () => ({
    brand: '#6366f1',
    fg: '#1e293b',
    fgMuted: '#64748b',
    bgElevated: '#ffffff',
    bgSubtle: '#f8fafc',
    borderDefault: '#e2e8f0',
    borderSubtle: '#f1f5f9',
    chartColors: ['#6366f1'],
  }),
}));

const formatLargeNumber = (value: number, _currency: string) =>
  value.toLocaleString('zh-CN');

const emptyProps = {
  calendarData: [] as CalendarData[],
  isLoading: false,
  currency: 'USD',
  formatLargeNumber,
};

const withData: CalendarData[] = [
  {
    date: '2025-05-01',
    totalGain: 100,
    totalGainPercent: 1,
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

describe('DailyTrendChart', () => {
  test('空数据时显示暂无数据提示', () => {
    render(<DailyTrendChart {...emptyProps} />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  test('isLoading 时显示骨架屏，不渲染折线图', () => {
    render(<DailyTrendChart {...emptyProps} isLoading={true} />);
    // Skeleton is an animated div; chart should NOT be present
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    expect(screen.queryByText('暂无数据')).not.toBeInTheDocument();
  });

  test('有效数据时渲染折线图', () => {
    render(
      <DailyTrendChart
        {...emptyProps}
        calendarData={withData}
      />,
    );
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.queryByText('暂无数据')).not.toBeInTheDocument();
  });

  test('hasData=false 的数据点被过滤，不渲染折线图', () => {
    const noHasData: CalendarData[] = withData.map((d) => ({ ...d, hasData: false }));
    render(<DailyTrendChart {...emptyProps} calendarData={noHasData} />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  test('totalValue=0 的数据点被过滤', () => {
    const zeroValue: CalendarData[] = withData.map((d) => ({ ...d, totalValue: 0 }));
    render(<DailyTrendChart {...emptyProps} calendarData={zeroValue} />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });
});
