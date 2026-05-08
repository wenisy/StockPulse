import { useState } from 'react';
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

  const handleGenerateSnapshot = async (date: string) => {
    setIsGenerating(true);
    try {
      await generateDailySnapshot(date);
      await fetchCalendarData(currentYear, currentMonth);
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
    const usEasternDate = getUSEasternDate();
    const currentMonthStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
    const isCurrentMonth = usEasternDate.startsWith(currentMonthStr);
    const endDay = isCurrentMonth
      ? new Date(usEasternDate).getDate()
      : getDaysInMonth(currentYear, currentMonth);

    const confirmMessage =
      `确定要为 ${currentYear}年${currentMonth}月 ${
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
      const totalDays = isCurrentMonth ? endDay : getDaysInMonth(currentYear, currentMonth);

      for (let day = 1; day <= totalDays; day++) {
        const date = `${currentYear}-${currentMonth
          .toString()
          .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

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

      await fetchCalendarData(currentYear, currentMonth);

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
    await fetchCalendarData(currentYear, currentMonth);
  };

  return {
    isGenerating,
    isMonthlyGenerating,
    handleGenerateSnapshot,
    handleMonthlyGenerate,
    handleRefreshData,
  };
}
