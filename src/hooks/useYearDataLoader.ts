import { useState, useCallback, useRef } from 'react';
import { YearData } from '@/types/stock';

const backendDomain = process.env.NEXT_PUBLIC_BACKEND_DOMAIN || '//stock-backend-tau.vercel.app';

interface YearSummary {
  cashBalance: number;
  stockValue: number;
  totalPortfolioValue: number;
  yoyGrowth: number;
}

interface YearsResponse {
  years: string[];
  summaries: { [year: string]: YearSummary };
}

interface YearDataResponse {
  year: string;
  stocks: YearData['stocks'];
  cashTransactions: YearData['cashTransactions'];
  stockTransactions: YearData['stockTransactions'];
  cashBalance: number;
}

/**
 * 分年份按需加载数据的 Hook
 * 
 * 1. 首先加载年份列表和概览数据（轻量）
 * 2. 按需加载指定年份的完整数据
 */
export const useYearDataLoader = () => {
  // 年份列表
  const [years, setYears] = useState<string[]>([]);
  // 年份概览数据
  const [summaries, setSummaries] = useState<{ [year: string]: YearSummary }>({});
  // 完整年份数据
  const [yearData, setYearData] = useState<{ [year: string]: YearData }>({});
  // 已加载的年份
  const loadedYearsRef = useRef<Set<string>>(new Set());
  // 正在加载的年份
  const [loadingYears, setLoadingYears] = useState<Set<string>>(new Set());
  // 加载状态
  const [isLoadingYears, setIsLoadingYears] = useState(false);
  // 错误状态
  const [error, setError] = useState<string | null>(null);

  /**
   * 加载年份列表和概览数据
   */
  const loadYearsList = useCallback(async (token: string): Promise<boolean> => {
    setIsLoadingYears(true);
    setError(null);

    try {
      const response = await fetch(`${backendDomain}/api/data/years`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('会话已过期');
          return false;
        }
        throw new Error('加载年份列表失败');
      }

      const data: YearsResponse = await response.json();
      setYears(data.years);
      setSummaries(data.summaries);
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      return false;
    } finally {
      setIsLoadingYears(false);
    }
  }, []);

  /**
   * 加载指定年份的完整数据
   */
  const loadYearData = useCallback(async (year: string, token: string): Promise<YearData | null> => {
    // 如果已加载，直接返回缓存
    if (loadedYearsRef.current.has(year) && yearData[year]) {
      return yearData[year];
    }

    // 避免重复加载
    if (loadingYears.has(year)) {
      return null;
    }

    setLoadingYears(prev => new Set(prev).add(year));

    try {
      const response = await fetch(`${backendDomain}/api/data/year/${year}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`加载 ${year} 年数据失败`);
      }

      const data: YearDataResponse = await response.json();
      
      const yearDataItem: YearData = {
        stocks: data.stocks,
        cashTransactions: data.cashTransactions,
        stockTransactions: data.stockTransactions,
        cashBalance: data.cashBalance,
      };

      setYearData(prev => ({
        ...prev,
        [year]: yearDataItem,
      }));

      loadedYearsRef.current.add(year);
      
      return yearDataItem;
    } catch (err) {
      console.error(`加载 ${year} 年数据失败:`, err);
      return null;
    } finally {
      setLoadingYears(prev => {
        const next = new Set(prev);
        next.delete(year);
        return next;
      });
    }
  }, [yearData, loadingYears]);

  /**
   * 批量加载多个年份数据
   */
  const loadMultipleYears = useCallback(async (yearsToLoad: string[], token: string): Promise<void> => {
    const unloadedYears = yearsToLoad.filter(y => !loadedYearsRef.current.has(y));
    
    if (unloadedYears.length === 0) return;

    // 并行加载，但限制并发数
    const batchSize = 3;
    for (let i = 0; i < unloadedYears.length; i += batchSize) {
      const batch = unloadedYears.slice(i, i + batchSize);
      await Promise.all(batch.map(year => loadYearData(year, token)));
    }
  }, [loadYearData]);

  /**
   * 检查年份是否已加载
   */
  const isYearLoaded = useCallback((year: string): boolean => {
    return loadedYearsRef.current.has(year);
  }, []);

  /**
   * 检查年份是否正在加载
   */
  const isYearLoading = useCallback((year: string): boolean => {
    return loadingYears.has(year);
  }, [loadingYears]);

  /**
   * 清除缓存（用于登出或刷新）
   */
  const clearCache = useCallback(() => {
    setYears([]);
    setSummaries({});
    setYearData({});
    loadedYearsRef.current.clear();
    setLoadingYears(new Set());
    setError(null);
  }, []);

  /**
   * 更新单个年份数据（用于本地修改后同步）
   */
  const updateYearData = useCallback((year: string, data: YearData) => {
    setYearData(prev => ({
      ...prev,
      [year]: data,
    }));
    loadedYearsRef.current.add(year);
  }, []);

  return {
    // 状态
    years,
    summaries,
    yearData,
    isLoadingYears,
    error,
    
    // 方法
    loadYearsList,
    loadYearData,
    loadMultipleYears,
    isYearLoaded,
    isYearLoading,
    clearCache,
    updateYearData,
    
    // 设置器（用于兼容现有代码）
    setYears,
    setYearData,
  };
};
