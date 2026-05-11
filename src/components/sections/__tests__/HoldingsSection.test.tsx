/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HoldingsSection } from '../holdings/HoldingsSection';
import { buildMockPortfolio, makeStock, makeYearData, LATEST_YEAR } from '../testHelpers';

// eslint-disable-next-line no-use-before-define
jest.mock('@/components/shell/PortfolioContext', () => ({
  usePortfolio: () => mockCtx,
}));

jest.mock('@/hooks/useResolvedColors', () => ({
  useResolvedColors: () => ({
    brand: '#6366f1', fg: '#1e293b', fgMuted: '#64748b',
    bgElevated: '#ffffff', borderDefault: '#e2e8f0', borderSubtle: '#f1f5f9',
    chartColors: ['#6366f1'],
  }),
}));

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null, CartesianGrid: () => null,
  XAxis: () => null, YAxis: () => null, Tooltip: () => null,
}));

// HoldingDetailDrawer 用了 Radix Dialog，简单 stub
jest.mock('../holdings/HoldingDetailDrawer', () => ({
  HoldingDetailDrawer: () => null,
}));

let mockCtx: ReturnType<typeof buildMockPortfolio>;

beforeEach(() => {
  mockCtx = buildMockPortfolio({
    portfolioData: {
      ...buildMockPortfolio().portfolioData,
      yearData: {
        [LATEST_YEAR]: makeYearData({
          stocks: [makeStock({ name: 'AAPL', shares: 100 })],
        }),
      },
      years: [LATEST_YEAR],
      latestYear: LATEST_YEAR,
    },
    chartData: {
      ...buildMockPortfolio().chartData,
      lineChartData: [{ year: LATEST_YEAR, AAPL: 20000, total: 25000 }],
    },
  });
});

describe('HoldingsSection', () => {
  it('初始状态不显示添加交易表单', () => {
    render(<HoldingsSection />);
    expect(screen.queryByText('新交易')).not.toBeInTheDocument();
  });

  it('点击「添加交易」按钮后表单展开', () => {
    render(<HoldingsSection />);
    fireEvent.click(screen.getByRole('button', { name: /添加交易/ }));
    expect(screen.getByText('新交易')).toBeInTheDocument();
  });

  it('页面标题包含持仓数', () => {
    render(<HoldingsSection />);
    // description 格式: "1 只持仓中"
    const els = screen.getAllByText(/只持仓中/);
    expect(els.length).toBeGreaterThan(0);
  });

  it('无持仓数据时显示空状态', () => {
    mockCtx = buildMockPortfolio({
      portfolioData: {
        ...buildMockPortfolio().portfolioData,
        yearData: {},
        years: [],
        latestYear: LATEST_YEAR,
      },
      chartData: {
        ...buildMockPortfolio().chartData,
        lineChartData: [],
      },
    });
    render(<HoldingsSection />);
    expect(screen.getByText('暂无持仓记录')).toBeInTheDocument();
  });
});
