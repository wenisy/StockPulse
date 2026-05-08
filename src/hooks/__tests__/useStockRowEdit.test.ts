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

  it('取消删除时 setYearData 不被调用', () => {
    const props = makeProps();
    const { result } = renderHook(() => useStockRowEdit(props));
    act(() => { result.current.handleDeleteStock('NVDA'); });
    const call = props.setAlertInfo.mock.calls[0]?.[0];
    if (call?.onCancel) act(() => { call.onCancel(); });
    expect(props.setYearData).not.toHaveBeenCalled();
  });
});

describe('useStockRowEdit - handleSaveRow 深度覆盖', () => {
  it('保存有效数据：实际调用 setYearData 和 setIncrementalChanges', () => {
    const props = makeProps();
    const { result } = renderHook(() => useStockRowEdit(props));
    act(() => { result.current.handleEditRow('NVDA'); });
    // 修改为有效数字
    act(() => {
      result.current.handleInputChange('2024', 'quantity', '120');
      result.current.handleInputChange('2024', 'unitPrice', '550');
      result.current.handleInputChange('2024', 'costPrice', '450');
    });
    act(() => { result.current.handleSaveRow('NVDA'); });
    expect(props.setYearData).toHaveBeenCalled();
    // setIncrementalChanges 是通过 setYearData 的 updater 调用的，需要真实触发 updater
    const updater = props.setYearData.mock.calls[0][0];
    const newState = updater(makeYearData());
    expect(newState['2024'].stocks[0].shares).toBe(120);
    // setIncrementalChanges 在 updater 内被调用
    expect(props.setIncrementalChanges).toHaveBeenCalled();
  });

  it('保存不同股票（新增场景）', () => {
    const props = makeProps();
    const { result } = renderHook(() => useStockRowEdit(props));
    act(() => { result.current.handleEditRow('NEWSTOCK'); });
    act(() => {
      result.current.handleInputChange('2024', 'quantity', '50');
      result.current.handleInputChange('2024', 'unitPrice', '100');
      result.current.handleInputChange('2024', 'costPrice', '80');
    });
    act(() => { result.current.handleSaveRow('NEWSTOCK'); });
    const updater = props.setYearData.mock.calls[0][0];
    const newState = updater(makeYearData());
    // 新股被追加
    expect(newState['2024'].stocks.some((s: { name: string }) => s.name === 'NEWSTOCK')).toBe(true);
  });
});

describe('useStockRowEdit - handleSaveRow updater 深度执行', () => {
  it('handleSaveRow updater 执行：触发 setIncrementalChanges 回调链', () => {
    const props = makeProps();
    const { result } = renderHook(() => useStockRowEdit(props));
    act(() => { result.current.handleEditRow('NVDA'); });
    act(() => {
      result.current.handleInputChange('2024', 'quantity', '200');
      result.current.handleInputChange('2024', 'unitPrice', '550');
      result.current.handleInputChange('2024', 'costPrice', '450');
    });
    act(() => { result.current.handleSaveRow('NVDA'); });

    // 提取 setYearData 的 updater 手动执行
    const updater = props.setYearData.mock.calls[0][0];
    const nextState = updater(makeYearData());
    expect(nextState['2024'].stocks[0].shares).toBe(200);

    // 再提取 setIncrementalChanges 的 updater 手动执行
    const incUpdater = props.setIncrementalChanges.mock.calls[0]?.[0];
    if (typeof incUpdater === 'function') {
      const next = incUpdater({
        stocks: {},
        cashTransactions: {},
        stockTransactions: {},
        yearlySummaries: {},
      });
      expect(next.stocks['2024']).toBeDefined();
      expect(next.yearlySummaries['2024']).toBeDefined();
    }
  });
});

describe('useStockRowEdit - handleDeleteStock updater 深度执行', () => {
  it('删除确认回调：执行 updater 真实移除', () => {
    const props = makeProps();
    const { result } = renderHook(() => useStockRowEdit(props));
    act(() => { result.current.handleDeleteStock('NVDA'); });
    const call = props.setAlertInfo.mock.calls[0]?.[0];
    if (call?.onConfirm) act(() => { call.onConfirm(); });

    const updater = props.setYearData.mock.calls[0][0];
    const nextState = updater(makeYearData());
    expect(nextState['2024'].stocks.find((s: { name: string }) => s.name === 'NVDA')).toBeUndefined();

    const incUpdater = props.setIncrementalChanges.mock.calls[0]?.[0];
    if (typeof incUpdater === 'function') {
      const next = incUpdater({
        stocks: { '2024': [{ name: 'NVDA', shares: 100, price: 500, costPrice: 400, id: 'n1' }] },
        cashTransactions: {},
        stockTransactions: {},
        yearlySummaries: {},
      });
      expect(next.stocks['2024'].find((s: { name: string }) => s.name === 'NVDA')).toBeUndefined();
    }
  });
});
