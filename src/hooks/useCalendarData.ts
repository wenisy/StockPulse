import { useState, useCallback, useRef } from 'react';
import { CalendarData } from '@/types/stock';
import { isUnauthorizedResponse } from '@/lib/auth';

// 获取后端域名的工具函数（导出供其他模块直接使用 raw fetch 时复用）
export const getBackendDomain = () => {
    // 直接使用和其他组件相同的后端域名
    return "//stock-backend-tau.vercel.app";
};

export interface MonthlySummary {
    totalGain: number;
    totalGainPercent: number;
    tradingDaysCount: number;
    profitDays: number;
    lossDays: number;
    winRate: number;
}

export interface YearlyMonthSummary extends MonthlySummary {
    month: string; // '01' ~ '12'
}

export interface UseCalendarDataOptions {
    onUnauthorized?: () => void;
}

interface UseCalendarDataReturn {
    calendarData: CalendarData[];
    monthlySummary: MonthlySummary | null;
    yearlySummary: YearlyMonthSummary[] | null;
    isLoading: boolean;
    error: string | null;
    fetchCalendarData: (year: number, month: number) => Promise<void>;
    fetchYearlySummary: (year: number) => Promise<void>;
    generateDailySnapshot: (date?: string) => Promise<void>;
}

const FETCH_TIMEOUT_MS = 10_000;

/** 创建带超时的 AbortSignal（兼容降级：优先 AbortSignal.timeout，不支持则手动 setTimeout）。*/
function makeSignalWithTimeout(controller: AbortController): { signal: AbortSignal; clearTimeout: () => void } {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    timeoutId = setTimeout(() => controller.abort(new DOMException('请求超时', 'TimeoutError')), FETCH_TIMEOUT_MS);
    return {
        signal: controller.signal,
        clearTimeout: () => { if (timeoutId !== null) clearTimeout(timeoutId); },
    };
}

export const useCalendarData = (options?: UseCalendarDataOptions): UseCalendarDataReturn => {
    const onUnauthorized = options?.onUnauthorized;
    const [calendarData, setCalendarData] = useState<CalendarData[]>([]);
    const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
    const [yearlySummary, setYearlySummary] = useState<YearlyMonthSummary[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const backendDomain = getBackendDomain();

    // AbortController refs — 每次发起新请求时取消上一个同类请求
    const calendarAbortRef = useRef<AbortController | null>(null);
    const yearlyAbortRef = useRef<AbortController | null>(null);

    // 获取月度日历数据
    const fetchCalendarData = useCallback(async (year: number, month: number) => {
        // 取消上一次未完成的同类请求
        calendarAbortRef.current?.abort();
        const controller = new AbortController();
        calendarAbortRef.current = controller;

        setIsLoading(true);
        setError(null);

        const { signal, clearTimeout: clearSignalTimeout } = makeSignalWithTimeout(controller);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('未找到认证令牌');
            }

            const response = await fetch(
                `${backendDomain}/api/calendarData?year=${year}&month=${month.toString().padStart(2, '0')}`,
                { headers: { 'Authorization': token }, signal }
            );

            if (signal.aborted) return; // 竞态保护：丢弃过期响应

            const result = await response.json();
            if (signal.aborted) return;

            if (isUnauthorizedResponse(response.status, result.message)) {
                onUnauthorized?.();
                return;
            }

            if (!response.ok) {
                throw new Error(`获取日历数据失败: ${response.statusText}`);
            }

            setCalendarData(result.data || []);
            setMonthlySummary(result.monthlySummary || null);
        } catch (err) {
            if ((err as Error)?.name === 'AbortError') return; // 忽略主动中止
            setError(err instanceof Error ? err.message : '获取数据失败');
            setCalendarData([]);
            setMonthlySummary(null);
        } finally {
            clearSignalTimeout();
            if (!signal.aborted) setIsLoading(false);
        }
    }, [backendDomain, onUnauthorized]);

    // 获取年度（月度汇总）数据
    const fetchYearlySummary = useCallback(async (year: number) => {
        // 取消上一次未完成的同类请求
        yearlyAbortRef.current?.abort();
        const controller = new AbortController();
        yearlyAbortRef.current = controller;

        setIsLoading(true);
        setError(null);

        const { signal, clearTimeout: clearSignalTimeout } = makeSignalWithTimeout(controller);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('未找到认证令牌');
            }

            const response = await fetch(
                `${backendDomain}/api/calendarData?year=${year}&type=summary`,
                { headers: { 'Authorization': token }, signal }
            );

            if (signal.aborted) return;

            const result = await response.json();
            if (signal.aborted) return;

            if (isUnauthorizedResponse(response.status, result.message)) {
                onUnauthorized?.();
                return;
            }

            if (!response.ok) {
                throw new Error(`获取年度汇总失败: ${response.statusText}`);
            }

            setYearlySummary(result.data || null);
        } catch (err) {
            if ((err as Error)?.name === 'AbortError') return;
            setError(err instanceof Error ? err.message : '获取年度汇总失败');
            setYearlySummary(null);
        } finally {
            clearSignalTimeout();
            if (!signal.aborted) setIsLoading(false);
        }
    }, [backendDomain, onUnauthorized]);

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

            const result = await response.json();

            if (isUnauthorizedResponse(response.status, result.message)) {
                onUnauthorized?.();
                return;
            }

            if (!response.ok) {
                throw new Error(`生成快照失败: ${response.statusText}`);
            }
        } catch (error) {
            throw error;
        }
    }, [backendDomain, onUnauthorized]);

    return {
        calendarData,
        monthlySummary,
        yearlySummary,
        isLoading,
        error,
        fetchCalendarData,
        fetchYearlySummary,
        generateDailySnapshot
    };
};
