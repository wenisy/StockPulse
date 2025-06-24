import { useState, useCallback } from 'react';
import { CalendarData } from '@/types/stock';

// 获取后端域名的工具函数
const getBackendDomain = () => {
    // 直接使用和其他组件相同的后端域名
    return "//stock-backend-tau.vercel.app";
};

interface UseCalendarDataReturn {
    calendarData: CalendarData[];
    isLoading: boolean;
    error: string | null;
    fetchCalendarData: (year: number, month: number) => Promise<void>;
    fetchYearlyCalendarSummary: (year: number) => Promise<any>;
    generateDailySnapshot: (date?: string) => Promise<void>;
    generateSmartSnapshot: (date?: string, forceGenerate?: boolean) => Promise<any>;
}

export const useCalendarData = (): UseCalendarDataReturn => {
    const [calendarData, setCalendarData] = useState<CalendarData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const backendDomain = getBackendDomain();

    // 获取月度日历数据
    const fetchCalendarData = useCallback(async (year: number, month: number) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('未找到认证令牌');
            }

            const response = await fetch(
                `${backendDomain}/api/calendarData?year=${year}&month=${month.toString().padStart(2, '0')}`,
                {
                    headers: {
                        'Authorization': token,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`获取日历数据失败: ${response.statusText}`);
            }

            const result = await response.json();
            setCalendarData(result.data || []);
        } catch (error) {
            console.error('获取日历数据失败:', error);
            setError(error instanceof Error ? error.message : '获取数据失败');
            setCalendarData([]);
        } finally {
            setIsLoading(false);
        }
    }, [backendDomain]); // 添加依赖项

    // 获取年度汇总数据
    const fetchYearlyCalendarSummary = async (year: number) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('未找到认证令牌');
            }

            const response = await fetch(
                `${backendDomain}/api/calendarData?year=${year}&type=summary`,
                {
                    headers: {
                        'Authorization': token,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`获取年度汇总失败: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data || [];
        } catch (error) {
            console.error('获取年度汇总失败:', error);
            throw error;
        }
    };

    // 手动生成每日快照
    const generateDailySnapshot = useCallback(async (date?: string) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('未找到认证令牌');
            }

            const targetDate = date || new Date().toISOString().split('T')[0];

            const response = await fetch(
                `${backendDomain}/api/generateSnapshot`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token,
                    },
                    body: JSON.stringify({ date: targetDate })
                }
            );

            if (!response.ok) {
                throw new Error(`生成快照失败: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('快照生成成功:', result);
        } catch (error) {
            console.error('生成快照失败:', error);
            throw error;
        }
    }, [backendDomain]);

    // 智能生成每日快照
    const generateSmartSnapshot = useCallback(async (date?: string, forceGenerate: boolean = false) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('未找到认证令牌');
            }

            const targetDate = date || new Date().toISOString().split('T')[0];

            const response = await fetch(
                `${backendDomain}/api/smartSnapshot`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token,
                    },
                    body: JSON.stringify({
                        date: targetDate,
                        forceGenerate
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`智能快照生成失败: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('智能快照结果:', result);
            return result;
        } catch (error) {
            console.error('智能快照生成失败:', error);
            throw error;
        }
    }, [backendDomain]);

    return {
        calendarData,
        isLoading,
        error,
        fetchCalendarData,
        fetchYearlyCalendarSummary,
        generateDailySnapshot,
        generateSmartSnapshot
    };
};
