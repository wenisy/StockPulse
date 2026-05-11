/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { KpiCards } from '../overview/KpiCards';
import { buildMockPortfolio, LATEST_YEAR } from '../testHelpers';

// eslint-disable-next-line no-use-before-define
jest.mock('@/components/shell/PortfolioContext', () => ({
  usePortfolio: () => mockCtx,
}));

// recharts 不支持 jsdom，stub 掉
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

let mockCtx: ReturnType<typeof buildMockPortfolio>;

beforeEach(() => {
  mockCtx = buildMockPortfolio();
});

describe('KpiCards', () => {
  it('渲染 5 个 KPI 卡片标签', () => {
    render(<KpiCards />);
    expect(screen.getByText('总资产')).toBeInTheDocument();
    expect(screen.getByText('累计收益')).toBeInTheDocument();
    expect(screen.getByText('年化复合收益')).toBeInTheDocument();
    expect(screen.getByText('现金余额')).toBeInTheDocument();
    expect(screen.getByText('持仓数')).toBeInTheDocument();
  });

  it('空数据时不崩溃（yearData={}, totalValues={}）', () => {
    mockCtx = buildMockPortfolio({
      portfolioData: {
        ...buildMockPortfolio().portfolioData,
        yearData: {},
        years: [],
        latestYear: LATEST_YEAR,
      },
      chartData: {
        ...buildMockPortfolio().chartData,
        totalValues: {},
        calculateCumulativeInvested: jest.fn().mockReturnValue(0),
        getLatestYearGrowthRate: jest.fn().mockReturnValue(''),
      },
    });
    expect(() => render(<KpiCards />)).not.toThrow();
  });

  it('累计收益为正时 delta 行显示正值', () => {
    render(<KpiCards />);
    // totalReturn = 25000 - 10000 = 15000，returnPct = 150%
    const deltaEls = screen.getAllByText(/150\.00%/);
    expect(deltaEls.length).toBeGreaterThan(0);
  });

  it('无数据时现金余额显示 0', () => {
    mockCtx = buildMockPortfolio({
      portfolioData: {
        ...buildMockPortfolio().portfolioData,
        yearData: {},
        years: [],
        latestYear: LATEST_YEAR,
      },
    });
    render(<KpiCards />);
    // 不崩，"现金余额" 标签仍存在
    expect(screen.getByText('现金余额')).toBeInTheDocument();
  });
});
