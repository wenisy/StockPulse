import { renderHook, act } from '@testing-library/react';
import { useStockForm } from '../useStockForm';
import type { IncrementalChanges, YearData } from '@/types/stock';

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
    ...overrides,
  };
};

describe('useStockForm - 初始状态', () => {
  it('表单字段均为空', () => {
    const { result } = renderHook(() => useStockForm(makeProps()));
    expect(result.current.newStockName).toBe('');
    expect(result.current.newShares).toBe('');
    expect(result.current.newPrice).toBe('');
    expect(result.current.transactionType).toBe('buy');
  });
});

describe('useStockForm - resetForm', () => {
  it('resetForm 清空所有字段', () => {
    const { result } = renderHook(() => useStockForm(makeProps()));
    act(() => {
      result.current.setNewStockName('AAPL');
      result.current.setNewShares('10');
      result.current.setNewPrice('200');
    });
    act(() => { result.current.resetForm(); });
    expect(result.current.newStockName).toBe('');
    expect(result.current.newShares).toBe('');
    expect(result.current.transactionType).toBe('buy');
  });
});

describe('useStockForm - confirmAddNewStock', () => {
  beforeEach(() => jest.clearAllMocks());

  it('字段不完整时不弹窗', () => {
    const props = makeProps();
    const { result } = renderHook(() => useStockForm(props));
    act(() => { result.current.confirmAddNewStock('2024'); });
    expect(props.setAlertInfo).not.toHaveBeenCalled();
  });

  it('买入：弹"确认交易"对话框', () => {
    const props = makeProps();
    const { result } = renderHook(() => useStockForm(props));
    act(() => {
      result.current.setNewStockName('MSFT');
      result.current.setNewShares('10');
      result.current.setNewPrice('300');
      result.current.setTransactionType('buy');
    });
    act(() => { result.current.confirmAddNewStock('2024'); });
    expect(props.setAlertInfo).toHaveBeenCalledWith(
      expect.objectContaining({ title: '确认交易' }),
    );
  });

  it('买入确认后调用 setYearData', () => {
    const props = makeProps();
    const { result } = renderHook(() => useStockForm(props));
    act(() => {
      result.current.setNewStockName('MSFT');
      result.current.setNewShares('10');
      result.current.setNewPrice('300');
      result.current.setTransactionType('buy');
    });
    act(() => { result.current.confirmAddNewStock('2024'); });
    const call = props.setAlertInfo.mock.calls[0]?.[0];
    if (call?.onConfirm) act(() => { call.onConfirm(); });
    expect(props.setYearData).toHaveBeenCalled();
  });

  it('买入现金不足：弹"现金不足"对话框', () => {
    const props = makeProps({ yearData: { '2024': { ...makeYearData()['2024'], cashBalance: 0 } } });
    const { result } = renderHook(() => useStockForm(props));
    act(() => {
      result.current.setNewStockName('MSFT');
      result.current.setNewShares('100');
      result.current.setNewPrice('300');
      result.current.setTransactionType('buy');
    });
    act(() => { result.current.confirmAddNewStock('2024'); });
    expect(props.setAlertInfo).toHaveBeenCalledWith(
      expect.objectContaining({ title: '现金不足' }),
    );
  });

  it('卖出超持仓：弹"卖出失败"', () => {
    const props = makeProps();
    const { result } = renderHook(() => useStockForm(props));
    act(() => {
      result.current.setNewStockName('NVDA');
      result.current.setNewShares('999');
      result.current.setNewPrice('500');
      result.current.setTransactionType('sell');
    });
    act(() => { result.current.confirmAddNewStock('2024'); });
    expect(props.setAlertInfo).toHaveBeenCalledWith(
      expect.objectContaining({ title: '卖出失败' }),
    );
  });

  it('卖出：确认后调用 setYearData', () => {
    const props = makeProps();
    const { result } = renderHook(() => useStockForm(props));
    act(() => {
      result.current.setNewStockName('NVDA');
      result.current.setNewShares('10');
      result.current.setNewPrice('500');
      result.current.setTransactionType('sell');
    });
    act(() => { result.current.confirmAddNewStock('2024'); });
    const call = props.setAlertInfo.mock.calls[0]?.[0];
    if (call?.onConfirm) act(() => { call.onConfirm(); });
    expect(props.setYearData).toHaveBeenCalled();
  });
});
