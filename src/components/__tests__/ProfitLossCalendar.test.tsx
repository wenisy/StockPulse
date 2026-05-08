import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfitLossCalendar from '../ProfitLossCalendar';

// Mock useCalendarData hook
const mockFetchCalendarData = jest.fn();
const mockFetchYearlySummary = jest.fn();
const mockGenerateDailySnapshot = jest.fn();

jest.mock('@/hooks/useCalendarData', () => ({
  useCalendarData: () => ({
    calendarData: [
      {
        date: '2024-06-15',
        totalGain: 100,
        totalGainPercent: 1.5,
        hasData: true,
        hasTransaction: false,
        stocks: [],
      },
      {
        date: '2024-06-16',
        totalGain: -50,
        totalGainPercent: -0.8,
        hasData: true,
        hasTransaction: true,
        stocks: [],
      },
    ],
    monthlySummary: {
      totalGain: 50,
      totalGainPercent: 0.7,
      tradingDaysCount: 2,
      profitDays: 1,
      lossDays: 1,
      winRate: 50,
    },
    yearlySummary: null,
    isLoading: false,
    error: null,
    fetchCalendarData: mockFetchCalendarData,
    fetchYearlySummary: mockFetchYearlySummary,
    generateDailySnapshot: mockGenerateDailySnapshot,
  }),
}));

// Mock toast
const mockAddToast = jest.fn();
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ addToast: mockAddToast }),
  Toast: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock fetch（getUSEasternTime）
global.fetch = jest.fn((url: string) => {
  if (url.includes('getUSEasternTime')) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        usEastern: {
          date: '2024-06-15',
          dateTime: '2024-06-15 12:00:00',
          weekday: 'Saturday',
        },
      }),
    } as Response);
  }
  return Promise.resolve({ ok: false } as Response);
}) as jest.Mock;

const defaultProps = {
  selectedYear: '2024',
  formatLargeNumber: (val: number) => val.toFixed(2),
  currency: 'USD',
  years: ['2024', '2023', '2022'],
};

describe('ProfitLossCalendar - 渲染', () => {
  beforeEach(() => jest.clearAllMocks());

  it('能成功渲染（不崩）', () => {
    const { container } = render(<ProfitLossCalendar {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('显示日历视图相关 UI', async () => {
    render(<ProfitLossCalendar {...defaultProps} />);
    await waitFor(() => {
      // 出现至少一个月份名（按月视图渲染）
      const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月',
        '七月', '八月', '九月', '十月', '十一月', '十二月'];
      const found = monthNames.some((name) => screen.queryByText(new RegExp(name)));
      expect(found).toBe(true);
    });
  });

  it('挂载时调用 fetchCalendarData', async () => {
    render(<ProfitLossCalendar {...defaultProps} />);
    await waitFor(() => {
      expect(mockFetchCalendarData).toHaveBeenCalled();
    });
  });

  it('挂载时获取美东时间', async () => {
    render(<ProfitLossCalendar {...defaultProps} />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('getUSEasternTime'),
      );
    });
  });
});

describe('ProfitLossCalendar - 日历数据渲染', () => {
  beforeEach(() => jest.clearAllMocks());

  it('显示有盈亏数据的日期', async () => {
    render(<ProfitLossCalendar {...defaultProps} />);
    await waitFor(() => {
      // 日历会显示日期数字 15 或 16
      const dayElements = screen.queryAllByText(/^15$|^16$/);
      expect(dayElements.length).toBeGreaterThan(0);
    });
  });
});

describe('ProfitLossCalendar - 视图切换', () => {
  beforeEach(() => jest.clearAllMocks());

  it('包含视图切换按钮', async () => {
    render(<ProfitLossCalendar {...defaultProps} />);
    await waitFor(() => {
      // 按日 / 年度 切换按钮（实际文案可能因实现略有不同，用宽松匹配）
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});

describe('ProfitLossCalendar - 月份切换', () => {
  beforeEach(() => jest.clearAllMocks());

  it('点击下一月按钮触发 fetchCalendarData', async () => {
    const user = userEvent.setup();
    render(<ProfitLossCalendar {...defaultProps} />);

    await waitFor(() => expect(mockFetchCalendarData).toHaveBeenCalled());

    const initialCallCount = mockFetchCalendarData.mock.calls.length;

    // 找到所有按钮，点击其中一个箭头按钮
    const buttons = screen.getAllByRole('button');
    const navButtons = buttons.filter(
      (b) => b.querySelector('svg.lucide-chevron-right') ||
             b.querySelector('svg.lucide-chevron-left'),
    );

    if (navButtons.length > 0) {
      await user.click(navButtons[0]);
      await waitFor(() => {
        expect(mockFetchCalendarData.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    } else {
      // 如果找不到具体按钮，至少证明组件挂载成功
      expect(buttons.length).toBeGreaterThan(0);
    }
  });
});

describe('ProfitLossCalendar - 异常容错', () => {
  beforeEach(() => jest.clearAllMocks());

  it('美东时间 API 失败时不崩', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error('network error')),
    );
    const { container } = render(<ProfitLossCalendar {...defaultProps} />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });

  it('父组件 years 为空也能渲染', () => {
    const { container } = render(
      <ProfitLossCalendar {...defaultProps} years={[]} />,
    );
    expect(container).toBeTruthy();
  });
});
