"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, MoreHorizontal } from "lucide-react";
import { User, AlertInfo } from "@/types/stock";
import UserProfileManager, { UserProfileManagerHandle } from "./UserProfileManager";

interface PortfolioHeaderProps {
  isLoggedIn: boolean;
  currentUser: User | null;
  isLoading: boolean;
  currency: string;
  latestYear: string;
  totalValues: { [year: string]: number };
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  setAlertInfo: (info: AlertInfo | null) => void;
  onRefreshPrices: (isManual: boolean) => Promise<void>;
  onDataFetch: (token: string) => Promise<void>;
  formatLargeNumber: (value: number, currency?: string) => string;
  getLatestYearGrowthRate: () => string;
}

const PortfolioHeader: React.FC<PortfolioHeaderProps> = ({
  isLoggedIn,
  currentUser,
  isLoading,
  currency,
  latestYear,
  totalValues,
  setCurrentUser,
  setIsLoggedIn,
  setAlertInfo,
  onRefreshPrices,
  onDataFetch,
  formatLargeNumber,
  getLatestYearGrowthRate,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const userProfileRef = useRef<UserProfileManagerHandle>(null);

  // 点击外部关闭更多菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMoreMenuOpen) {
        const target = event.target as Element;
        if (!target.closest(".more-menu-container")) {
          setIsMoreMenuOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMoreMenuOpen]);

  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <h1 className="text-2xl font-bold">股票投资组合追踪工具</h1>
        {isLoggedIn && currentUser && (
          <div className="text-sm text-gray-600">
            欢迎,{" "}
            <span className="font-semibold">
              {currentUser.nickname || currentUser.username}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2">
        {/* 大屏幕显示所有按钮 */}
        <div className="hidden md:flex items-center space-x-2">
          <Button
            onClick={() => onRefreshPrices(true)}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />{" "}
            刷新价格
          </Button>
          <UserProfileManager
            ref={userProfileRef}
            isLoggedIn={isLoggedIn}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            setIsLoggedIn={setIsLoggedIn}
            setAlertInfo={setAlertInfo}
            onDataFetch={onDataFetch}
            onRefreshPrices={onRefreshPrices}
            currency={currency}
            latestYear={latestYear}
            totalValues={totalValues}
            formatLargeNumber={(value, curr) =>
              formatLargeNumber(value, curr || currency)
            }
            getLatestYearGrowthRate={getLatestYearGrowthRate}
            onCloseParentMenu={() => {}}
          />
        </div>

        {/* 小屏幕显示更多菜单按钮 */}
        <div className="md:hidden relative more-menu-container">
          <Button
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className="flex items-center gap-2"
            variant="outline"
          >
            <MoreHorizontal className="h-4 w-4" />
            更多
          </Button>

          {/* 下拉菜单 */}
          {isMoreMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
              <div className="py-1">
                <button
                  onClick={() => {
                    onRefreshPrices(true);
                    setIsMoreMenuOpen(false);
                  }}
                  disabled={isLoading}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                  刷新价格
                </button>
                <div className="border-t border-gray-200 my-1"></div>
                {!isLoggedIn ? (
                  <>
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setTimeout(
                          () => userProfileRef.current?.openLoginDialog(),
                          0
                        );
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      登录
                    </button>
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setTimeout(
                          () => userProfileRef.current?.openRegisterDialog(),
                          0
                        );
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      注册
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setTimeout(
                          () => userProfileRef.current?.openProfileDialog(),
                          0
                        );
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      个人资料
                    </button>
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        userProfileRef.current?.logout();
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      登出
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortfolioHeader;
