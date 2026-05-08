import { useState, useEffect, useCallback } from 'react';

const BACKEND_DOMAIN = 'https://stock-backend-tau.vercel.app';

interface UsEasternTime {
  date: string;
  dateTime: string;
  weekday: string;
}

/**
 * 把当前客户端时间换算为美东日期字符串（YYYY-MM-DD）。
 * 抽自 ProfitLossCalendar 内联的 getUSEasternDate。
 */
export function getUSEasternDate(): string {
  const now = new Date();
  const usEastern = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' }),
  );
  return usEastern.toISOString().split('T')[0];
}

export interface UseCalendarViewProps {
  selectedYear: string;
  parentYears?: string[];
}

export interface UseCalendarViewReturn {
  usEasternTime: UsEasternTime | null;
  currentMonth: number;
  setCurrentMonth: React.Dispatch<React.SetStateAction<number>>;
  currentYear: number;
  setCurrentYear: React.Dispatch<React.SetStateAction<number>>;
  viewMode: 'monthly' | 'yearly';
  setViewMode: React.Dispatch<React.SetStateAction<'monthly' | 'yearly'>>;
  generateDate: string;
  setGenerateDate: React.Dispatch<React.SetStateAction<string>>;
  availableYears: string[];
}

/**
 * 管理日历视图层状态：
 * - 美东时间获取与同步（初始化一次）
 * - 当前年/月、视图模式、生成日期
 * - 可用年份列表（优先从父组件 props，否则 fetch 后端）
 *
 * 抽自 ProfitLossCalendar.tsx，行为不变。
 */
export function useCalendarView({
  selectedYear,
  parentYears,
}: UseCalendarViewProps): UseCalendarViewReturn {
  const [usEasternTime, setUsEasternTime] = useState<UsEasternTime | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(parseInt(selectedYear));
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [generateDate, setGenerateDate] = useState(getUSEasternDate());
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  // 美东时间初始化（一次性）
  useEffect(() => {
    const fetchUSEasternTime = async () => {
      try {
        const response = await fetch(`${BACKEND_DOMAIN}/api/getUSEasternTime`);
        if (response.ok) {
          const data = await response.json();
          setUsEasternTime({
            date: data.usEastern.date,
            dateTime: data.usEastern.dateTime,
            weekday: data.usEastern.weekday,
          });
          const easternDate = new Date(data.usEastern.date);
          setCurrentMonth(easternDate.getMonth() + 1);
          setCurrentYear(easternDate.getFullYear());
          setGenerateDate(data.usEastern.date);
        }
      } catch (error) {
        console.error('获取美东时间失败:', error);
      }
    };
    fetchUSEasternTime();
  }, []);

  // 可用年份获取
  const fetchAvailableYears = useCallback(async () => {
    if (parentYears && parentYears.length > 0) {
      const sortedYears = [...parentYears].sort();
      setAvailableYears(sortedYears);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setAvailableYears([new Date().getFullYear().toString()]);
        return;
      }

      const response = await fetch(`//stock-backend-tau.vercel.app/api/data`, {
        headers: { Authorization: token },
      });

      if (response.ok) {
        const data = await response.json();
        const years = new Set<string>();

        Object.keys(data.stocks || {}).forEach((year) => {
          if (data.stocks[year]?.length > 0) years.add(year);
        });
        Object.keys(data.stockTransactions || {}).forEach((year) => {
          if (data.stockTransactions[year]?.length > 0) years.add(year);
        });
        Object.keys(data.cashTransactions || {}).forEach((year) => {
          if (data.cashTransactions[year]?.length > 0) years.add(year);
        });

        const sortedYears = Array.from(years).sort();
        if (sortedYears.length > 0) {
          setAvailableYears(sortedYears);
        } else {
          setAvailableYears([new Date().getFullYear().toString()]);
        }
      } else {
        setAvailableYears([new Date().getFullYear().toString()]);
      }
    } catch (error) {
      console.error('获取可用年份失败:', error);
      setAvailableYears([new Date().getFullYear().toString()]);
    }
  }, [parentYears]);

  // parentYears 变化时重新计算可用年份
  useEffect(() => {
    fetchAvailableYears();
  }, [fetchAvailableYears]);

  // 选中年份变化时同步 currentYear
  useEffect(() => {
    setCurrentYear(parseInt(selectedYear));
  }, [selectedYear]);

  return {
    usEasternTime,
    currentMonth,
    setCurrentMonth,
    currentYear,
    setCurrentYear,
    viewMode,
    setViewMode,
    generateDate,
    setGenerateDate,
    availableYears,
  };
}
