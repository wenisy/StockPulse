/**
 * useStockOperations —— 聚合 hook（向下兼容门面）
 *
 * 组合 useStockForm（表单 + 交易提交）+ useStockRowEdit（行编辑 + 删除），
 * 保持对外 API 与重构前完全一致，StockPortfolioTracker 组件零改动。
 */
import { AlertInfo, IncrementalChanges, User, YearData } from '@/types/stock';
import { useStockForm } from './useStockForm';
import { useStockRowEdit } from './useStockRowEdit';

// 重新导出 EditedRowData 类型（组件层可能依赖它）
export type { EditedRowData } from './useStockRowEdit';

export interface UseStockOperationsProps {
  yearData: { [year: string]: YearData };
  setYearData: React.Dispatch<React.SetStateAction<{ [year: string]: YearData }>>;
  setIncrementalChanges: React.Dispatch<React.SetStateAction<IncrementalChanges>>;
  setAlertInfo: (info: AlertInfo | null) => void;
  currentUser: User | null;
  years: string[];
}

export function useStockOperations({
  yearData,
  setYearData,
  setIncrementalChanges,
  setAlertInfo,
  currentUser,
  years,
}: UseStockOperationsProps) {
  const form = useStockForm({
    yearData,
    setYearData,
    setIncrementalChanges,
    setAlertInfo,
    currentUser,
  });

  const rowEdit = useStockRowEdit({
    yearData,
    setYearData,
    setIncrementalChanges,
    setAlertInfo,
    currentUser,
    years,
  });

  return {
    // 表单状态
    newStockName: form.newStockName,
    setNewStockName: form.setNewStockName,
    newShares: form.newShares,
    setNewShares: form.setNewShares,
    newPrice: form.newPrice,
    setNewPrice: form.setNewPrice,
    newYearEndPrice: form.newYearEndPrice,
    setNewYearEndPrice: form.setNewYearEndPrice,
    newStockSymbol: form.newStockSymbol,
    setNewStockSymbol: form.setNewStockSymbol,
    transactionType: form.transactionType,
    setTransactionType: form.setTransactionType,

    // 编辑状态
    editingStockName: rowEdit.editingStockName,
    editedRowData: rowEdit.editedRowData,

    // 方法
    resetForm: form.resetForm,
    confirmAddNewStock: form.confirmAddNewStock,
    handleEditRow: rowEdit.handleEditRow,
    handleSaveRow: rowEdit.handleSaveRow,
    handleInputChange: rowEdit.handleInputChange,
    handleDeleteStock: rowEdit.handleDeleteStock,
  };
}
