import { useRef, useState } from 'react';
import { getUSEasternDate } from './useCalendarView';

interface ToastApi {
  addToast: (toast: {
    title: string;
    description: string;
    variant: 'success' | 'error';
    duration: number;
  }) => void;
}

export interface UseSnapshotGenerationProps {
  generateDailySnapshot: (date?: string) => Promise<void>;
  fetchCalendarData: (year: number, month: number) => Promise<void>;
  toast: ToastApi;
  currentYear: number;
  currentMonth: number;
}

export interface UseSnapshotGenerationReturn {
  isGenerating: boolean;
  isMonthlyGenerating: boolean;
  handleGenerateSnapshot: (date: string) => Promise<void>;
  handleMonthlyGenerate: () => Promise<void>;
  handleRefreshData: () => Promise<void>;
}

/** 月份天数 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * 管理快照生成相关状态与异步流程。
 * 抽自 ProfitLossCalendar.tsx 的 handleGenerateSnapshot / handleMonthlyGenerate / handleRefreshData。
 *
 * 实现细节：用 useRef 持有最新的 currentYear/currentMonth，避免 async 函数闭包
 * 捕获过期值导致用户切月后点生成刷新错误月份的 bug。
 */
export function useSnapshotGeneration({
  generateDailySnapshot,
  fetchCalendarData,
  toast,
  currentYear,
  currentMonth,
}: UseSnapshotGenerationProps): UseSnapshotGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMonthlyGenerating, setIsMonthlyGenerating] = useState(false);

  // 用 ref 持有最新值，避免 async 闭包 stale state
  const yearRef = useRef(currentYear);
  const monthRef = useRef(currentMonth);
  yearRef.current = currentYear;
  monthRef.current = currentMonth;

  const handleGenerateSnapshot = async (date: string) => {
    setIsGenerating(true);
    try {
      await generateDailySnapshot(date);
      // 使用 ref 取最新值，避免 stale closure
      await fetchCalendarData(yearRef.current, monthRef.current);
      toast.addToast({
        title: '快照生成成功',
        description: `${date} 的快照已生成`,
        variant: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast.addToast({
        title: '快照生成失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'error',
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMonthlyGenerate = async () => {
    // 取一次最新值快照，整个流程内使用同一个值，避免中途切月导致状态错乱
    const year = yearRef.current;
    const month = monthRef.current;

    const usEasternDate = getUSEasternDate();
    const currentMonthStr = `${year}-${month.toString().padStart(2, '0')}`;
    const isCurrentMonth = usEasternDate.startsWith(currentMonthStr);
    const endDay = isCurrentMonth
      ? new Date(usEasternDate).getDate()
      : getDaysInMonth(year, month);

    const confirmMessage =
      `确定要为 ${year}年${month}月 ${
        isCurrentMonth ? `(1日-${endDay}日，基于美东时间)` : '的所有日期'
      } 重新生成快照吗？\n\n` +
      `⚠️ 注意：\n` +
      `- 这将覆盖已存在的快照数据\n` +
      `- 使用美东时间避免时区混乱\n` +
      `- 可能需要几分钟时间\n` +
      `- 建议在美股收盘后执行`;

    if (!confirm(confirmMessage)) return;

    setIsMonthlyGenerating(true);
    try {
      const results: { date: string; success: boolean; message: string }[] = [];
      const totalDays = isCurrentMonth ? endDay : getDaysInMonth(year, month);

      for (let day = 1; day <= totalDays; day++) {
        const date = `${year}-${month.toString().padStart(2, '0')}-${day
          .toString()
          .padStart(2, '0')}`;

        if (new Date(date) <= new Date(usEasternDate)) {
          try {
            await generateDailySnapshot(date);
            results.push({ date, success: true, message: '生成成功' });
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (error) {
            results.push({
              date,
              success: false,
              message: error instanceof Error ? error.message : 'API错误',
            });
          }
        }
      }

      // 流程结束时再用 ref 拿一次最新值（用户可能在过程中切月，此时刷新到当前显示的月份才合理）
      await fetchCalendarData(yearRef.current, monthRef.current);

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      toast.addToast({
        title: '月度生成完成！',
        description: `成功生成: ${successful}个，失败: ${failed}个`,
        variant: 'success',
        duration: 5000,
      });
    } catch (error) {
      toast.addToast({
        title: '月度生成失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'error',
        duration: 5000,
      });
    } finally {
      setIsMonthlyGenerating(false);
    }
  };

  const handleRefreshData = async () => {
    try {
      await fetchCalendarData(yearRef.current, monthRef.current);
    } catch (error) {
      toast.addToast({
        title: '刷新失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'error',
        duration: 5000,
      });
    }
  };

  return {
    isGenerating,
    isMonthlyGenerating,
    handleGenerateSnapshot,
    handleMonthlyGenerate,
    handleRefreshData,
  };
}

