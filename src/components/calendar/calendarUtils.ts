import type { CalendarData } from '@/types/stock';

export const MONTHS = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
];

export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** 获取月份的第一天是星期几 */
export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

/** 获取某月份的天数 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** 在 calendarData 数组中查找特定日期的数据 */
export function getDataForDate(
  calendarData: CalendarData[],
  date: string,
): CalendarData | null {
  return calendarData.find((d) => d.date === date) || null;
}

/** 根据涨跌幅返回 tailwind 颜色类 */
export function getProfitLossColor(gainPercent: number, hasData: boolean): string {
  if (!hasData) return 'bg-gray-100 text-gray-400';
  if (gainPercent > 0) return 'bg-green-100 text-green-800 border-green-200';
  if (gainPercent < 0) return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

/** 切换月份（处理跨年） */
export function changeMonth(
  currentMonth: number,
  currentYear: number,
  delta: number,
): { month: number; year: number } {
  let newMonth = currentMonth + delta;
  let newYear = currentYear;
  if (newMonth > 12) {
    newMonth = 1;
    newYear += 1;
  } else if (newMonth < 1) {
    newMonth = 12;
    newYear -= 1;
  }
  return { month: newMonth, year: newYear };
}
