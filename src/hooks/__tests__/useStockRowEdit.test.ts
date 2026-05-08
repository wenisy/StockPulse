import { renderHook, act } from '@testing-library/react';
import { useStockRowEdit } from '../useStockRowEdit';
import type { IncrementalChanges, YearData } from '@/types/stock';

const makeYearData = (): { [y: string]: YearData } => ({
  '2024': {
    stocks: [
      { name: 'NVDA', shares: 100, price: 500, costPrice: 400, id: 'n1', symbol: 'NVDA' },
    ],
    cashTransactions: [],
    stockTransactions: [],
    cashBalance: 10000,
  },
});

const makeProps = (overrides = {}) => {
  const setYearData = jest.fn();
  const setIncrementalChanges = jest.fn();
  const setAlertInfo = jest.fn();
  return {
    yearData: makeYearData(),
    setYearData,
    setIncrementalChanges,
    setAlertInfo,
    currentUser: null,
    years: ['2024'],
    ...overrides,
  };
};

describe('useStockRowEdit - 初始状态', () => {
  it('editingStockName 初始为 null', () => {
    const { result } = renderHook(() => useStockRowEdit(makeProps()));
    expect(result.current.editingStockName).toBeNull();
    expect(result.current.editedRowData).toBeNull();
  });
});

describe('useStockRowEdit - handleEditRow', () => {
  it('进入编辑模式，初始化 editedRowData', () => {
    const { result } = renderHook(() => useStockRowEdit(makeProps()));
    act(() => { result.current.handleEditRow('NVDA'); });
    expect(result.current.editingStockName).toBe('NVDA');
    expect(result.current.editedRowData!['2024'].quantity).toBe('100');
    expect(result.current.editedRowData!['2024'].unitPrice).toBe('500');
  });

  it('不存在的股票初始化为空字符串', () => {
    const { result } = renderHook(() => useStockRowEdit(makeProps()));
    act(() => { result.current.handleEditRow('UNKNOWN'); });
    expect(result.current.editedRowData!['2024'].quantity).toBe('');
  });
});

describe('useStockRowEdit - handleInputChange', () => {
  it('更新指定字段', () => {
    const { result } = renderHook(() => useStockRowEdit(makeProps()));
    act(() => { result.current.handleEditRow('NVDA'); });
    act(() => { result.current.handleInputChange('2024', 'unitPrice', '600'); });
    expect(result.current.editedRowData!['2024'].unitPrice).toBe('600');
  });

  it('未在编辑状态时不更新', () => {
    const { result } = renderHook(() => useStockRowEdit(makeProps()));
    act(() => { result.current.handleInputChange('2024', 'unitPrice', '600'); });
    expect(result.current.editedRowData).toBeNull();
  });
});

describe('useStockRowEdit - handleSaveRow', () => {
  it('保存后清空编辑状态', () => {
    const props = makeProps();
    const { result } = renderHook(() => useStockRowEdit(props));
    act(() => { result.current.handleEditRow('NVDA'); });
    act(() => { result.current.handleSaveRow('NVDA'); });
    expect(result.current.editingStockName).toBeNull();
    expect(result.current.editedRowData).toBeNull();
  });

  it('editedRowData 为 null 时直接返回', () => {
    const props = makeProps();
    const { result } = renderHook(() => useStockRowEdit(props));
    act(() => { result.current.handleSaveRow('NVDA'); });
    expect(props.setYearData).not.toHaveBeenCalled();
  });
});

describe('useStockRowEdit - handleDeleteStock', () => {
  it('弹确认删除对话框', () => {
    const props = makeProps();
    const { result } = renderHook(() => useStockRowEdit(props));
    act(() => { result.current.handleDeleteStock('NVDA'); });
    expect(props.setAlertInfo).toHaveBeenCalledWith(
      expect.objectContaining({ title: '确认删除' }),
    );
  });

  it('确认后调用 setYearData', () => {
    const props = makeProps();
    const { result } = renderHook(() => useStockRowEdit(props));
    act(() => { result.current.handleDeleteStock('NVDA'); });
    const call = props.setAlertInfo.mock.calls[0]?.[0];
    if (call?.onConfirm) act(() => { call.onConfirm(); });
    expect(props.setYearData).toHaveBeenCalled();
  });
});
