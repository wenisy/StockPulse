import { renderHook, act } from '@testing-library/react';
import { useStockOperations } from '../useStockOperations';
import type { IncrementalChanges, YearData } from '@/types/stock';

const makeEmptyIncremental = (): IncrementalChanges => ({
  stocks: {},
  cashTransactions: {},
  stockTransactions: {},
  yearlySummaries: {},
});

const makeYearData = (): { [y: string]: YearData } => ({
  '2024': {
    stocks: [
      { name: 'NVDA', shares: 100, price: 500, costPrice: 400, id: 'n1' },
    ],
    cashTransactions: [],
    stockTransactions: [],
    cashBalance: 50000,
  },
});

describe('useStockOperations', () => {
  let setYearData: jest.Mock;
  let setIncrementalChanges: jest.Mock;
  let setAlertInfo: jest.Mock;
  let yearData: ReturnType<typeof makeYearData>;

  beforeEach(() => {
    setYearData = jest.fn();
    setIncrementalChanges = jest.fn();
    setAlertInfo = jest.fn();
    yearData = makeYearData();
  });

  const render = (overrideYearData = yearData) =>
    renderHook(() =>
      useStockOperations({
        yearData: overrideYearData,
        setYearData,
        setIncrementalChanges,
        setAlertInfo,
        currentUser: null,
        years: ['2024'],
      }),
    );

  it('初始表单状态均为空', () => {
    const { result } = render();
    expect(result.current.newStockName).toBe('');
    expect(result.current.newShares).toBe('');
    expect(result.current.newPrice).toBe('');
    expect(result.current.transactionType).toBe('buy');
  });

  it('resetForm 清空所有表单字段', () => {
    const { result } = render();
    act(() => {
      result.current.setNewStockName('AAPL');
      result.current.setNewShares('50');
      result.current.setNewPrice('200');
    });
    act(() => { result.current.resetForm(); });
    expect(result.current.newStockName).toBe('');
    expect(result.current.newShares).toBe('');
  });

  it('confirmAddNewStock：字段不完整时直接返回不调用 setYearData', () => {
    const { result } = render();
    act(() => { result.current.confirmAddNewStock('2024'); });
    expect(setYearData).not.toHaveBeenCalled();
    expect(setAlertInfo).not.toHaveBeenCalled();
  });

  it('confirmAddNewStock 买入：弹确认对话框', () => {
    const { result } = render();
    act(() => {
      result.current.setNewStockName('MSFT');
      result.current.setNewShares('10');
      result.current.setNewPrice('300');
      result.current.setTransactionType('buy');
    });
    act(() => { result.current.confirmAddNewStock('2024'); });
    expect(setAlertInfo).toHaveBeenCalledWith(
      expect.objectContaining({ title: '确认交易' }),
    );
  });

  it('confirmAddNewStock 买入：现金不足弹警告', () => {
    // 设置余额为 0 但要买 10000 的股票
    const lowCashData = {
      '2024': { ...yearData['2024'], cashBalance: 0 },
    };
    const { result } = render(lowCashData);
    act(() => {
      result.current.setNewStockName('MSFT');
      result.current.setNewShares('100');
      result.current.setNewPrice('300');
      result.current.setTransactionType('buy');
    });
    act(() => { result.current.confirmAddNewStock('2024'); });
    expect(setAlertInfo).toHaveBeenCalledWith(
      expect.objectContaining({ title: '现金不足' }),
    );
  });

  it('confirmAddNewStock 卖出：卖出超过持仓股数时拒绝', () => {
    const { result } = render();
    act(() => {
      result.current.setNewStockName('NVDA');
      result.current.setNewShares('999'); // 超出 100 股
      result.current.setNewPrice('500');
      result.current.setTransactionType('sell');
    });
    act(() => { result.current.confirmAddNewStock('2024'); });
    expect(setAlertInfo).toHaveBeenCalledWith(
      expect.objectContaining({ title: '卖出失败' }),
    );
  });

  it('handleEditRow：设置 editingStockName 并初始化 editedRowData', () => {
    const { result } = render();
    act(() => { result.current.handleEditRow('NVDA'); });
    expect(result.current.editingStockName).toBe('NVDA');
    expect(result.current.editedRowData).not.toBeNull();
    expect(result.current.editedRowData!['2024'].quantity).toBe('100');
  });

  it('handleInputChange：更新 editedRowData 中对应字段', () => {
    const { result } = render();
    act(() => { result.current.handleEditRow('NVDA'); });
    act(() => {
      result.current.handleInputChange('2024', 'unitPrice', '600');
    });
    expect(result.current.editedRowData!['2024'].unitPrice).toBe('600');
  });

  it('handleSaveRow：保存后清空 editingStockName', () => {
    const { result } = render();
    act(() => { result.current.handleEditRow('NVDA'); });
    act(() => { result.current.handleSaveRow('NVDA'); });
    expect(result.current.editingStockName).toBeNull();
    expect(result.current.editedRowData).toBeNull();
  });

  it('confirmAddNewStock 买入确认后调用 setYearData 和 resetForm', () => {
    const { result } = render();
    act(() => {
      result.current.setNewStockName('MSFT');
      result.current.setNewShares('10');
      result.current.setNewPrice('300');
      result.current.setTransactionType('buy');
    });
    act(() => { result.current.confirmAddNewStock('2024'); });
    // 应该弹确认框
    expect(setAlertInfo).toHaveBeenCalledWith(expect.objectContaining({ title: '确认交易' }));
    // 触发 onConfirm
    const call = setAlertInfo.mock.calls[setAlertInfo.mock.calls.length - 1][0];
    if (call?.onConfirm) {
      act(() => { call.onConfirm(); });
    }
    expect(setYearData).toHaveBeenCalled();
  });

  it('confirmAddNewStock 卖出：确认后执行卖出', () => {
    const { result } = render();
    act(() => {
      result.current.setNewStockName('NVDA');
      result.current.setNewShares('20');
      result.current.setNewPrice('500');
      result.current.setTransactionType('sell');
    });
    act(() => { result.current.confirmAddNewStock('2024'); });
    const call = setAlertInfo.mock.calls[0]?.[0];
    expect(call?.title).toBe('确认交易');
    if (call?.onConfirm) {
      act(() => { call.onConfirm(); });
    }
    expect(setYearData).toHaveBeenCalled();
  });

  it('handleDeleteStock 确认后调用 setYearData', () => {
    const { result } = render();
    act(() => { result.current.handleDeleteStock('NVDA'); });
    const call = setAlertInfo.mock.calls[0]?.[0];
    if (call?.onConfirm) {
      act(() => { call.onConfirm(); });
    }
    expect(setYearData).toHaveBeenCalled();
  });

  it('confirmAddNewStock 现金不足确认后执行交易', () => {
    const lowCashData = { '2024': { ...yearData['2024'], cashBalance: 0 } };
    const { result } = render(lowCashData);
    act(() => {
      result.current.setNewStockName('MSFT');
      result.current.setNewShares('100');
      result.current.setNewPrice('300');
      result.current.setTransactionType('buy');
    });
    act(() => { result.current.confirmAddNewStock('2024'); });
    const call = setAlertInfo.mock.calls[0]?.[0];
    expect(call?.title).toBe('现金不足');
    if (call?.onConfirm) {
      act(() => { call.onConfirm(); });
    }
    expect(setYearData).toHaveBeenCalled();
  });
});
