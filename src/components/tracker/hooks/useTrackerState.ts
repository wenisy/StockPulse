import { useRef, useState } from 'react';
import type { AlertInfo, StockSymbol, User } from '@/types/stock';

/**
 * 聚合 StockPortfolioTracker 的 16 个 UI 级 useState。
 * 业务数据相关 state 不在这里（那些由 usePortfolioData 管）。
 */
export function useTrackerState() {
  // 用户认证
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 弹窗
  const [alertInfo, setAlertInfo] = useState<AlertInfo | null>(null);

  // 年份筛选
  const [yearFilterMode, setYearFilterMode] = useState<'all' | 'custom'>('all');

  // 表单
  const [newYear, setNewYear] = useState('');
  const [cashTransactionAmount, setCashTransactionAmount] = useState('');
  const [cashTransactionType, setCashTransactionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [isCashTransactionLoading, setIsCashTransactionLoading] = useState(false);

  // 图表
  const [showPositionChart, setShowPositionChart] = useState(true);
  const [hiddenSeries, setHiddenSeries] = useState<{ [dataKey: string]: boolean }>({});
  const [hiddenStocks, setHiddenStocks] = useState<{ [stockName: string]: boolean }>({});

  // 报表
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedReportYear, setSelectedReportYear] = useState<string | null>(null);

  // 其他
  const [stockSymbols, setStockSymbols] = useState<StockSymbol[]>([]);
  const [currency, setCurrency] = useState('USD');

  return {
    // auth
    isLoggedIn,
    setIsLoggedIn,
    currentUser,
    setCurrentUser,
    saveTimeoutRef,

    // alert
    alertInfo,
    setAlertInfo,

    // filter
    yearFilterMode,
    setYearFilterMode,

    // form
    newYear,
    setNewYear,
    cashTransactionAmount,
    setCashTransactionAmount,
    cashTransactionType,
    setCashTransactionType,
    isCashTransactionLoading,
    setIsCashTransactionLoading,

    // chart
    showPositionChart,
    setShowPositionChart,
    hiddenSeries,
    setHiddenSeries,
    hiddenStocks,
    setHiddenStocks,

    // report
    isReportDialogOpen,
    setIsReportDialogOpen,
    selectedReportYear,
    setSelectedReportYear,

    // misc
    stockSymbols,
    setStockSymbols,
    currency,
    setCurrency,
  };
}
