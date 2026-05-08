'use client';

import { useRef } from 'react';
import { User as UserIcon, LogIn } from 'lucide-react';
import UserProfileManager, {
  type UserProfileManagerHandle,
} from '@/components/UserProfileManager';
import { usePortfolio } from './PortfolioContext';
import { cn } from '@/lib/utils';

/**
 * 顶栏右侧用户入口。复用 UserProfileManager 的命令式 ref API，不改签名。
 * 未登录：显示"登录"按钮；已登录：显示头像，点击打开资料弹窗。
 */
export function UserPanelSlot() {
  const { trackerState, portfolioData, chartData } = usePortfolio();
  const profileRef = useRef<UserProfileManagerHandle>(null);

  const { isLoggedIn, currentUser, setCurrentUser, setIsLoggedIn, setAlertInfo, currency } =
    trackerState;
  const { refreshPrices, fetchJsonData, formatLargeNumber, latestYear } = portfolioData;
  const { totalValues, getLatestYearGrowthRate } = chartData;

  const handleClick = () => {
    if (isLoggedIn) {
      profileRef.current?.openProfileDialog();
    } else {
      profileRef.current?.openLoginDialog();
    }
  };

  const initial = currentUser?.username?.charAt(0)?.toUpperCase() ?? '';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={isLoggedIn ? '个人资料' : '登录'}
        className={cn(
          'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-[var(--motion-fast)]',
          'hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        )}
      >
        {isLoggedIn ? (
          <>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-brand-fg text-xs font-semibold">
              {initial || <UserIcon className="h-3.5 w-3.5" aria-hidden />}
            </span>
            <span className="hidden text-fg md:inline">
              {currentUser?.username ?? '账户'}
            </span>
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4 text-fg-muted" aria-hidden />
            <span className="text-fg">登录</span>
          </>
        )}
      </button>

      {/* 隐藏挂载点 —— UserProfileManager 的按钮 UI 不渲染，只复用其 Dialog 管理能力 */}
      <div className="hidden">
        <UserProfileManager
          ref={profileRef}
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          setIsLoggedIn={setIsLoggedIn}
          setAlertInfo={setAlertInfo}
          onDataFetch={fetchJsonData}
          onRefreshPrices={refreshPrices}
          currency={currency}
          latestYear={latestYear}
          totalValues={totalValues}
          formatLargeNumber={(value, curr) => formatLargeNumber(value, curr || currency)}
          getLatestYearGrowthRate={getLatestYearGrowthRate}
        />
      </div>
    </>
  );
}
