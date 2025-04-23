"use client";
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { YearFilter } from '@/components/ui/year-filter';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
    Tooltip as UITooltip,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import {
    CashTransaction,
    ExchangeRates,
    IncrementalChanges,
    PriceData,
    StockChartData,
    StockSymbol,
    StockTransaction,
    StockValueMap,
    TableCell,
    User,
    YearData
} from '@/types/stock';
import { Edit, Eye, EyeOff, HelpCircle, RefreshCw, Save, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { v4 as uuidv4 } from 'uuid';
import { stockInitialData } from './data';
import GrowthInfo from './GrowthInfo';
import ReportDialog from './ReportDialog';

const StockPortfolioTracker: React.FC = () => {
    const initialData: { [year: string]: YearData } = stockInitialData;

    const [yearData, setYearData] = useState<{ [year: string]: YearData }>(initialData);
    const [years, setYears] = useState<string[]>(Object.keys(initialData).sort((a, b) => parseInt(b) - parseInt(a)));
    const [filteredYears, setFilteredYears] = useState<string[]>(Object.keys(initialData).sort((a, b) => parseInt(b) - parseInt(a)));
    const [yearFilter, setYearFilter] = useState<string>('all');
    const [newYear, setNewYear] = useState('');
    const [newStockName, setNewStockName] = useState('');
    const [newShares, setNewShares] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [newYearEndPrice, setNewYearEndPrice] = useState('');
    const [newStockSymbol, setNewStockSymbol] = useState('');
    const [selectedYear, setSelectedYear] = useState(years[years.length - 1]);
    const [showPositionChart, setShowPositionChart] = useState(true);
    const [editingStockName, setEditingStockName] = useState<string | null>(null);
    const [editedRowData, setEditedRowData] = useState<{
        [year: string]: { quantity: string; unitPrice: string; costPrice: string; symbol?: string };
    } | null>(null);
    const [hiddenSeries, setHiddenSeries] = useState<{ [dataKey: string]: boolean }>({});
    const [hiddenStocks, setHiddenStocks] = useState<{ [stockName: string]: boolean }>({});
    const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
    const [alertInfo, setAlertInfo] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm?: () => void;
        onCancel?: () => void;
        confirmText?: string;
        cancelText?: string;
    } | null>(null);
    const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');
    const [cashTransactionAmount, setCashTransactionAmount] = useState('');
    const [cashTransactionType, setCashTransactionType] = useState<'deposit' | 'withdraw'>('deposit');
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
    const [selectedReportYear, setSelectedReportYear] = useState<string | null>(null);
    const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
    const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);
    const [pasteData, setPasteData] = useState('');
    const [stockSymbols, setStockSymbols] = useState<StockSymbol[]>([]);
    const [priceData, setPriceData] = useState<PriceData>({});
    const [isLoading, setIsLoading] = useState(false);
    const [currency, setCurrency] = useState('USD');
    const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({ USD: 1, HKD: 0.12864384, CNY: 0.14 });
    const [retirementGoal, setRetirementGoal] = useState(() => {
        // 如果用户已登录，使用用户信息中的退休目标金额
        if (typeof window !== 'undefined') {
            const userJson = localStorage.getItem('user');
            if (userJson) {
                try {
                    const user = JSON.parse(userJson);
                    if (user.retirementGoal) {
                        return user.retirementGoal;
                    }
                } catch (error) {
                    console.error('解析用户数据失败:', error);
                }
            }
            // 如果用户未登录或没有设置退休目标金额，使用 localStorage
            const savedGoal = localStorage.getItem('retirementGoal');
            return savedGoal || '';
        }
        return '';
    });
    // 获取平均年化收益率
    const getLatestYearGrowthRate = useCallback(() => {
        if (years.length < 1) return '';

        // 年份数组已经按照降序排列（最新的在前）
        const latestYear = years[0];
        const earliestYear = years[years.length - 1];

        // 计算投资年数（包括可能缺失的年份）
        const investmentYears = parseInt(latestYear) - parseInt(earliestYear) + 1;

        // 计算总价值函数
        const calculateTotalValue = (year: string) => {
            if (!yearData[year]?.stocks) return 0;
            const stockValue = yearData[year].stocks.reduce((acc, stock) => acc + stock.shares * stock.price, 0);
            return stockValue + (yearData[year].cashBalance || 0);
        };

        // 获取最新年份的总价值
        const currentValue = calculateTotalValue(latestYear);

        // 获取最早年份的总价值
        const initialValue = calculateTotalValue(earliestYear);

        // 计算所有年份的累计投入现金
        let totalDeposits = 0;
        years.forEach(year => {
            const deposits = yearData[year]?.cashTransactions
                .reduce((sum, tx) => sum + (tx.type === 'deposit' ? tx.amount : 0), 0) || 0;
            totalDeposits += deposits;
        });

        // 计算所有年份的累计提取现金
        let totalWithdrawals = 0;
        years.forEach(year => {
            const withdrawals = yearData[year]?.cashTransactions
                .reduce((sum, tx) => sum + (tx.type === 'withdraw' ? tx.amount : 0), 0) || 0;
            totalWithdrawals += withdrawals;
        });

        // 累计净投入现金
        const netDeposits = totalDeposits - totalWithdrawals;

        // 如果初始投资为零，则使用累计净投入现金作为基数
        const baseValue = initialValue > 0 ? initialValue : netDeposits;

        if (baseValue <= 0) return '';

        // 计算总收益率
        const totalReturn = (currentValue / baseValue) - 1;

        // 计算平均年化收益率
        // 公式：(1 + r)^n = (1 + totalReturn)，其中 r 是年化收益率，n 是年数
        const annualizedReturn = (Math.pow(1 + totalReturn, 1 / investmentYears) - 1) * 100;

        return annualizedReturn.toFixed(2);
    }, [years, yearData]);

    const [annualReturn, setAnnualReturn] = useState(() => {
        // 如果用户已登录，使用用户信息中的预期年回报率
        if (typeof window !== 'undefined') {
            const userJson = localStorage.getItem('user');
            if (userJson) {
                try {
                    const user = JSON.parse(userJson);
                    if (user.annualReturn) {
                        return user.annualReturn;
                    }
                } catch (error) {
                    console.error('解析用户数据失败:', error);
                }
            }
            // 如果用户未登录或没有设置预期年回报率，使用 localStorage
            const savedReturn = localStorage.getItem('annualReturn');
            return savedReturn || '';
        }
        return '';
    });
    const [calculationMode, setCalculationMode] = useState<'rate' | 'years'>(() => {
        // 如果用户已登录，使用用户信息中的计算模式
        if (typeof window !== 'undefined') {
            const userJson = localStorage.getItem('user');
            if (userJson) {
                try {
                    const user = JSON.parse(userJson);
                    if (user.calculationMode && (user.calculationMode === 'rate' || user.calculationMode === 'years')) {
                        return user.calculationMode;
                    }
                } catch (error) {
                    console.error('解析用户数据失败:', error);
                }
            }
            // 如果用户未登录或没有设置计算模式，使用 localStorage
            const savedMode = localStorage.getItem('calculationMode');
            return (savedMode === 'rate' || savedMode === 'years') ? savedMode : 'rate';
        }
        return 'rate';
    });
    const [targetYears, setTargetYears] = useState(() => {
        // 如果用户已登录，使用用户信息中的目标年限
        if (typeof window !== 'undefined') {
            const userJson = localStorage.getItem('user');
            if (userJson) {
                try {
                    const user = JSON.parse(userJson);
                    if (user.targetYears) {
                        return user.targetYears;
                    }
                } catch (error) {
                    console.error('解析用户数据失败:', error);
                }
            }
            // 如果用户未登录或没有设置目标年限，使用 localStorage
            const savedYears = localStorage.getItem('targetYears');
            return savedYears || '';
        }
        return '';
    });
    const [comparisonYear, setComparisonYear] = useState<string>(years[0]);

    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
    const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
    const [username, setUsername] = useState('');
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loginError, setLoginError] = useState('');
    const [registerError, setRegisterError] = useState('');
    const [profileError, setProfileError] = useState('');
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

    const latestYear = years.length > 0 ? Math.max(...years.map(Number)).toString() : '2024';

    const backendDomain = "//stock-backend-tau.vercel.app";

    // 增量变化跟踪
    const [incrementalChanges, setIncrementalChanges] = useState<IncrementalChanges>({
        stocks: {},
        cashTransactions: {},
        stockTransactions: {},
        yearlySummaries: {}
    });

    // --- Check Login Status on Mount ---
    useEffect(() => {
        const initializeData = async () => {
            const token = localStorage.getItem('token');
            const userJson = localStorage.getItem('user');
            let user: User | null = null;

            if (userJson) {
                try {
                    user = JSON.parse(userJson);
                    setCurrentUser(user);
                } catch (error) {
                    console.error('解析用户数据失败:', error);
                }
            }

            if (token) {
                setIsLoggedIn(true);
                try {
                    await fetchJsonData(token);
                    setIsLoading(true);
                    await refreshPrices(false);
                    setIsLoading(false);
                } catch (error) {
                    console.error('初始化登录态数据失败:', error);
                    setAlertInfo({
                        isOpen: true,
                        title: '数据加载失败',
                        description: '无法从服务器获取数据，请稍后重试',
                        onConfirm: () => setAlertInfo(null),
                    });
                }
            } else {
                setIsLoggedIn(false);
                try {
                    const symbolsUrl = `${getBasePath()}/data/symbols.json`;
                    const symbolsResponse = await fetch(symbolsUrl);
                    if (symbolsResponse.ok) {
                        const symbolsData = await symbolsResponse.json();
                        setStockSymbols(symbolsData.stocks || []);
                    }
                } catch (error) {
                    console.error('获取股票符号失败:', error);
                }
                try {
                    const pricesUrl = `${getBasePath()}/data/prices.json`;
                    const timestamp = new Date().getTime();
                    const pricesResponse = await fetch(`${pricesUrl}?t=${timestamp}`);
                    if (pricesResponse.ok) {
                        const pricesData = await pricesResponse.json();
                        setPriceData(pricesData);
                        const rates: ExchangeRates = {
                            USD: 1,
                            HKD: pricesData['HKD']?.price || 0,
                            CNY: pricesData['CNY']?.price || 0
                        };
                        setExchangeRates(rates);
                        updateLatestPrices(pricesData);
                    }
                } catch (error) {
                    console.error('获取最新价格时出错:', error);
                }
            }
        };

        initializeData();
    }, []);

    // --- Login Function ---
    const handleLogin = async () => {
        try {
            const response = await fetch(`${backendDomain}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (response.ok) {
                // 保存令牌和用户信息
                localStorage.setItem('token', data.token);

                // 保存用户信息
                if (data.user) {
                    const user: User = {
                        username: data.user.username,
                        nickname: data.user.nickname,
                        email: data.user.email,
                        uuid: data.user.uuid,
                        retirementGoal: data.user.retirementGoal,
                        annualReturn: data.user.annualReturn,
                        targetYears: data.user.targetYears,
                        calculationMode: data.user.calculationMode as 'rate' | 'years' || 'rate',
                    };
                    localStorage.setItem('user', JSON.stringify(user));
                    setCurrentUser(user);

                    // 设置退休目标计算器相关状态
                    if (user.retirementGoal) setRetirementGoal(user.retirementGoal);
                    if (user.annualReturn) setAnnualReturn(user.annualReturn);
                    if (user.targetYears) setTargetYears(user.targetYears);
                    if (user.calculationMode) setCalculationMode(user.calculationMode);
                }

                setIsLoggedIn(true);
                setIsLoginDialogOpen(false);
                setLoginError('');
                await fetchJsonData(data.token);
                setIsLoading(true);
                await refreshPrices(false);
                setIsLoading(false);
                setAlertInfo({
                    isOpen: true,
                    title: '登录成功',
                    description: '数据已加载，价格已刷新',
                    onConfirm: () => setAlertInfo(null),
                });
            } else {
                setLoginError(data.message || '登录失败');
            }
        } catch (error) {
            setLoginError('网络错误，请稍后再试');
        }
    };

    // --- Register Function ---
    const handleRegister = async () => {
        try {
            if (!username || !password) {
                setRegisterError('用户名和密码为必填项');
                return;
            }

            const response = await fetch(`${backendDomain}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password,
                    email,
                    nickname,
                    retirementGoal: retirementGoal || '',
                    annualReturn: annualReturn || '',
                    targetYears: targetYears || '',
                    calculationMode: calculationMode || 'rate'
                }),
            });
            const data = await response.json();

            if (response.ok) {
                // 保存令牌和用户信息
                if (data.token && data.user) {
                    localStorage.setItem('token', data.token);

                    const user: User = {
                        username: data.user.username,
                        nickname: data.user.nickname,
                        email: data.user.email,
                        uuid: data.user.uuid,
                        retirementGoal: data.user.retirementGoal,
                        annualReturn: data.user.annualReturn,
                        targetYears: data.user.targetYears,
                        calculationMode: data.user.calculationMode as 'rate' | 'years' || 'rate',
                    };
                    localStorage.setItem('user', JSON.stringify(user));
                    setCurrentUser(user);

                    // 设置退休目标计算器相关状态
                    if (user.retirementGoal) setRetirementGoal(user.retirementGoal);
                    if (user.annualReturn) setAnnualReturn(user.annualReturn);
                    if (user.targetYears) setTargetYears(user.targetYears);
                    if (user.calculationMode) setCalculationMode(user.calculationMode);

                    // 直接设置为登录状态
                    setIsLoggedIn(true);
                    setIsRegisterDialogOpen(false);
                    setRegisterError('');
                    setUsername('');
                    setPassword('');
                    setEmail('');

                    // 加载数据
                    fetchJsonData(data.token);
                    setIsLoading(true);
                    refreshPrices(false);
                    setIsLoading(false);

                    setAlertInfo({
                        isOpen: true,
                        title: '注册成功',
                        description: '您已经成功注册并登录，数据已加载',
                        onConfirm: () => setAlertInfo(null),
                    });
                } else {
                    // 如果没有返回令牌或用户信息，则返回到登录页面
                    setIsRegisterDialogOpen(false);
                    setRegisterError('');
                    setUsername('');
                    setPassword('');
                    setEmail('');
                    setAlertInfo({
                        isOpen: true,
                        title: '注册成功',
                        description: '请使用您的新账号登录',
                        onConfirm: () => {
                            setAlertInfo(null);
                            setIsLoginDialogOpen(true);
                        },
                    });
                }
            } else {
                setRegisterError(data.message || '注册失败');
            }
        } catch (error) {
            setRegisterError('网络错误，请稍后再试');
        }
    };

    // --- Fetch Data from Backend ---
    const fetchJsonData = async (token: string) => {
        try {
            const response = await fetch(`${backendDomain}/api/data`, {
                headers: {
                    'Authorization': token,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setYearData(data);
                const sortedYears = Object.keys(data).sort((a, b) => parseInt(b) - parseInt(a));
                setYears(sortedYears);
                setFilteredYears(sortedYears);
                setSelectedYear(sortedYears[0]);
                setComparisonYear(sortedYears[0]);
            } else {
                // Check for invalid/expired token
                if (response.status === 401 || (data.message && data.message.includes("无效或过期的令牌"))) {
                    console.warn('Token invalid or expired. Logging out.');
                    handleLogout(); // Call logout function
                    setAlertInfo({ // Inform the user
                        isOpen: true,
                        title: '会话已过期',
                        description: '您的登录已过期，请重新登录。',
                        onConfirm: () => setAlertInfo(null),
                    });
                } else {
                    console.error('获取数据失败:', data.message || response.statusText);
                }
            }
        } catch (error) {
            console.error('获取数据时出错:', error);
        }
    };

    // --- Save Data to Backend ---
    const handleSaveData = () => {
        if (isLoggedIn) {
            setIsSaveDialogOpen(true);
        }
    };

    const confirmSaveData = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${backendDomain}/api/updateNotion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token,
                },
                body: JSON.stringify(incrementalChanges),
            });
            const result = await response.json();
            if (response.ok) {
                setAlertInfo({
                    isOpen: true,
                    title: '保存成功',
                    description: '增量数据已成功保存到Notion数据库',
                    onConfirm: () => setAlertInfo(null),
                });
                // 清空增量变化
                setIncrementalChanges({
                    stocks: {},
                    cashTransactions: {},
                    stockTransactions: {},
                    yearlySummaries: {}
                });
            } else {
                setAlertInfo({
                    isOpen: true,
                    title: '保存失败',
                    description: result.message || '保存数据时发生错误',
                    onConfirm: () => setAlertInfo(null),
                });
            }
        } catch (error) {
            setAlertInfo({
                isOpen: true,
                title: '保存失败',
                description: '网络错误，请稍后再试',
                onConfirm: () => setAlertInfo(null),
            });
        } finally {
            setIsSaveDialogOpen(false);
        }
    };

    // --- Update Profile Function ---
    const handleUpdateProfile = async () => {
        try {
            // 验证密码
            if (!oldPassword) {
                setProfileError('请输入当前密码以验证身份');
                return;
            }

            if (newPassword && newPassword !== confirmPassword) {
                setProfileError('新密码和确认密码不匹配');
                return;
            }

            const token = localStorage.getItem('token');
            if (!token) {
                setProfileError('您需要登录才能更新个人资料');
                return;
            }

            const updateData: any = {};
            if (nickname) updateData.nickname = nickname;
            if (email) updateData.email = email;
            if (newPassword) updateData.newPassword = newPassword;
            updateData.oldPassword = oldPassword; // 添加旧密码验证

            // 添加退休目标相关字段
            updateData.retirementGoal = retirementGoal;
            updateData.annualReturn = annualReturn;
            updateData.targetYears = targetYears;
            updateData.calculationMode = calculationMode;

            const response = await fetch(`${backendDomain}/api/updateProfile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify(updateData),
            });

            const data = await response.json();

            if (response.ok) {
                // 更新本地用户信息
                if (currentUser) {
                    const updatedUser: User = {
                        ...currentUser,
                        nickname: nickname || currentUser.nickname,
                        email: email || currentUser.email,
                        retirementGoal: retirementGoal,
                        annualReturn: annualReturn,
                        targetYears: targetYears,
                        calculationMode: calculationMode,
                    };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    setCurrentUser(updatedUser);
                }

                setIsProfileDialogOpen(false);
                setProfileError('');
                setOldPassword(''); // 重置旧密码
                setNewPassword('');
                setConfirmPassword('');

                setAlertInfo({
                    isOpen: true,
                    title: '更新成功',
                    description: '您的个人资料已成功更新',
                    onConfirm: () => setAlertInfo(null),
                });
            } else {
                setProfileError(data.message || '更新失败');
            }
        } catch (error) {
            setProfileError('网络错误，请稍后再试');
        }
    };

    // --- Logout Function ---
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsLoggedIn(false);
        setCurrentUser(null);
        setYearData(stockInitialData);
        const sortedYears = Object.keys(stockInitialData).sort((a, b) => parseInt(b) - parseInt(a));
        setYears(sortedYears);
        setFilteredYears(sortedYears);
        setSelectedYear(sortedYears[0]);
        setComparisonYear(sortedYears[0]);
    };

    const getBasePath = () => {
        if (typeof window !== 'undefined') {
            // 如果是GitHub Pages默认域名，使用/StockPulse前缀
            if (window.location.hostname.includes('github.io')) {
                return '/StockPulse';
            }
            // 如果是自定义域名，不使用前缀
            if (window.location.hostname === 'stock.nodal.link') {
                return '';
            }
        }
        return '';
    };

    const updateLatestPrices = (prices: PriceData) => {
        setYearData((prevYearData) => {
            const updatedYearData = { ...prevYearData };
            if (updatedYearData[latestYear] && updatedYearData[latestYear].stocks) {
                updatedYearData[latestYear].stocks.forEach(stock => {
                    if (stock.symbol && prices[stock.symbol]) {
                        if (prices[stock.symbol].currency === 'HKD') {
                            stock.price = prices[stock.symbol].price * exchangeRates['HKD'];
                        } else {
                            stock.price = prices[stock.symbol].price;
                        }
                    }
                });
            }
            return updatedYearData;
        });
    };

    const refreshPrices = async (isManual = false) => {
        setIsLoading(true);
        try {
            const latestYear = years.length > 0 ? Math.max(...years.map(Number)).toString() : "2025";
            const latestStocks = yearData[latestYear]?.stocks || [];
            const symbols = latestStocks.map(stock => stock.symbol).filter(Boolean);

            if (symbols.length === 0) {
                if (isManual) {
                    setAlertInfo({
                        isOpen: true,
                        title: "无股票数据",
                        description: "当前无股票数据可供更新",
                        onConfirm: () => setAlertInfo(null),
                    });
                }
                setIsLoading(false);
                return;
            }

            const token = localStorage.getItem("token");
            const response = await fetch(`${backendDomain}/api/updatePrices`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': token } : {})
                } as Record<string, string>,
                body: JSON.stringify({ symbols }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                const stockData = result.data;

                setYearData(prevYearData => {
                    const updatedYearData = { ...prevYearData };
                    if (updatedYearData[latestYear] && updatedYearData[latestYear].stocks) {
                        updatedYearData[latestYear].stocks.forEach(stock => {
                            if (stock.symbol && stockData[stock.symbol]) {
                                stock.price = stockData[stock.symbol].price;
                            }
                        });
                    }
                    return updatedYearData;
                });

                setLastRefreshTime(new Date());

                if (isManual) {
                    setAlertInfo({
                        isOpen: true,
                        title: "价格已更新",
                        description: `股票价格已更新至最新数据（${new Date().toLocaleString()}）`,
                        onConfirm: () => setAlertInfo(null),
                    });
                }
            } else {
                if (isManual) {
                    setAlertInfo({
                        isOpen: true,
                        title: "更新失败",
                        description: result.message || "获取最新价格时发生错误",
                        onConfirm: () => setAlertInfo(null),
                    });
                } else {
                    setAlertInfo({
                        isOpen: true,
                        title: "自动刷新失败",
                        description: "无法自动更新价格，请手动点击“刷新价格”按钮",
                        onConfirm: () => setAlertInfo(null),
                    });
                }
            }
        } catch (error) {
            console.error("刷新价格时出错:", error);
            if (isManual) {
                setAlertInfo({
                    isOpen: true,
                    title: "更新失败",
                    description: "网络错误，请稍后再试",
                    onConfirm: () => setAlertInfo(null),
                });
            } else {
                setAlertInfo({
                    isOpen: true,
                    title: "自动刷新失败",
                    description: "无法自动更新价格，请手动点击“刷新价格”按钮",
                    onConfirm: () => setAlertInfo(null),
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const convertToCurrency = (amount: number, targetCurrency: string): number => {
        const rate = exchangeRates[targetCurrency] || 1;
        return amount / rate;
    };

    const formatLargeNumber = (num: number, targetCurrency: string) => {
        const convertedNum = convertToCurrency(num, targetCurrency);
        return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(convertedNum);
    };

    const calculateYearlyValues = useCallback(() => {
        const yearlyValues: { [year: string]: { [stockName: string]: number; total: number } } = {};
        Object.keys(yearData).forEach((year) => {
            yearlyValues[year] = { total: 0 };
            let yearTotal = 0;

            if (yearData[year] && yearData[year].stocks) {
                yearData[year].stocks.forEach((stock) => {
                    if (!hiddenStocks[stock.name]) {
                        const value = stock.shares * stock.price;
                        yearlyValues[year][stock.name] = value;
                        yearTotal += value;
                    }
                });
            }
            yearlyValues[year]['total'] = yearTotal;
        });
        return yearlyValues;
    }, [yearData, hiddenStocks]);

    const calculateTotalValues = useCallback(() => {
        const totalValues: { [year: string]: number } = {};
        Object.keys(yearData).forEach((year) => {
            if (yearData[year] && yearData[year].stocks) {
                const stockValue = yearData[year].stocks.reduce((acc, stock) =>
                    hiddenStocks[stock.name] ? acc : acc + stock.shares * stock.price, 0);
                totalValues[year] = stockValue + (yearData[year].cashBalance || 0);
            } else {
                totalValues[year] = 0;
            }
        });
        return totalValues;
    }, [yearData, hiddenStocks]);

    const prepareLineChartData = useCallback(() => {
        const yearlyValues = calculateYearlyValues();
        const latestStocks = new Set<string>();

        if (yearData[latestYear] && yearData[latestYear].stocks) {
            yearData[latestYear].stocks.forEach(stock => {
                if (!hiddenStocks[stock.name]) {
                    latestStocks.add(stock.name);
                }
            });
        }

        const allStocks = new Set<string>();
        Object.values(yearData).forEach((yearDataItem) => {
            if (yearDataItem && yearDataItem.stocks) {
                yearDataItem.stocks.forEach((stock) => {
                    if (latestStocks.has(stock.name) && !hiddenStocks[stock.name]) {
                        allStocks.add(stock.name);
                    }
                });
            }
        });

        return Object.keys(yearData).map((year) => {
            const dataPoint: { [key: string]: string | number } = { year };
            allStocks.forEach((stockName) => {
                dataPoint[stockName] = yearlyValues[year][stockName] || 0;
            });
            dataPoint['total'] = yearlyValues[year]['total'];
            return dataPoint;
        });
    }, [calculateYearlyValues, yearData, latestYear, hiddenStocks]);

    const preparePercentageBarChartData = useCallback(() => {
        const result: StockChartData[] = [];
        const yearTotals: { [year: string]: number } = {};

        Object.keys(yearData).forEach((year) => {
            if (yearData[year] && yearData[year].stocks) {
                yearTotals[year] = yearData[year].stocks.reduce(
                    (total, stock) => hiddenStocks[stock.name] ? total : total + stock.shares * stock.price,
                    0
                );
            } else {
                yearTotals[year] = 0;
            }
        });

        const latestStocks = new Set<string>();
        if (yearData[latestYear] && yearData[latestYear].stocks) {
            yearData[latestYear].stocks.forEach(stock => {
                if (!hiddenStocks[stock.name]) {
                    latestStocks.add(stock.name);
                }
            });
        }

        latestStocks.forEach((stockName) => {
            const stockData: StockChartData = { name: stockName };

            Object.keys(yearData).forEach((year) => {
                if (yearData[year] && yearData[year].stocks) {
                    const stockInYear = yearData[year].stocks.find((s) => s.name === stockName);
                    const stockValue = stockInYear ? stockInYear.shares * stockInYear.price : 0;
                    const yearTotal = yearTotals[year] || 1;
                    stockData[year] = (stockValue / yearTotal) * 100;
                } else {
                    stockData[year] = 0;
                }
            });

            result.push(stockData);
        });

        return result;
    }, [yearData, latestYear, hiddenStocks]);

    const addNewYear = () => {
        const trimmedYear = newYear.trim();
        if (trimmedYear && !years.includes(trimmedYear)) {
            const referenceYear = years.filter(y => y < trimmedYear)
                .sort((a, b) => b.localeCompare(a))[0];

            const cashToCarryOver = referenceYear ?
                (yearData[referenceYear]?.cashBalance || 0) : 0;

            const newYearDataItem: YearData = {
                stocks: [],
                cashTransactions: [],
                stockTransactions: [],
                cashBalance: 0
            };

            if (cashToCarryOver > 0) {
                newYearDataItem.cashTransactions.push({
                    amount: cashToCarryOver,
                    type: 'deposit',
                    date: new Date().toISOString().split('T')[0],
                    description: '上年结余'
                });
                newYearDataItem.cashBalance = cashToCarryOver;
            }

            setYearData({ ...yearData, [trimmedYear]: newYearDataItem });
            const newYears = [...years, trimmedYear].sort((a, b) => parseInt(b) - parseInt(a));
            setYears(newYears);
            setFilteredYears(newYears);
            setNewYear('');
            setSelectedYear(trimmedYear);

            // 记录新增年份的增量变化
            setIncrementalChanges(prev => ({
                ...prev,
                yearlySummaries: {
                    ...prev.yearlySummaries,
                    [trimmedYear]: { cashBalance: cashToCarryOver }
                }
            }));
        }
    };

    const addCashTransaction = () => {
        if (!cashTransactionAmount || !selectedYear) return;
        const amount = parseFloat(cashTransactionAmount);
        if (isNaN(amount)) return;

        const cashTransaction: CashTransaction = {
            amount: cashTransactionType === 'deposit' ? amount : -amount,
            type: cashTransactionType,
            date: new Date().toISOString().split('T')[0],
            userUuid: currentUser?.uuid,
        };

        setYearData((prevYearData) => {
            const updatedYearData = { ...prevYearData };
            if (!updatedYearData[selectedYear]) {
                updatedYearData[selectedYear] = {
                    stocks: [],
                    cashTransactions: [],
                    stockTransactions: [],
                    cashBalance: 0
                };
            }
            updatedYearData[selectedYear].cashTransactions.push(cashTransaction);
            updatedYearData[selectedYear].cashBalance = (updatedYearData[selectedYear].cashBalance || 0) + cashTransaction.amount;
            return updatedYearData;
        });

        // 记录增量变化
        setIncrementalChanges((prev) => ({
            ...prev,
            cashTransactions: {
                ...prev.cashTransactions,
                [selectedYear]: [...(prev.cashTransactions[selectedYear] || []), cashTransaction]
            },
            yearlySummaries: {
                ...prev.yearlySummaries,
                [selectedYear]: { cashBalance: (yearData[selectedYear]?.cashBalance || 0) + cashTransaction.amount }
            }
        }));

        setCashTransactionAmount('');
    };

    const confirmAddNewStock = () => {
        if (!newStockName || !newShares || !newPrice || !selectedYear) return;

        const stockName = newStockName.trim();
        const transactionShares = parseInt(newShares, 10);
        const transactionPrice = parseFloat(newPrice);
        const yearEndPrice = newYearEndPrice ? parseFloat(newYearEndPrice) : null;
        const stockSymbol = newStockSymbol.trim();

        if (isNaN(transactionShares) || isNaN(transactionPrice)) return;

        const updatedYearData = { ...yearData };
        if (!updatedYearData[selectedYear]) {
            updatedYearData[selectedYear] = { stocks: [], cashTransactions: [], stockTransactions: [], cashBalance: 0 };
        }

        const currentStock = updatedYearData[selectedYear].stocks?.find((s) => s.name === stockName);
        const oldShares = currentStock ? currentStock.shares : 0;
        const oldCostPrice = currentStock ? currentStock.costPrice : 0;
        const oldTotalCost = oldShares * oldCostPrice;

        let newSharesValue = 0;
        let newTotalCost = 0;
        let newCostPrice = 0;
        let transactionCost = 0;

        if (transactionType === 'buy') {
            newSharesValue = oldShares + transactionShares;
            transactionCost = transactionShares * transactionPrice;

            newTotalCost = oldTotalCost + transactionCost;
            newCostPrice = newSharesValue > 0 ? newTotalCost / newSharesValue : 0;

            if ((updatedYearData[selectedYear].cashBalance || 0) < transactionCost) {
                setAlertInfo({
                    isOpen: true,
                    title: '现金不足',
                    description: '购买股票的现金不足，现金余额将变为负数',
                    onConfirm: () => {
                        updatedYearData[selectedYear].cashBalance = (updatedYearData[selectedYear].cashBalance || 0) - transactionCost;
                        updateStock(
                            updatedYearData,
                            selectedYear,
                            stockName,
                            newSharesValue,
                            yearEndPrice || transactionPrice,
                            newCostPrice,
                            transactionShares,
                            transactionPrice,
                            transactionType,
                            stockSymbol,
                            oldCostPrice
                        );
                        setYearData(updatedYearData);
                        resetForm();
                        setAlertInfo(null);
                    },
                    onCancel: () => setAlertInfo(null),
                });
                return;
            }
        } else {
            if (transactionShares > oldShares) {
                setAlertInfo({
                    isOpen: true,
                    title: '卖出失败',
                    description: '卖出股数超过持有股数',
                    onCancel: () => setAlertInfo(null),
                });
                return;
            }

            newSharesValue = oldShares - transactionShares;
            transactionCost = transactionShares * transactionPrice;

            const sellProceeds = transactionPrice * transactionShares;
            newTotalCost = oldTotalCost - sellProceeds;
            newCostPrice = newSharesValue > 0 ? newTotalCost / newSharesValue : 0;
        }

        const displayYearEndPrice = yearEndPrice !== null ? yearEndPrice : (currentStock ? currentStock.price : transactionPrice);
        const displayYearEndPriceText = yearEndPrice !== null ? displayYearEndPrice.toFixed(2) : `${displayYearEndPrice.toFixed(2)}（未填入）`;

        let profitInfo = '';
        if (transactionType === 'sell' && oldCostPrice > 0) {
            const profit = (transactionPrice - oldCostPrice) * transactionShares;
            const profitPercentage = ((transactionPrice / oldCostPrice) - 1) * 100;
            profitInfo = `
          预计盈利: ${profit.toFixed(2)} (${profitPercentage.toFixed(2)}%)`;
        }

        const description = `
          股票: ${stockName}
          交易类型: ${transactionType === 'buy' ? '买入' : '卖出'}
          股数: ${transactionShares}
          交易价格: ${transactionPrice.toFixed(2)}
          当前价格: ${displayYearEndPriceText}
          原成本价: ${oldCostPrice.toFixed(2)}
          新成本价: ${newCostPrice.toFixed(2)}${profitInfo}
          ${stockSymbol ? `股票代码: ${stockSymbol}` : ''}
        `;

        setAlertInfo({
            isOpen: true,
            title: '确认交易',
            description,
            onConfirm: () => {
                if (transactionType === 'buy') {
                    updatedYearData[selectedYear].cashBalance = (updatedYearData[selectedYear].cashBalance || 0) - transactionCost;
                } else {
                    updatedYearData[selectedYear].cashBalance = (updatedYearData[selectedYear].cashBalance || 0) + transactionCost;
                }
                updateStock(
                    updatedYearData,
                    selectedYear,
                    stockName,
                    newSharesValue,
                    displayYearEndPrice,
                    newCostPrice,
                    transactionShares,
                    transactionPrice,
                    transactionType,
                    stockSymbol,
                    oldCostPrice
                );
                setYearData(updatedYearData);
                resetForm();
                setAlertInfo(null);
            },
            onCancel: () => setAlertInfo(null),
        });
    };

    const updateStock = (
        updatedYearData: { [year: string]: YearData },
        year: string,
        stockName: string,
        shares: number,
        price: number,
        costPrice: number,
        transactionShares: number,
        transactionPrice: number,
        transactionType: 'buy' | 'sell',
        symbol?: string,
        beforeCostPrice?: number
    ) => {
        if (!updatedYearData[year]) {
            updatedYearData[year] = { stocks: [], cashTransactions: [], stockTransactions: [], cashBalance: 0 };
        }

        if (!updatedYearData[year].stocks) {
            updatedYearData[year].stocks = [];
        }

        const stockIndex = updatedYearData[year].stocks.findIndex((s) => s.name === stockName);
        const stockData = {
            name: stockName,
            shares,
            price,
            costPrice,
            id: stockIndex !== -1 ? updatedYearData[year].stocks[stockIndex].id : uuidv4(),
            symbol: symbol || (stockIndex !== -1 ? updatedYearData[year].stocks[stockIndex].symbol : ''),
            userUuid: currentUser?.uuid
        };

        if (stockIndex !== -1) {
            updatedYearData[year].stocks[stockIndex] = stockData;
            if (shares <= 0) {
                updatedYearData[year].stocks = updatedYearData[year].stocks.filter((_, i) => i !== stockIndex);
            }
        } else if (shares > 0) {
            updatedYearData[year].stocks.push(stockData);
        }

        const stockTransaction: StockTransaction = {
            stockName,
            type: transactionType,
            shares: transactionShares,
            price: transactionPrice,
            date: new Date().toISOString().split('T')[0],
            beforeCostPrice: beforeCostPrice ?? 0,
            afterCostPrice: costPrice,
            userUuid: currentUser?.uuid
        };
        updatedYearData[year].stockTransactions.push(stockTransaction);

        const cashTransaction: CashTransaction = {
            amount: transactionType === 'buy' ? -transactionShares * transactionPrice : transactionShares * transactionPrice,
            type: transactionType,
            date: new Date().toISOString().split('T')[0],
            stockName,
            userUuid: currentUser?.uuid
        };
        updatedYearData[year].cashTransactions.push(cashTransaction);

        // 记录增量变化
        setIncrementalChanges((prev) => ({
            ...prev,
            stocks: {
                ...prev.stocks,
                [year]: [...(prev.stocks[year] || []), stockData]
            },
            stockTransactions: {
                ...prev.stockTransactions,
                [year]: [...(prev.stockTransactions[year] || []), stockTransaction]
            },
            cashTransactions: {
                ...prev.cashTransactions,
                [year]: [...(prev.cashTransactions[year] || []), cashTransaction]
            },
            yearlySummaries: {
                ...prev.yearlySummaries,
                [year]: { cashBalance: updatedYearData[year].cashBalance }
            }
        }));
    };

    const resetForm = () => {
        setNewStockName('');
        setNewShares('');
        setNewPrice('');
        setNewYearEndPrice('');
        setNewStockSymbol('');
        setTransactionType('buy');
    };

    const handleEditRow = (stockName: string) => {
        setEditingStockName(stockName);
        const initialEditedData: {
            [year: string]: { quantity: string; unitPrice: string; costPrice: string; symbol?: string }
        } = {};
        years.forEach((year) => {
            if (yearData[year] && yearData[year].stocks) {
                const stock = yearData[year].stocks.find((s) => s.name === stockName);
                initialEditedData[year] = {
                    quantity: stock?.shares?.toString() || '',
                    unitPrice: stock?.price?.toString() || '',
                    costPrice: stock?.costPrice?.toString() || '',
                    symbol: stock?.symbol || ''
                };
            } else {
                initialEditedData[year] = {
                    quantity: '',
                    unitPrice: '',
                    costPrice: '',
                    symbol: ''
                };
            }
        });
        setEditedRowData(initialEditedData);
    };

    const handleSaveRow = (stockName: string) => {
        setYearData((prevYearData) => {
            const updatedYearData: { [year: string]: YearData } = { ...prevYearData };
            if (!editedRowData) return updatedYearData;

            years.forEach((year) => {
                if (!updatedYearData[year]) {
                    updatedYearData[year] = { stocks: [], cashTransactions: [], stockTransactions: [], cashBalance: 0 };
                }

                if (!updatedYearData[year].stocks) {
                    updatedYearData[year].stocks = [];
                }

                const editedInfo = editedRowData[year];
                if (!editedInfo) return;

                const shares = parseInt(editedInfo.quantity, 10);
                const price = parseFloat(editedInfo.unitPrice);
                const costPrice = parseFloat(editedInfo.costPrice);
                const symbol = editedInfo.symbol;

                if (!isNaN(shares) && !isNaN(price) && !isNaN(costPrice)) {
                    const stockIndex = updatedYearData[year].stocks.findIndex((s) => s.name === stockName);
                    if (stockIndex !== -1) {
                        updatedYearData[year].stocks[stockIndex] = {
                            ...updatedYearData[year].stocks[stockIndex],
                            shares,
                            price,
                            costPrice,
                            symbol
                        };
                    } else {
                        updatedYearData[year].stocks.push({
                            name: stockName,
                            shares,
                            price,
                            costPrice,
                            id: uuidv4(),
                            symbol,
                            userUuid: currentUser?.uuid
                        });
                    }

                    // 记录增量变化
                    setIncrementalChanges((prev) => ({
                        ...prev,
                        stocks: {
                            ...prev.stocks,
                            [year]: [...(prev.stocks[year] || []), {
                                name: stockName,
                                shares,
                                price,
                                costPrice,
                                symbol,
                                id: uuidv4(),
                                userUuid: currentUser?.uuid
                            }]
                        },
                        yearlySummaries: {
                            ...prev.yearlySummaries,
                            [year]: { cashBalance: updatedYearData[year].cashBalance }
                        }
                    }));
                } else if (updatedYearData[year].stocks) {
                    updatedYearData[year].stocks = updatedYearData[year].stocks.filter((s) => s.name !== stockName);
                }
            });
            return updatedYearData;
        });
        setEditingStockName(null);
        setEditedRowData(null);
    };

    const handleInputChange = (year: string, field: 'quantity' | 'unitPrice' | 'costPrice' | 'symbol', value: string) => {
        if (editingStockName && editedRowData) {
            setEditedRowData((prev) => {
                if (!prev) return null;
                return {
                    ...prev,
                    [year]: {
                        ...prev[year],
                        [field]: value
                    }
                };
            });
        }
    };

    const handleDeleteStock = (stockName: string) => {
        // 显示确认对话框
        setAlertInfo({
            isOpen: true,
            title: '确认删除',
            description: `确定要删除 ${stockName} 吗？`,
            onConfirm: () => {
                // 执行删除操作
                setYearData((prevYearData) => {
                    const updatedYearData: { [year: string]: YearData } = {};
                    Object.keys(prevYearData).forEach((year) => {
                        if (prevYearData[year] && prevYearData[year].stocks) {
                            updatedYearData[year] = {
                                ...prevYearData[year],
                                stocks: prevYearData[year].stocks.filter((stock) => stock.name !== stockName)
                            };
                        } else {
                            updatedYearData[year] = prevYearData[year];
                        }
                    });
                    return updatedYearData;
                });

                // 记录删除股票的增量变化
                setIncrementalChanges((prev) => {
                    const updatedStocks = { ...prev.stocks };
                    Object.keys(updatedStocks).forEach((year) => {
                        updatedStocks[year] = updatedStocks[year].filter((stock) => stock.name !== stockName);
                    });
                    return {
                        ...prev,
                        stocks: updatedStocks
                    };
                });

                // 关闭对话框
                setAlertInfo(null);
            },
            onCancel: () => setAlertInfo(null),
            confirmText: '确认',
            cancelText: '取消',
        });
    };

    const toggleStockVisibility = (stockName: string) => {
        setHiddenStocks(prev => ({
            ...prev,
            [stockName]: !prev[stockName]
        }));
    };

    const handleYearFilterChange = (value: string) => {
        setYearFilter(value);
        if (value === 'all') {
            setFilteredYears(years);
        } else {
            // 单选模式
            setFilteredYears([value]);
        }
    };

    const handleYearToggle = (year: string) => {
        setFilteredYears(prev => {
            if (prev.includes(year)) {
                // 如果已经选中，则移除
                return prev.filter(y => y !== year);
            } else {
                // 如果未选中，则添加
                return [...prev, year].sort((a, b) => parseInt(b) - parseInt(a));
            }
        });
    };

    const tableData = useCallback(() => {
        const stockSet = new Set<string>();
        Object.values(yearData).forEach((yearDataItem) => {
            if (yearDataItem && yearDataItem.stocks) {
                yearDataItem.stocks.forEach((stock) => stockSet.add(stock.name));
            }
        });

        const stockValues2025: StockValueMap = {};
        Object.values(yearData).forEach((yearDataItem) => {
            if (yearDataItem && yearDataItem.stocks) {
                yearDataItem.stocks.forEach((stock) => {
                    if (stock.name in stockValues2025) return;
                    const stockIn2025 = yearData['2025']?.stocks?.find((s) => s.name === stock.name);
                    if (stockIn2025) {
                        stockValues2025[stock.name] = stockIn2025.shares * stockIn2025.price;
                    } else {
                        stockValues2025[stock.name] = 0;
                    }
                });
            }
        });

        const stockNames = Array.from(stockSet).sort((a, b) => {
            const valueA = stockValues2025[a] || 0;
            const valueB = stockValues2025[b] || 0;
            return valueB - valueA;
        });

        const headers = ['visible', '股票名称', ...filteredYears, '操作'];

        const rows = stockNames.map((stockName) => {
            const row = [];

            row.push({ visibility: !hiddenStocks[stockName] });

            let symbol = '';
            for (let i = years.length - 1; i >= 0; i--) {
                const year = years[i];
                const stockInYear = yearData[year]?.stocks?.find((s) => s.name === stockName);
                if (stockInYear && stockInYear.symbol) {
                    symbol = stockInYear.symbol;
                    break;
                }
            }
            row.push({ name: stockName, symbol });

            filteredYears.forEach((year) => {
                if (yearData[year] && yearData[year].stocks) {
                    const stockInYear = yearData[year].stocks.find((s) => s.name === stockName);
                    row.push(stockInYear ? {
                        shares: stockInYear.shares,
                        price: stockInYear.price,
                        costPrice: stockInYear.costPrice,
                        symbol: stockInYear.symbol
                    } : null);
                } else {
                    row.push(null);
                }
            });

            row.push(null);

            return row;
        });

        const totalRow = ['', 'total', ...filteredYears.map(() => null), null];

        return { headers, rows, totalRow };
    }, [yearData, years, filteredYears, hiddenStocks]);

    const lineChartData = prepareLineChartData();
    const barChartData = preparePercentageBarChartData();
    const totalValues = calculateTotalValues();
    const table = tableData();

    const handleLegendClick = (data: { value: string }) => {
        const key = data.value === '总计' ? 'total' : data.value;
        setHiddenSeries((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    useEffect(() => {
        if (lastRefreshTime) {
            const timer = setTimeout(() => {
                setLastRefreshTime(null);
            }, 120000);
            return () => clearTimeout(timer);
        }
    }, [lastRefreshTime]);

    useEffect(() => {
        if (typeof window !== 'undefined' && !isLoggedIn) {
            localStorage.setItem('stockPortfolioData', JSON.stringify(yearData));
            localStorage.setItem('stockPortfolioYears', JSON.stringify(years));
            localStorage.setItem('stockPortfolioSelectedYear', selectedYear);
        }
    }, [yearData, years, selectedYear, isLoggedIn]);

    useEffect(() => {
        if (typeof window !== 'undefined' && !isLoggedIn) {
            const savedData = localStorage.getItem('stockPortfolioData');
            const savedYears = localStorage.getItem('stockPortfolioYears');
            const savedSelectedYear = localStorage.getItem('stockPortfolioSelectedYear');
            if (savedData) setYearData(JSON.parse(savedData));
            if (savedYears) setYears(JSON.parse(savedYears));
            if (savedSelectedYear) setSelectedYear(savedSelectedYear);
        }
    }, [isLoggedIn]);

    const handleReportClick = (year: string) => {
        setSelectedReportYear(year);
        setIsReportDialogOpen(true);
    };

    const calculateCumulativeInvested = (year: string) => {
        let cumulativeInvested = 0;
        const sortedYears = [...years].sort();
        for (const y of sortedYears) {
            if (y > year) break;

            if (yearData[y] && yearData[y].cashTransactions) {
                cumulativeInvested += yearData[y].cashTransactions.reduce(
                    (acc, tx) => acc + (tx.type === 'deposit' ? tx.amount : tx.type === 'withdraw' ? -tx.amount : 0),
                    0
                );
            }
        }
        return cumulativeInvested;
    };

    const handleCopyData = () => setIsCopyDialogOpen(true);
    const handlePasteData = () => setIsPasteDialogOpen(true);

    const confirmPasteData = () => {
        try {
            const pastedData = JSON.parse(pasteData);
            setYearData(pastedData);
            setYears(Object.keys(pastedData));
            setSelectedYear(Object.keys(pastedData)[Object.keys(pastedData).length - 1]);
            setAlertInfo({
                isOpen: true,
                title: '粘贴成功',
                description: '数据已成功粘贴并更新',
                onConfirm: () => setAlertInfo(null)
            });
            setIsPasteDialogOpen(false);
            setPasteData('');
        } catch (e) {
            setAlertInfo({
                isOpen: true,
                title: '粘贴失败',
                description: '粘贴的数据格式不正确',
                onCancel: () => setAlertInfo(null),
                cancelText: '关闭'
            });
        }
    };

    const calculateYearsToGoal = (currentAmount: number, goalAmount: number, returnRate: number) => {
        if (returnRate <= 0) return Infinity;
        const years = Math.log(goalAmount / currentAmount) / Math.log(1 + returnRate / 100);
        return Math.ceil(years);
    };

    const calculateRequiredReturnRate = (currentAmount: number, goalAmount: number, years: number) => {
        if (years <= 0) return Infinity;
        return (Math.pow(goalAmount / currentAmount, 1 / years) - 1) * 100;
    };

    const handleYearChange = useCallback((newYear: string) => {
        setSelectedYear(newYear);
    }, []);

    const calculateTotalInvestment = useCallback((upToYear: string) => {
        let total = 0;
        Object.keys(yearData)
            .filter(year => year <= upToYear)
            .forEach(year => {
                if (yearData[year]?.cashTransactions) {
                    yearData[year].cashTransactions.forEach(tx => {
                        if (tx.type === 'deposit') {
                            total += tx.amount;
                        } else if (tx.type === 'withdraw') {
                            total -= tx.amount;
                        }
                    });
                }
            });
        return total;
    }, [yearData]);

    const calculateInvestmentReturn = useCallback((selectedYear: string) => {
        const totalInvestment = calculateTotalInvestment(selectedYear);
        const portfolioValue = totalValues[selectedYear] || 0;
        const absoluteReturn = portfolioValue - totalInvestment;
        const percentageReturn = totalInvestment > 0 ? (absoluteReturn / totalInvestment) * 100 : 0;

        return {
            totalInvestment,
            portfolioValue,
            absoluteReturn,
            percentageReturn
        };
    }, [calculateTotalInvestment, totalValues]);


    return (
        <div className="p-4 max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <h1 className="text-2xl font-bold">股票投资组合追踪工具</h1>
                    {isLoggedIn && currentUser && (
                        <div className="text-sm text-gray-600">
                            欢迎, <span className="font-semibold">{currentUser.nickname || currentUser.username}</span>
                        </div>
                    )}
                </div>
                <div className="space-x-2">
                    {isLoggedIn ? (
                        <>
                            <Button onClick={handleSaveData}>保存数据</Button>
                            <Button onClick={() => {
                                // 初始化个人资料对话框的值
                                setNickname(currentUser?.nickname || '');
                                setEmail(currentUser?.email || '');
                                setNewPassword('');
                                setConfirmPassword('');
                                setProfileError('');

                                // 初始化退休目标相关字段
                                if (currentUser?.retirementGoal) setRetirementGoal(currentUser.retirementGoal);
                                if (currentUser?.annualReturn) setAnnualReturn(currentUser.annualReturn);
                                if (currentUser?.targetYears) setTargetYears(currentUser.targetYears);
                                if (currentUser?.calculationMode) setCalculationMode(currentUser.calculationMode);

                                setIsProfileDialogOpen(true);
                            }} variant="outline">个人资料</Button>
                            <Button onClick={handleLogout}>登出</Button>
                        </>
                    ) : (
                        <>
                            <Button onClick={() => setIsLoginDialogOpen(true)}>登录</Button>
                            <Button onClick={() => setIsRegisterDialogOpen(true)} variant="outline">注册</Button>
                        </>
                    )}
                </div>
            </div>
            {/* Login Dialog */}
            <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>登录</DialogTitle>
                        <DialogDescription>请输入用户名和密码</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            type="text"
                            placeholder="用户名"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <Input
                            type="password"
                            placeholder="密码"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {loginError && <p className="text-red-500">{loginError}</p>}
                    </div>
                    <DialogFooter>
                        <Button onClick={handleLogin}>登录</Button>
                        <Button variant="outline" onClick={() => {
                            setIsLoginDialogOpen(false);
                            setIsRegisterDialogOpen(true);
                        }}>注册新账号</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Register Dialog */}
            <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>注册新账号</DialogTitle>
                        <DialogDescription>请填写以下信息创建新账号</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            type="text"
                            placeholder="用户名"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <Input
                            type="password"
                            placeholder="密码"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Input
                            type="text"
                            placeholder="昵称（可选）"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                        />
                        <Input
                            type="email"
                            placeholder="电子邮箱（可选）"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <div>
                            <label className="text-sm font-medium">退休目标金额（可选）</label>
                            <Input
                                type="number"
                                placeholder="输入您的退休目标金额"
                                value={retirementGoal}
                                onChange={(e) => setRetirementGoal(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        {registerError && <p className="text-red-500">{registerError}</p>}
                    </div>
                    <DialogFooter>
                        <Button onClick={handleRegister}>注册</Button>
                        <Button variant="outline" onClick={() => {
                            setIsRegisterDialogOpen(false);
                            setIsLoginDialogOpen(true);
                        }}>返回登录</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Profile Dialog */}
            <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>个人资料</DialogTitle>
                        <DialogDescription>编辑您的个人信息</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">用户名</label>
                            <Input
                                type="text"
                                value={currentUser?.username || ''}
                                disabled
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">昵称</label>
                            <Input
                                type="text"
                                placeholder="设置昵称"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">电子邮箱</label>
                            <Input
                                type="email"
                                placeholder="设置电子邮箱"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">当前密码</label>
                            <Input
                                type="password"
                                placeholder="输入当前密码以验证身份"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                className="mt-1"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">新密码</label>
                            <Input
                                type="password"
                                placeholder="留空表示不修改"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">确认密码</label>
                            <Input
                                type="password"
                                placeholder="再次输入新密码"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">退休目标金额</label>
                            <Input
                                type="number"
                                placeholder="输入您的退休目标金额"
                                value={retirementGoal}
                                onChange={(e) => setRetirementGoal(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">预期年回报率 (%)</label>
                            <div className="flex gap-2 mt-1">
                                <Input
                                    type="number"
                                    placeholder="输入预期年回报率"
                                    value={annualReturn}
                                    onChange={(e) => setAnnualReturn(e.target.value)}
                                    className="w-full"
                                    step="0.1"
                                />
                                <TooltipProvider>
                                    <UITooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                onClick={() => {
                                                    const latestRate = getLatestYearGrowthRate();
                                                    if (latestRate) {
                                                        setAnnualReturn(latestRate);
                                                    }
                                                }}
                                                type="button"
                                                variant="outline"
                                                className="whitespace-nowrap"
                                            >
                                                使用平均年化回报率
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-sm">
                                            <p>平均年化回报率是从最早投资年份到最新年份的年化收益率。</p>
                                            <p>计算公式：(1 + r)^n = (1 + 总收益率)</p>
                                            <p>其中，r 是年化收益率，n 是投资年数，总收益率 = (当前总价值 / 初始总价值) - 1</p>
                                        </TooltipContent>
                                    </UITooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                        {profileError && <p className="text-red-500">{profileError}</p>}
                    </div>
                    <DialogFooter>
                        <Button onClick={handleUpdateProfile}>保存更改</Button>
                        <Button variant="outline" onClick={() => {
                            setIsProfileDialogOpen(false);
                            setProfileError('');
                            setOldPassword(''); // 重置旧密码
                            setNewPassword('');
                            setConfirmPassword('');
                            // 重置昵称和邮箱为当前用户的值
                            setNickname(currentUser?.nickname || '');
                            setEmail(currentUser?.email || '');
                        }}>取消</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Save Data Dialog */}
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>确认保存数据</DialogTitle>
                        <DialogDescription>
                            <p>以下是您将要保存的增量数据预览：</p>
                            <pre className="whitespace-pre-wrap max-h-96 overflow-y-auto">
                                {JSON.stringify(incrementalChanges, null, 2)}
                            </pre>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={confirmSaveData}>确定</Button>
                        <Button onClick={() => setIsSaveDialogOpen(false)}>取消</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h2 className="text-lg font-semibold mb-2">添加新年份</h2>
                        <div className="flex gap-2">
                            <Input type="text" placeholder="例如: 2025" value={newYear}
                                onChange={(e) => setNewYear(e.target.value)} className="flex-grow" />
                            <Button onClick={addNewYear}>添加年份</Button>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold mb-2">选择年份</h2>
                        <Select onValueChange={handleYearChange} value={selectedYear}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="选择年份" /></SelectTrigger>
                            <SelectContent>{years.map((year) => <SelectItem key={year}
                                value={year}>{year}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">添加/更新现金数量 ({selectedYear}年)</h2>
                    <div className="flex gap-2">
                        <Select onValueChange={(value) => setCashTransactionType(value as 'deposit' | 'withdraw')}
                            value={cashTransactionType}>
                            <SelectTrigger className="w-32"><SelectValue placeholder="类型" /></SelectTrigger>
                            <SelectContent><SelectItem value="deposit">存入</SelectItem><SelectItem
                                value="withdraw">取出</SelectItem></SelectContent>
                        </Select>
                        <Input type="number" placeholder="金额" value={cashTransactionAmount}
                            onChange={(e) => setCashTransactionAmount(e.target.value)} className="w-32" />
                        <Button onClick={addCashTransaction}>添加现金操作</Button>
                    </div>
                    <p className={cn('text-sm mt-2', (yearData[selectedYear]?.cashBalance || 0) < 0 ? 'text-red-500' : 'text-green-500')}>
                        现金余额: {formatLargeNumber(yearData[selectedYear]?.cashBalance || 0, currency)}
                    </p>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">添加/更新股票 ({selectedYear}年)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                        <Input type="text" placeholder="股票名称" value={newStockName}
                            onChange={(e) => setNewStockName(e.target.value)} list="stockNameList" />
                        <datalist id="stockNameList">{stockSymbols.map((item) => <option key={item.symbol}
                            value={item.name} />)}</datalist>
                        <Input type="text" placeholder="股票代码 (如 BABA)" value={newStockSymbol}
                            onChange={(e) => setNewStockSymbol(e.target.value)} list="stockSymbolList" />
                        <datalist id="stockSymbolList">{stockSymbols.map((item) => <option key={item.symbol}
                            value={item.symbol} />)}</datalist>
                        <Select onValueChange={(value) => setTransactionType(value as 'buy' | 'sell')}
                            value={transactionType}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="交易类型" /></SelectTrigger>
                            <SelectContent><SelectItem value="buy">买入</SelectItem><SelectItem
                                value="sell">卖出</SelectItem></SelectContent>
                        </Select>
                        <Input type="number" placeholder="交易股数" value={newShares}
                            onChange={(e) => setNewShares(e.target.value)} />
                        <Input type="number" placeholder="交易价格" value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)} step="0.01" />
                        <Input type="number" placeholder="当前价格（可选）" value={newYearEndPrice}
                            onChange={(e) => setNewYearEndPrice(e.target.value)} step="0.01" />
                    </div>
                    <Button onClick={confirmAddNewStock} className="mt-2">添加股票</Button>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">数据操作</h2>
                    <div className="flex gap-4">
                        <Button onClick={handleCopyData}>复制数据</Button>
                        <Button onClick={handlePasteData}>粘贴数据</Button>
                        <Button onClick={() => refreshPrices(true)} disabled={isLoading} className="flex items-center gap-2">
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> 刷新价格
                        </Button>
                    </div>
                    {priceData && Object.keys(priceData).length > 0 && (
                        <p className="text-xs mt-2 text-gray-500">最后更新时间: {Object.values(priceData)[0]?.lastUpdated || '未知'}</p>
                    )}
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-2">选择货币</h2>
                    <Select onValueChange={setCurrency} value={currency}>
                        <SelectTrigger className="w-32"><SelectValue placeholder="选择货币" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="HKD">HKD</SelectItem>
                            {exchangeRates['CNY'] && <SelectItem value="CNY">CNY</SelectItem>}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">投资总览</h2>
                <div className="p-6 border rounded-lg bg-white shadow-sm space-y-4">
                    <div className="flex items-center gap-4">
                        <span className="text-gray-600">选择对比年份：</span>
                        <Select onValueChange={setComparisonYear} value={comparisonYear}>
                            <SelectTrigger className="w-32">
                                <SelectValue placeholder="选择年份" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((year) => (
                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {(() => {
                        const result = calculateInvestmentReturn(comparisonYear);
                        return (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-1">
                                        <div className="text-sm text-gray-500">截至{comparisonYear}年累计投入</div>
                                        <TooltipProvider>
                                            <UITooltip>
                                                <TooltipTrigger>
                                                    <HelpCircle className="h-4 w-4 text-gray-400" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>从最早记录年份至{comparisonYear}年的净投入金额<br />（所有存入金额减去取出金额）
                                                    </p>
                                                </TooltipContent>
                                            </UITooltip>
                                        </TooltipProvider>
                                    </div>
                                    <div className="text-xl font-bold text-blue-600">
                                        {formatLargeNumber(result.totalInvestment, currency)}
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-500">{comparisonYear}年总持仓</div>
                                    <div className="text-xl font-bold text-blue-600">
                                        {formatLargeNumber(result.portfolioValue, currency)}
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-500">总收益金额</div>
                                    <div className={cn(
                                        "text-xl font-bold",
                                        result.absoluteReturn >= 0 ? "text-green-600" : "text-red-600"
                                    )}>
                                        {formatLargeNumber(result.absoluteReturn, currency)}
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-500">总收益率</div>
                                    <div className={cn(
                                        "text-xl font-bold",
                                        result.percentageReturn >= 0 ? "text-green-600" : "text-red-600"
                                    )}>
                                        {result.percentageReturn.toFixed(2)}%
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <div className="text-sm text-gray-500 mt-2">
                        * 总收益基于历史累计投入资金（存入减去取出）与选定年份的总持仓价值进行计算
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">总持仓概览</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.keys(totalValues).map((year) => (
                        <div
                            key={year}
                            className="p-4 border rounded-lg shadow bg-white cursor-pointer"
                            onClick={() => handleReportClick(year)}
                            data-testid={`report-button-${year}`}
                        >
                            <h3 className="text-lg font-medium">{year}年总持仓</h3>
                            <p className="text-2xl font-bold text-blue-600">{formatLargeNumber(totalValues[year], currency)}</p>
                            <GrowthInfo
                                year={year}
                                years={years}
                                yearData={yearData}
                                formatLargeNumber={formatLargeNumber}
                                currency={currency}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-8 p-6 border rounded-lg shadow bg-white">
                <h2 className="text-xl font-semibold mb-4">退休目标计算器</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">目标金额 ({currency})</label>
                            <Input
                                type="number"
                                value={retirementGoal}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setRetirementGoal(value);

                                    // 如果用户已登录，更新用户信息
                                    if (currentUser && isLoggedIn) {
                                        const updatedUser: User = {
                                            ...currentUser,
                                            retirementGoal: value,
                                        };
                                        localStorage.setItem('user', JSON.stringify(updatedUser));
                                        setCurrentUser(updatedUser);
                                    }
                                }}
                                placeholder="输入您的退休目标金额"
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium mb-1">计算模式</label>
                            <div className="flex gap-4">
                                <Button
                                    onClick={() => {
                                        setCalculationMode('rate');

                                        // 如果用户已登录，更新用户信息
                                        if (currentUser && isLoggedIn) {
                                            const updatedUser: User = {
                                                ...currentUser,
                                                calculationMode: 'rate',
                                            };
                                            localStorage.setItem('user', JSON.stringify(updatedUser));
                                            setCurrentUser(updatedUser);
                                        }
                                    }}
                                    className={cn(calculationMode === 'rate' ? 'bg-blue-500 text-white' : 'bg-gray-200')}
                                >
                                    输入年回报率
                                </Button>
                                <Button
                                    onClick={() => {
                                        setCalculationMode('years');

                                        // 如果用户已登录，更新用户信息
                                        if (currentUser && isLoggedIn) {
                                            const updatedUser: User = {
                                                ...currentUser,
                                                calculationMode: 'years',
                                            };
                                            localStorage.setItem('user', JSON.stringify(updatedUser));
                                            setCurrentUser(updatedUser);
                                        }
                                    }}
                                    className={cn(calculationMode === 'years' ? 'bg-blue-500 text-white' : 'bg-gray-200')}
                                >
                                    输入目标年限
                                </Button>
                            </div>
                        </div>
                        <div>
                            {calculationMode === 'rate' ? (
                                <div>
                                    <label className="block text-sm font-medium mb-1">预期年回报率 (%)</label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            value={annualReturn}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setAnnualReturn(value);

                                                // 如果用户已登录，更新用户信息
                                                if (currentUser && isLoggedIn) {
                                                    const updatedUser: User = {
                                                        ...currentUser,
                                                        annualReturn: value,
                                                    };
                                                    localStorage.setItem('user', JSON.stringify(updatedUser));
                                                    setCurrentUser(updatedUser);
                                                }
                                            }}
                                            placeholder="输入预期年回报率"
                                            className="w-full"
                                            step="0.1"
                                        />
                                        <TooltipProvider>
                                            <UITooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        onClick={() => {
                                                            const latestRate = getLatestYearGrowthRate();
                                                            if (latestRate) {
                                                                setAnnualReturn(latestRate);

                                                                // 如果用户已登录，更新用户信息
                                                                if (currentUser && isLoggedIn) {
                                                                    const updatedUser: User = {
                                                                        ...currentUser,
                                                                        annualReturn: latestRate,
                                                                    };
                                                                    localStorage.setItem('user', JSON.stringify(updatedUser));
                                                                    setCurrentUser(updatedUser);
                                                                }
                                                            }
                                                        }}
                                                        type="button"
                                                        variant="outline"
                                                        className="whitespace-nowrap"
                                                    >
                                                        使用平均年化回报率
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-sm">
                                                    <p>平均年化回报率是从最早投资年份到最新年份的年化收益率。</p>
                                                    <p>计算公式：(1 + r)^n = (1 + 总收益率)</p>
                                                    <p>其中，r 是年化收益率，n 是投资年数，总收益率 = (当前总价值 / 初始总价值) - 1</p>
                                                </TooltipContent>
                                            </UITooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium mb-1">目标年限 (年)</label>
                                    <Input
                                        type="number"
                                        value={targetYears}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setTargetYears(value);

                                            // 如果用户已登录，更新用户信息
                                            if (currentUser && isLoggedIn) {
                                                const updatedUser: User = {
                                                    ...currentUser,
                                                    targetYears: value,
                                                };
                                                localStorage.setItem('user', JSON.stringify(updatedUser));
                                                setCurrentUser(updatedUser);
                                            }
                                        }}
                                        placeholder="输入目标年限"
                                        className="w-full"
                                        step="1"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-medium mb-3">计算结果</h3>
                        {(() => {
                            const currentAmount = totalValues[latestYear] || 0;
                            const goalAmount = parseFloat(retirementGoal);

                            if (!goalAmount || isNaN(goalAmount)) {
                                return <p className="text-gray-500">请输入目标金额</p>;
                            }

                            if (calculationMode === 'rate') {
                                const returnRate = parseFloat(annualReturn);
                                if (!returnRate || isNaN(returnRate)) {
                                    return <p className="text-gray-500">请输入预期年回报率</p>;
                                }
                                const yearsNeeded = calculateYearsToGoal(currentAmount, goalAmount, returnRate);

                                return (
                                    <div className="space-y-2">
                                        <p>当前总资产: <span
                                            className="font-semibold">{formatLargeNumber(currentAmount, currency)}</span>
                                        </p>
                                        <p>目标金额: <span
                                            className="font-semibold">{formatLargeNumber(goalAmount, currency)}</span>
                                        </p>
                                        <p>差距金额: <span
                                            className="font-semibold">{formatLargeNumber(goalAmount - currentAmount, currency)}</span>
                                        </p>
                                        <p>预期年回报率: <span className="font-semibold">{returnRate}%</span></p>
                                        {yearsNeeded === Infinity ? (
                                            <p className="text-red-500">无法达到目标（回报率过低）</p>
                                        ) : yearsNeeded === 0 ? (
                                            <p className="text-green-500">已达到目标！</p>
                                        ) : (
                                            <p>预计需要 <span
                                                className="font-semibold text-blue-600">{yearsNeeded.toFixed(1)}</span> 年可达到目标
                                            </p>
                                        )}
                                    </div>
                                );
                            } else {
                                const years = parseFloat(targetYears);
                                if (!years || isNaN(years)) {
                                    return <p className="text-gray-500">请输入目标年限</p>;
                                }
                                const requiredRate = calculateRequiredReturnRate(currentAmount, goalAmount, years);

                                return (
                                    <div className="space-y-2">
                                        <p>当前总资产: <span
                                            className="font-semibold">{formatLargeNumber(currentAmount, currency)}</span>
                                        </p>
                                        <p>目标金额: <span
                                            className="font-semibold">{formatLargeNumber(goalAmount, currency)}</span>
                                        </p>
                                        <p>差距金额: <span
                                            className="font-semibold">{formatLargeNumber(goalAmount - currentAmount, currency)}</span>
                                        </p>
                                        <p>目标年限: <span className="font-semibold">{years}</span> 年</p>
                                        {currentAmount >= goalAmount ? (
                                            <p className="text-green-500">已达到目标！</p>
                                        ) : requiredRate > 100 ? (
                                            <p className="text-red-500">年限过短，需要的回报率过高（超过100%）</p>
                                        ) : (
                                            <p>需要年回报率: <span
                                                className="font-semibold text-blue-600">{requiredRate.toFixed(2)}%</span>
                                            </p>
                                        )}
                                    </div>
                                );
                            }
                        })()}
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">图表类型</h2>
                <div className="flex gap-4 mb-4">
                    <Button onClick={() => setShowPositionChart(true)}
                        className={cn('px-4 py-2 rounded', showPositionChart ? 'bg-blue-500 text-white' : 'bg-gray-200')}>
                        仓位变化图（折线图）
                    </Button>
                    <Button onClick={() => setShowPositionChart(false)}
                        className={cn('px-4 py-2 rounded', !showPositionChart ? 'bg-blue-500 text-white' : 'bg-gray-200')}>
                        股票占比图（柱状图）
                    </Button>
                </div>
                <h2 className="text-xl font-semibold mb-4">{showPositionChart ? '各股票仓位变化（按年）' : '各股票仓位占比（按年）'}</h2>
                <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {showPositionChart ? (
                            <LineChart data={lineChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis tickCount={5} tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => {
                                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                                        return value.toFixed(0);
                                    }} />
                                <Tooltip
                                    formatter={(value: number, name: string) => [
                                        formatLargeNumber(value, currency),
                                        name === 'total' ? '总计' : name
                                    ]}
                                    labelFormatter={(label) => `${label}年`}
                                />
                                <Legend onClick={handleLegendClick} formatter={(value) => value === 'total' ? '总计' : value} />
                                {Object.keys(lineChartData[0] || {})
                                    .filter((key) => key !== 'year')
                                    .filter((stockName) => !hiddenStocks[stockName])
                                    .map((stock, index) => (
                                        <Line
                                            key={stock}
                                            type="monotone"
                                            dataKey={stock}
                                            name={stock === 'total' ? '总计' : stock}
                                            hide={!!hiddenSeries[stock]}
                                            stroke={['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'][index % 5]}
                                            strokeWidth={stock === 'total' ? 3 : 1.5}
                                        />
                                    ))}
                            </LineChart>
                        ) : (
                            <BarChart data={barChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis
                                    tickFormatter={(value: number) => `${value.toFixed(0)}%`}
                                    domain={[0, 100]}
                                />
                                <Tooltip
                                    formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, `${name}年占比`]}
                                    labelFormatter={(label) => `${label}`}
                                />
                                <Legend onClick={handleLegendClick} formatter={(value) => value === 'total' ? '总计' : value} />
                                {years
                                    .map((year, index) => (
                                        <Bar
                                            key={year}
                                            dataKey={year}
                                            name={`${year}年占比`}
                                            hide={!!hiddenSeries[year]}
                                            fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'][index % 5]}
                                        />
                                    ))}
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">持仓明细表</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">年份筛选：</span>
                        <div className="w-64">
                            <YearFilter
                                options={[
                                    { label: '全部年份', value: 'all' },
                                    ...years.map(year => ({ label: year, value: year }))
                                ]}
                                selected={filteredYears.length === years.length ? ['all'] : filteredYears}
                                onChange={(selected) => {
                                    if (selected.includes('all')) {
                                        handleYearFilterChange('all');
                                    } else if (selected.length === 0) {
                                        // 如果没有选择任何年份，默认显示所有年份
                                        handleYearFilterChange('all');
                                    } else {
                                        setFilteredYears(selected.sort((a, b) => parseInt(b) - parseInt(a)));
                                    }
                                }}
                                placeholder="选择年份"
                            />
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto relative">
                    <table className="min-w-full border-collapse border border-gray-300">
                        <colgroup>
                            <col style={{ width: '50px' }} />
                            <col style={{ width: '200px' }} />
                            {filteredYears.map((year) => (
                                <col key={year} />
                            ))}
                            <col style={{ width: '100px' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th className="sticky left-0 z-20 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-100">
                                    {table.headers[0]}
                                </th>
                                <th className="sticky left-[50px] z-20 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-100">
                                    {table.headers[1]}
                                </th>
                                {table.headers.slice(2, -1).map((header, index) => (
                                    <th key={index}
                                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-50">
                                        {header}
                                    </th>
                                ))}
                                <th className="sticky right-0 z-20 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-100">
                                    {table.headers[table.headers.length - 1]}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {table.rows.map((row, rowIndex) => {
                                const stockName = (row[1] as { name: string }).name;
                                const isHidden = hiddenStocks[stockName];

                                return (
                                    <tr key={rowIndex} className={cn(
                                        rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                                        isHidden && 'opacity-50'
                                    )}>
                                        <td className="sticky left-0 z-10 px-6 py-4 whitespace-nowrap text-center bg-inherit">
                                            <Button
                                                size="icon"
                                                onClick={() => toggleStockVisibility(stockName)}
                                                className="text-gray-500 hover:text-gray-700"
                                                data-testid={`visibility-${stockName}`}
                                                aria-label="可见性"
                                            >
                                                {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </td>
                                        <td className="sticky left-[50px] z-10 px-6 py-4 whitespace-nowrap bg-inherit">
                                            {editingStockName === stockName ? (
                                                <div className="space-y-2">
                                                    <div><label className="text-sm">股票名称</label>
                                                        <Input type="text" value={stockName} disabled className="w-32" />
                                                    </div>
                                                    <div><label className="text-sm">股票代码</label>
                                                        <Input type="text"
                                                            value={editedRowData?.[selectedYear]?.symbol || (row[1] as {
                                                                symbol?: string
                                                            }).symbol || ''}
                                                            onChange={(e) => handleInputChange(selectedYear, 'symbol', e.target.value)}
                                                            className="w-32" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="font-medium">{(row[1] as { name: string }).name}</div>
                                                    {(row[1] as { symbol?: string }).symbol && (
                                                        <div className="text-sm text-gray-500">{(row[1] as {
                                                            symbol?: string
                                                        }).symbol}</div>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                        {row.slice(2, -1).map((cell, cellIndex) => {
                                            const year = years[cellIndex];
                                            const isEditing = editingStockName === stockName;

                                            if (isEditing) {
                                                return (
                                                    <td key={cellIndex} className="px-6 py-4 whitespace-nowrap space-y-1 bg-inherit">
                                                        <div><label className="text-sm">数量</label><Input type="number" value={editedRowData?.[year]?.quantity || ''} onChange={(e) => handleInputChange(year, 'quantity', e.target.value)} className="w-24" data-testid={`quantity-input-${year}`} /></div>
                                                        <div><label className="text-sm">价格</label><Input type="number" value={editedRowData?.[year]?.unitPrice || ''} onChange={(e) => handleInputChange(year, 'unitPrice', e.target.value)} className="w-24" /></div>
                                                        <div><label className="text-sm">成本</label><Input type="number" value={editedRowData?.[year]?.costPrice || ''} onChange={(e) => handleInputChange(year, 'costPrice', e.target.value)} className="w-24" /></div>
                                                    </td>
                                                );
                                            } else if (cell) {
                                                const stockData = (cell as unknown) as TableCell;
                                                const { shares, price, costPrice, symbol } = stockData;

                                                const isLatestPrice = year === latestYear && lastRefreshTime
                                                    ? (new Date().getTime() - lastRefreshTime.getTime()) / 1000 < 120
                                                    : false;

                                                return (
                                                    <td key={cellIndex} className="px-6 py-4 whitespace-nowrap space-y-1 bg-inherit">
                                                        <div className="font-medium">
                                                            当前价值: {shares !== undefined && price !== undefined ?
                                                                `${formatLargeNumber(shares * price, currency)} (${shares} * ${formatLargeNumber(price, currency)})`
                                                                : 'N/A'}
                                                            {isLatestPrice && <span className="ml-2 text-xs text-green-500">实时</span>}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            成本: {shares !== undefined && costPrice !== undefined ?
                                                                `${formatLargeNumber(shares * costPrice, currency)} (${shares} * ${formatLargeNumber(costPrice, currency)})`
                                                                : 'N/A'}
                                                        </div>
                                                    </td>
                                                );
                                            } else {
                                                return <td key={cellIndex} className="px-6 py-4 whitespace-nowrap bg-inherit"> - </td>;
                                            }
                                        })}
                                        <td className="sticky right-0 z-10 px-6 py-4 whitespace-nowrap space-x-2 bg-inherit">
                                            {editingStockName === stockName ? (
                                                <Button
                                                    size="icon"
                                                    onClick={() => handleSaveRow(stockName)}
                                                    className="text-green-500 hover:text-green-700"
                                                    data-testid={`save-${stockName}`}
                                                >
                                                    <Save className="h-4 w-4" />
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="icon"
                                                    onClick={() => handleEditRow(stockName)}
                                                    className="text-blue-500 hover:text-blue-700"
                                                    data-testid={`edit-${stockName}`}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                size="icon"
                                                onClick={() => handleDeleteStock(stockName)}
                                                className="text-red-500 hover:text-red-700"
                                                data-testid={`delete-${stockName}`}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td className="sticky left-0 z-10 px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider bg-gray-100">
                                    {table.totalRow[0]}
                                </td>
                                <td className="sticky left-[50px] z-10 px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider bg-gray-100">
                                    {table.totalRow[1]}
                                </td>
                                {filteredYears.map((year, index) => (
                                    <td key={year}
                                        className="px-6 py-3 text-center text-sm font-semibold uppercase tracking-wider bg-gray-100">
                                        {yearData[year] && yearData[year].stocks
                                            ? formatLargeNumber(
                                                yearData[year].stocks.reduce(
                                                    (acc, stock) => hiddenStocks[stock.name] ? acc : acc + stock.shares * stock.price,
                                                    0
                                                ) + (yearData[year].cashBalance || 0),
                                                currency
                                            )
                                            : '-'}
                                    </td>
                                ))}
                                <td className="sticky right-0 z-10 px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider bg-gray-100">
                                    {table.totalRow[table.totalRow.length - 1]}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <ReportDialog
                isOpen={isReportDialogOpen}
                onOpenChange={setIsReportDialogOpen}
                selectedYear={selectedReportYear}
                yearData={yearData}
                hiddenStocks={hiddenStocks}
                formatLargeNumber={formatLargeNumber}
                currency={currency}
                totalPortfolioValue={selectedReportYear ? (yearData[selectedReportYear]?.stocks?.reduce(
                    (acc, stock) => hiddenStocks[stock.name] ? acc : acc + stock.shares * stock.price, 0
                ) || 0) + (yearData[selectedReportYear]?.cashBalance || 0) : 0}
                cumulativeInvested={selectedReportYear ? calculateCumulativeInvested(selectedReportYear) : 0}
                currentUser={currentUser}
            />

            <Dialog open={alertInfo?.isOpen} onOpenChange={(open) => {
                if (!open) setAlertInfo(null);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{alertInfo?.title}</DialogTitle>
                        <DialogDescription>
                            <pre className="whitespace-pre-wrap">{alertInfo?.description}</pre>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end space-x-2">
                        {alertInfo?.onConfirm && (
                            <Button onClick={alertInfo.onConfirm}>
                                {alertInfo.confirmText || '确定'}
                            </Button>
                        )}
                        {alertInfo?.onCancel && (
                            <Button onClick={alertInfo.onCancel}>
                                {alertInfo.cancelText || '取消'}
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>复制数据</DialogTitle>
                        <DialogDescription>
                            <p>请点击下方文本框，使用 Command + A 全选内容，或直接点击"复制到剪贴板"按钮。</p>
                            <textarea className="w-full h-64 p-2 mt-2 border rounded resize-none"
                                value={JSON.stringify(yearData, null, 2)} readOnly />
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end space-x-2">
                        <Button
                            onClick={() => navigator.clipboard.writeText(JSON.stringify(yearData, null, 2))}>复制到剪贴板</Button>
                        <Button onClick={() => setIsCopyDialogOpen(false)}>关闭</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isPasteDialogOpen} onOpenChange={setIsPasteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>粘贴数据</DialogTitle>
                        <DialogDescription>
                            <textarea className="w-full h-32 p-2 border rounded" value={pasteData}
                                onChange={(e) => setPasteData(e.target.value)}
                                placeholder="请将数据粘贴到此处..." />
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end space-x-2">
                        <Button onClick={confirmPasteData}>确认</Button>
                        <Button onClick={() => setIsPasteDialogOpen(false)}>取消</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default StockPortfolioTracker;
