/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { StockHoldingCard } from '../holdings/StockHoldingCard';
import { buildMockPortfolio, makeStock, makeYearData, LATEST_YEAR } from '../testHelpers';

// eslint-disable-next-line no-use-before-define
jest.mock('@/components/shell/PortfolioContext', () => ({
  usePortfolio: () => mockCtx,
}));

jest.mock('@/hooks/useResolvedColors', () => ({
  useResolvedColors: () => ({
    brand: '#6366f1',
    brandFg: '#ffffff',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    fg: '#1e293b',
    fgMuted: '#64748b',
    bgElevated: '#ffffff',
    bgSubtle: '#f8fafc',
    borderDefault: '#e2e8f0',
    borderSubtle: '#f1f5f9',
    chartColors: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6'],
  }),
}));

// recharts stub
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  defs: () => null,
  linearGradient: () => null,
  stop: () => null,
}));

let mockCtx: ReturnType<typeof buildMockPortfolio>;

beforeEach(() => {
  mockCtx = buildMockPortfolio();
});

describe('StockHoldingCard', () => {
  it('shares>0 时显示股票名和市值', () => {
    render(<StockHoldingCard stockName="AAPL" onEdit={jest.fn()} />);
    // 股票名可能出现多次（名字 + symbol badge）
    const aaplEls = screen.getAllByText('AAPL');
    expect(aaplEls.length).toBeGreaterThan(0);
    // 市值 = 100 * 200 = 20000.00
    expect(screen.getByText(/20000\.00/)).toBeInTheDocument();
  });

  it('最新年 shares=0（已清仓）时显示"已清仓"标签', () => {
    mockCtx = buildMockPortfolio({
      portfolioData: {
        ...buildMockPortfolio().portfolioData,
        yearData: {
          '2025': makeYearData({
            stocks: [makeStock({ name: 'TSLA', shares: 50, price: 300 })],
          }),
          [LATEST_YEAR]: makeYearData({
            stocks: [makeStock({ name: 'TSLA', shares: 0, price: 300 })],
          }),
        },
        years: ['2026', '2025'],
        latestYear: LATEST_YEAR,
      },
    });
    render(<StockHoldingCard stockName="TSLA" onEdit={jest.fn()} />);
    expect(screen.getByText('已清仓')).toBeInTheDocument();
  });

  it('历史有持仓但最新年为 0 → 不 return null，仍渲染', () => {
    mockCtx = buildMockPortfolio({
      portfolioData: {
        ...buildMockPortfolio().portfolioData,
        yearData: {
          '2025': makeYearData({
            stocks: [makeStock({ name: 'META', shares: 30, price: 400 })],
          }),
          [LATEST_YEAR]: makeYearData({
            stocks: [makeStock({ name: 'META', shares: 0, price: 400 })],
          }),
        },
        years: ['2026', '2025'],
        latestYear: LATEST_YEAR,
      },
      chartData: {
        ...buildMockPortfolio().chartData,
        lineChartData: [
          { year: '2025', META: 12000, total: 12000 },
          { year: '2026', META: 0, total: 0 },
        ],
      },
    });
    const { container } = render(<StockHoldingCard stockName="META" onEdit={jest.fn()} />);
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByText('META')).toBeInTheDocument();
  });

  it('股票从未有真实持仓（shares 全为 0）→ return null', () => {
    mockCtx = buildMockPortfolio({
      portfolioData: {
        ...buildMockPortfolio().portfolioData,
        yearData: {
          [LATEST_YEAR]: makeYearData({
            stocks: [makeStock({ name: 'GHOST', shares: 0, price: 100 })],
          }),
        },
        years: [LATEST_YEAR],
        latestYear: LATEST_YEAR,
      },
      chartData: {
        ...buildMockPortfolio().chartData,
        lineChartData: [{ year: LATEST_YEAR, total: 5000 }],
      },
    });
    const { container } = render(<StockHoldingCard stockName="GHOST" onEdit={jest.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
