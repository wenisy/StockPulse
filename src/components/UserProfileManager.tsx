import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { User } from '@/types/stock';
import RetirementCalculator from './RetirementCalculator';
import { useUserSettings } from '@/hooks/useUserSettings';

interface AlertInfo {
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
}

interface UserProfileManagerProps {
    isLoggedIn: boolean;
    currentUser: User | null;
    setCurrentUser: (user: User | null) => void;
    setIsLoggedIn: (isLoggedIn: boolean) => void;
    setAlertInfo: (alertInfo: AlertInfo | null) => void;
    onDataFetch?: (token: string) => Promise<void>;
    onRefreshPrices?: (showAlert: boolean) => Promise<void>;
    currency: string;
    latestYear: string;
    totalValues: { [year: string]: number };
    formatLargeNumber: (value: number, currency?: string) => string;
    getLatestYearGrowthRate: () => string | null;
    onCloseParentMenu?: () => void; // 新增：关闭父级菜单的回调
}

const UserProfileManager: React.FC<UserProfileManagerProps> = ({
    isLoggedIn,
    currentUser,
    setCurrentUser,
    setIsLoggedIn,
    setAlertInfo,
    onDataFetch,
    onRefreshPrices,
    currency,
    latestYear,
    totalValues,
    formatLargeNumber,
    getLatestYearGrowthRate,
    onCloseParentMenu
}) => {
    // 对话框状态
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
    const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
    
    // 表单字段
    const [username, setUsername] = useState('');
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    
    // 错误信息
    const [loginError, setLoginError] = useState('');
    const [registerError, setRegisterError] = useState('');
    const [profileError, setProfileError] = useState('');

    // 使用自定义Hook管理退休目标计算器相关状态
    const {
        retirementGoal,
        annualReturn,
        targetYears,
        calculationMode,
        updateRetirementGoal,
        updateAnnualReturn,
        updateTargetYears,
        updateCalculationMode,
        loadUserSettings
    } = useUserSettings(currentUser, isLoggedIn, setCurrentUser);

    const backendDomain = "//stock-backend-tau.vercel.app";

    // --- Login Function ---
    const handleLogin = async () => {
        try {
            if (!username || !password) {
                setLoginError('用户名和密码为必填项');
                return;
            }

            const response = await fetch(`${backendDomain}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password,
                }),
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
                    loadUserSettings(user);
                }

                setIsLoggedIn(true);
                setIsLoginDialogOpen(false);
                setLoginError('');
                
                if (onDataFetch) {
                    await onDataFetch(data.token);
                }
                
                if (onRefreshPrices) {
                    await onRefreshPrices(false);
                }
                
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
                    loadUserSettings(user);

                    // 直接设置为登录状态
                    setIsLoggedIn(true);
                    setIsRegisterDialogOpen(false);
                    setRegisterError('');
                    setUsername('');
                    setPassword('');
                    setEmail('');

                    // 加载数据
                    if (onDataFetch) {
                        await onDataFetch(data.token);
                    }
                    
                    if (onRefreshPrices) {
                        await onRefreshPrices(false);
                    }

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
        
        // 通知父组件用户已登出
        setAlertInfo({
            isOpen: true,
            title: '已登出',
            description: '您已成功登出系统',
            onConfirm: () => setAlertInfo(null),
        });
    };

    // 打开个人资料对话框
    const openProfileDialog = () => {
        // 初始化个人资料对话框的值
        setNickname(currentUser?.nickname || '');
        setEmail(currentUser?.email || '');
        setNewPassword('');
        setConfirmPassword('');
        setProfileError('');

        // 初始化退休目标相关字段
        loadUserSettings(currentUser);

        setIsProfileDialogOpen(true);
    };

    return (
        <>
            <div className="space-x-2">
                {isLoggedIn ? (
                    <>
                        <Button onClick={openProfileDialog} variant="outline">个人资料</Button>
                        <Button onClick={handleLogout}>登出</Button>
                    </>
                ) : (
                    <>
                        <Button onClick={() => {
                            onCloseParentMenu?.(); // 先关闭父级菜单
                            setIsLoginDialogOpen(true);
                        }}>登录</Button>
                        <Button onClick={() => {
                            onCloseParentMenu?.(); // 先关闭父级菜单
                            setIsRegisterDialogOpen(true);
                        }} variant="outline">注册</Button>
                    </>
                )}
            </div>

            {/* Login Dialog */}
            <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
                <DialogContent
                    className="w-[95vw] max-w-md"
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>登录</DialogTitle>
                        <DialogDescription>请输入用户名和密码</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            ref={(el) => {
                                if (el && isLoginDialogOpen) {
                                    // 延迟focus以确保对话框完全打开
                                    setTimeout(() => el.focus(), 100);
                                }
                            }}
                            type="text"
                            placeholder="用户名"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    // 如果用户名已填写，跳转到密码框
                                    if (username) {
                                        const passwordInput = e.currentTarget.parentElement?.querySelector('input[type="password"]') as HTMLInputElement;
                                        passwordInput?.focus();
                                    }
                                }
                            }}
                        />
                        <Input
                            type="password"
                            placeholder="密码"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && username && password) {
                                    handleLogin();
                                }
                            }}
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
                            <label className="text-sm font-medium">退休目标计算器设置（可选）</label>
                            <div className="mt-2">
                                <RetirementCalculator
                                    retirementGoal={retirementGoal}
                                    annualReturn={annualReturn}
                                    targetYears={targetYears}
                                    calculationMode={calculationMode}
                                    currency={currency}
                                    currentAmount={totalValues[latestYear] || 0}
                                    onRetirementGoalChange={updateRetirementGoal}
                                    onAnnualReturnChange={updateAnnualReturn}
                                    onTargetYearsChange={updateTargetYears}
                                    onCalculationModeChange={updateCalculationMode}
                                    onUseAverageReturn={() => {
                                        const latestRate = getLatestYearGrowthRate();
                                        if (latestRate) {
                                            updateAnnualReturn(latestRate);
                                        }
                                    }}
                                    formatLargeNumber={(value, curr) => formatLargeNumber(value, curr || currency)}
                                    compact={true}
                                />
                            </div>
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
                            <label className="text-sm font-medium">退休目标计算器设置</label>
                            <div className="mt-2">
                                <RetirementCalculator
                                    retirementGoal={retirementGoal}
                                    annualReturn={annualReturn}
                                    targetYears={targetYears}
                                    calculationMode={calculationMode}
                                    currency={currency}
                                    currentAmount={totalValues[latestYear] || 0}
                                    onRetirementGoalChange={updateRetirementGoal}
                                    onAnnualReturnChange={updateAnnualReturn}
                                    onTargetYearsChange={updateTargetYears}
                                    onCalculationModeChange={updateCalculationMode}
                                    onUseAverageReturn={() => {
                                        const latestRate = getLatestYearGrowthRate();
                                        if (latestRate) {
                                            updateAnnualReturn(latestRate);
                                        }
                                    }}
                                    formatLargeNumber={(value, curr) => formatLargeNumber(value, curr || currency)}
                                    compact={true}
                                />
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
        </>
    );
};

export default UserProfileManager;
