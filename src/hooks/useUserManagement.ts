import { useState, useCallback, useRef } from 'react';
import { User, YearData } from '@/types/stock';

interface AlertInfo {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const useUserManagement = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState<AlertInfo | null>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backendDomain = "//stock-backend-tau.vercel.app";

  const fetchJsonData = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${backendDomain}/api/data`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log("用户数据不存在，将使用默认数据");
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        console.log("成功获取用户数据");
        return result.data;
      } else {
        console.log("用户数据为空，将使用默认数据");
        return null;
      }
    } catch (error) {
      console.error("获取数据失败:", error);
      throw error;
    }
  }, []);

  const saveDataToBackend = useCallback(async (
    yearData: { [year: string]: YearData },
    userSettings: any
  ) => {
    if (!isLoggedIn || !currentUser?.token) {
      return;
    }

    try {
      const dataToSave = {
        yearData,
        userSettings,
        lastUpdated: new Date().toISOString(),
      };

      const response = await fetch(`${backendDomain}/api/data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        console.log("数据保存成功");
      } else {
        console.error("数据保存失败:", result.message);
      }
    } catch (error) {
      console.error("保存数据到后端失败:", error);
    }
  }, [isLoggedIn, currentUser]);

  const debouncedSave = useCallback((
    yearData: { [year: string]: YearData },
    userSettings: any
  ) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveDataToBackend(yearData, userSettings);
    }, 2000); // 2秒延迟保存
  }, [saveDataToBackend]);

  return {
    isLoggedIn,
    setIsLoggedIn,
    currentUser,
    setCurrentUser,
    isMoreMenuOpen,
    setIsMoreMenuOpen,
    alertInfo,
    setAlertInfo,
    saveTimeoutRef,
    backendDomain,
    fetchJsonData,
    saveDataToBackend,
    debouncedSave,
  };
};
