import {
  applyCashTransactionToYear,
  applyStockTransactionToYear,
  carryOverYearData,
  removeStockFromAllYears,
  mergeEditedRowData,
} from '@/lib/portfolio/year-data';
import type { CashTransaction, Stock, YearData } from '@/types/stock';

// 让 uuid v4 在测试中确定，便于断言
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-uuid') }));

const buildYear = (overrides: Partial<YearData> = {}): YearData => ({
  stocks: [],
  cashTransactions: [],
  stockTransactions: [],
  cashBalance: 0,
  ...overrides,
});

const stock = (overrides: Partial<Stock> = {}): Stock => ({
  name: 'A',
  shares: 100,
  price: 50,
  costPrice: 40,
  id: 'stock-a',
  ...overrides,
});

describe('applyCashTransactionToYear', () => {
  it('已存在年度：cashBalance 累加，cashTransactions 末尾追加', () => {
    const yd = { '2024': buildYear({ cashBalance: 1000 }) };
    const tx: CashTransaction = {
      amount: 500,
      type: 'deposit',
      date: '2024-02-01',
    };
    const next = applyCashTransactionToYear(yd, '2024', tx);
    expect(next['2024'].cashBalance).toBe(1500);
    expect(next['2024'].cashTransactions).toEqual([tx]);
  });

  it('不存在年度：自动初始化为空 YearData，cashBalance = tx.amount', () => {
    const next = applyCashTransactionToYear({}, '2024', {
      amount: 1000,
      type: 'deposit',
      date: '2024-01-15',
    });
    expect(next['2024'].cashBalance).toBe(1000);
    expect(next['2024'].stocks).toEqual([]);
    expect(next['2024'].stockTransactions).toEqual([]);
    expect(next['2024'].cashTransactions).toHaveLength(1);
  });

  it('withdraw（amount 为负）：cashBalance 减少', () => {
    const yd = { '2024': buildYear({ cashBalance: 1000 }) };
    const next = applyCashTransactionToYear(yd, '2024', {
      amount: -300,
      type: 'withdraw',
      date: '2024-02-01',
    });
    expect(next['2024'].cashBalance).toBe(700);
  });

  it('多笔混合现金交易（连续应用）：余额累计正确', () => {
    let yd: { [y: string]: YearData } = {};
    yd = applyCashTransactionToYear(yd, '2024', {
      amount: 10000,
      type: 'deposit',
      date: '2024-01-01',
    });
    yd = applyCashTransactionToYear(yd, '2024', {
      amount: 5000,
      type: 'deposit',
      date: '2024-02-01',
    });
    yd = applyCashTransactionToYear(yd, '2024', {
      amount: -3000,
      type: 'withdraw',
      date: '2024-03-01',
    });
    expect(yd['2024'].cashBalance).toBe(12000);
    expect(yd['2024'].cashTransactions).toHaveLength(3);
  });

  it('不修改入参（不可变）', () => {
    const yd = { '2024': buildYear({ cashBalance: 1000 }) };
    const before = JSON.parse(JSON.stringify(yd));
    applyCashTransactionToYear(yd, '2024', {
      amount: 500,
      type: 'deposit',
      date: '2024-02-01',
    });
    expect(yd).toEqual(before);
  });
});

describe('applyStockTransactionToYear', () => {
  const baseInput = {
    stockName: 'NVDA',
    shares: 50,
    price: 100,
    costPrice: 100,
    transactionShares: 50,
    transactionPrice: 100,
    transactionType: 'buy' as const,
    today: '2024-06-01',
  };

  it('新股买入：stocks 新增、stockTransactions/cashTransactions 各加一条', () => {
    const next = applyStockTransactionToYear({}, '2024', baseInput);
    expect(next['2024'].stocks).toHaveLength(1);
    expect(next['2024'].stocks[0].name).toBe('NVDA');
    expect(next['2024'].stockTransactions).toHaveLength(1);
    expect(next['2024'].cashTransactions).toHaveLength(1);
    expect(next['2024'].cashTransactions[0].amount).toBe(-5000); // buy → 负数
  });

  it('已有股票加仓：替换数据，不增加数组长度', () => {
    const yd = {
      '2024': buildYear({ stocks: [stock({ name: 'NVDA', shares: 30 })] }),
    };
    const next = applyStockTransactionToYear(yd, '2024', {
      ...baseInput,
      shares: 80, // 加仓后总股数
      transactionShares: 50,
    });
    expect(next['2024'].stocks).toHaveLength(1);
    expect(next['2024'].stocks[0].shares).toBe(80);
  });

  it('卖出后清仓（shares <= 0）：从 stocks 数组移除', () => {
    const yd = {
      '2024': buildYear({ stocks: [stock({ name: 'NVDA', shares: 30 })] }),
    };
    const next = applyStockTransactionToYear(yd, '2024', {
      ...baseInput,
      shares: 0,
      transactionShares: 30,
      transactionType: 'sell',
    });
    expect(next['2024'].stocks).toHaveLength(0);
    // 但流水仍记录
    expect(next['2024'].stockTransactions).toHaveLength(1);
    expect(next['2024'].cashTransactions).toHaveLength(1);
  });

  it('sell 现金交易 amount 为正', () => {
    const yd = {
      '2024': buildYear({ stocks: [stock({ name: 'NVDA', shares: 50 })] }),
    };
    const next = applyStockTransactionToYear(yd, '2024', {
      ...baseInput,
      shares: 30,
      transactionShares: 20,
      transactionType: 'sell',
    });
    expect(next['2024'].cashTransactions[0].amount).toBe(2000); // 20×100
    expect(next['2024'].cashTransactions[0].type).toBe('sell');
  });

  it('不存在年度：自动初始化', () => {
    const next = applyStockTransactionToYear({}, '2024', baseInput);
    expect(next['2024']).toBeDefined();
    expect(next['2024'].cashBalance).toBe(0);
  });

  it('shares = 0 且原本不存在该股票：不增加 stocks', () => {
    const next = applyStockTransactionToYear({}, '2024', {
      ...baseInput,
      shares: 0,
      transactionShares: 0,
    });
    expect(next['2024'].stocks).toHaveLength(0);
  });

  it('使用提供的 today，不依赖系统时钟', () => {
    const next = applyStockTransactionToYear({}, '2024', baseInput);
    expect(next['2024'].stockTransactions[0].date).toBe('2024-06-01');
    expect(next['2024'].cashTransactions[0].date).toBe('2024-06-01');
  });

  it('不修改入参', () => {
    const yd = { '2024': buildYear({ stocks: [stock()] }) };
    const before = JSON.parse(JSON.stringify(yd));
    applyStockTransactionToYear(yd, '2024', baseInput);
    expect(yd).toEqual(before);
  });
});

describe('carryOverYearData', () => {
  it('从 2024 结转到 2025：股票深拷贝、cashBalance 继承、追加结余 deposit', () => {
    const yd = {
      '2024': buildYear({
        stocks: [stock({ name: 'A', shares: 10, price: 50, costPrice: 40 })],
        cashBalance: 1000,
      }),
    };
    const result = carryOverYearData(yd, ['2024'], '2025', {
      today: '2025-01-01',
    });
    expect(result.alreadyExists).toBe(false);
    expect(result.carriedCashBalance).toBe(1000);
    expect(result.yearData['2025'].stocks).toHaveLength(1);
    expect(result.yearData['2025'].cashBalance).toBe(1000);
    expect(result.yearData['2025'].cashTransactions).toHaveLength(1);
    expect(result.yearData['2025'].cashTransactions[0]).toMatchObject({
      amount: 1000,
      type: 'deposit',
      description: '上年结余',
      date: '2025-01-01',
    });
    // 不修改原 2024
    expect(yd['2024'].cashBalance).toBe(1000);
  });

  it('股票是深拷贝（修改新年股票不影响原年）', () => {
    const yd = {
      '2024': buildYear({
        stocks: [stock({ name: 'A', shares: 10 })],
        cashBalance: 0,
      }),
    };
    const result = carryOverYearData(yd, ['2024'], '2025');
    result.yearData['2025'].stocks[0].shares = 999;
    expect(yd['2024'].stocks[0].shares).toBe(10);
  });

  it('重复添加已存在年份：alreadyExists=true 且 yearData 不变', () => {
    const yd = { '2024': buildYear() };
    const result = carryOverYearData(yd, ['2024'], '2024');
    expect(result.alreadyExists).toBe(true);
    expect(result.yearData).toBe(yd);
  });

  it('无可参考年份（跳跃添加）：stocks 空、cashBalance 0、不产生结余条目', () => {
    const yd = { '2025': buildYear({ stocks: [stock()], cashBalance: 1000 }) };
    const result = carryOverYearData(yd, ['2025'], '2023');
    expect(result.yearData['2023'].stocks).toEqual([]);
    expect(result.yearData['2023'].cashBalance).toBe(0);
    expect(result.yearData['2023'].cashTransactions).toEqual([]);
  });

  it('cashBalance ≤ 0 时不追加结余 deposit', () => {
    const yd = {
      '2024': buildYear({ stocks: [], cashBalance: 0 }),
    };
    const result = carryOverYearData(yd, ['2024'], '2025');
    expect(result.yearData['2025'].cashTransactions).toEqual([]);
  });

  it('空 newYear 字符串（trim 后为空）：alreadyExists=true', () => {
    const result = carryOverYearData({}, [], '   ');
    expect(result.alreadyExists).toBe(true);
  });

  it('多个候选参考年时取最大且小于新年的', () => {
    const yd = {
      '2020': buildYear({ cashBalance: 500 }),
      '2022': buildYear({ cashBalance: 2000 }),
      '2024': buildYear({ cashBalance: 4000 }),
    };
    const result = carryOverYearData(yd, ['2020', '2022', '2024'], '2023');
    // 参考年应为 2022（小于 2023 中最大的）
    expect(result.carriedCashBalance).toBe(2000);
  });
});

describe('removeStockFromAllYears', () => {
  it('删除存在于多年的股票：所有年份 stocks 都不再含该股票', () => {
    const yd = {
      '2023': buildYear({ stocks: [stock({ name: 'A' }), stock({ name: 'B', id: 'b' })] }),
      '2024': buildYear({ stocks: [stock({ name: 'A' })] }),
    };
    const next = removeStockFromAllYears(yd, 'A');
    expect(next['2023'].stocks.map((s) => s.name)).toEqual(['B']);
    expect(next['2024'].stocks).toHaveLength(0);
  });

  it('保留历史交易流水（cashTransactions / stockTransactions 不动）', () => {
    const yd = {
      '2024': buildYear({
        stocks: [stock({ name: 'A' })],
        cashTransactions: [
          { amount: -100, type: 'buy', date: '2024-06-01', stockName: 'A' },
        ],
        stockTransactions: [
          {
            stockName: 'A',
            type: 'buy',
            shares: 100,
            price: 50,
            date: '2024-06-01',
          },
        ],
      }),
    };
    const next = removeStockFromAllYears(yd, 'A');
    expect(next['2024'].cashTransactions).toHaveLength(1);
    expect(next['2024'].stockTransactions).toHaveLength(1);
  });

  it('某年没有 stocks（异常数据）：保持原引用', () => {
    const ydAny = {
      '2024': { stocks: undefined } as unknown as YearData,
    };
    const next = removeStockFromAllYears(ydAny, 'A');
    expect(next['2024']).toBe(ydAny['2024']);
  });

  it('删除不存在的股票：所有数据保持不变', () => {
    const yd = {
      '2024': buildYear({ stocks: [stock({ name: 'A' })] }),
    };
    const next = removeStockFromAllYears(yd, 'NotExist');
    expect(next['2024'].stocks).toHaveLength(1);
  });
});

describe('mergeEditedRowData', () => {
  const yd = {
    '2023': buildYear({
      stocks: [stock({ name: 'A', shares: 10, price: 50, costPrice: 40 })],
    }),
    '2024': buildYear({
      stocks: [stock({ name: 'A', shares: 20, price: 60, costPrice: 45, id: 'a-2024' })],
    }),
  };

  it('在两年同时更新股价（数字字段全部解析成功）', () => {
    const editedRows = {
      '2023': { quantity: '100', unitPrice: '50', costPrice: '40', symbol: 'A' },
      '2024': { quantity: '100', unitPrice: '60', costPrice: '45', symbol: 'A' },
    };
    const result = mergeEditedRowData(yd, 'A', editedRows, ['2023', '2024']);
    expect(result.yearData['2023'].stocks[0].shares).toBe(100);
    expect(result.yearData['2024'].stocks[0].shares).toBe(100);
    expect(result.affected).toHaveLength(2);
  });

  it('某年的 quantity 留空（NaN）：从该年 stocks 移除', () => {
    const editedRows = {
      '2023': { quantity: '', unitPrice: '50', costPrice: '40', symbol: 'A' },
      '2024': { quantity: '100', unitPrice: '60', costPrice: '45', symbol: 'A' },
    };
    const result = mergeEditedRowData(yd, 'A', editedRows, ['2023', '2024']);
    expect(result.yearData['2023'].stocks).toHaveLength(0);
    expect(result.yearData['2024'].stocks).toHaveLength(1);
    // 只 2024 在 affected 中
    expect(result.affected).toHaveLength(1);
    expect(result.affected[0].year).toBe('2024');
  });

  it('某年原本不存在该股票（解析成功）：新增', () => {
    const editedRows = {
      '2024': { quantity: '50', unitPrice: '99', costPrice: '90', symbol: 'NEW' },
    };
    const start = {
      '2024': buildYear(), // 没有任何 stocks
    };
    const result = mergeEditedRowData(start, 'NEW', editedRows, ['2024']);
    expect(result.yearData['2024'].stocks).toHaveLength(1);
    expect(result.yearData['2024'].stocks[0].name).toBe('NEW');
    expect(result.yearData['2024'].stocks[0].id).toBe('test-uuid');
  });

  it('未提供 editedInfo 的年份：保持原状', () => {
    const editedRows = {
      '2023': { quantity: '100', unitPrice: '50', costPrice: '40', symbol: 'A' },
    };
    const result = mergeEditedRowData(yd, 'A', editedRows, ['2023', '2024']);
    expect(result.yearData['2024'].stocks[0].shares).toBe(20); // 不变
  });

  it('某年 yearData 不存在（years 中有但 yd 中没有）：自动初始化为空年并按解析结果处理', () => {
    const editedRows = {
      '2025': { quantity: '10', unitPrice: '100', costPrice: '90', symbol: 'A' },
    };
    const result = mergeEditedRowData(yd, 'A', editedRows, ['2025']);
    expect(result.yearData['2025'].stocks).toHaveLength(1);
    expect(result.yearData['2025'].cashBalance).toBe(0);
  });

  it('字段全为空：从 stocks 数组移除该股票', () => {
    const editedRows = {
      '2023': { quantity: '', unitPrice: '', costPrice: '', symbol: '' },
    };
    const result = mergeEditedRowData(yd, 'A', editedRows, ['2023']);
    expect(result.yearData['2023'].stocks).toHaveLength(0);
  });
});

describe('防御性兜底分支（脏数据进入）', () => {
  it('applyCashTransactionToYear: existing.cashTransactions 为 undefined 时仍正常工作', () => {
    const dirty: { [y: string]: YearData } = {
      // @ts-expect-error 故意传入脏数据测试兜底
      '2024': { cashBalance: 0 },
    };
    const next = applyCashTransactionToYear(dirty, '2024', {
      amount: 1000,
      type: 'deposit',
      date: '2024-01-15',
    });
    expect(next['2024'].cashTransactions).toHaveLength(1);
    expect(next['2024'].cashBalance).toBe(1000);
  });

  it('applyCashTransactionToYear: existing.cashBalance 为 undefined 时按 0 起步', () => {
    const dirty = {
      // @ts-expect-error 故意传入缺少 cashBalance 的脏数据以测试兜底行为
      '2024': { cashTransactions: [], stocks: [], stockTransactions: [] },
    } as { [y: string]: YearData };
    const next = applyCashTransactionToYear(dirty, '2024', {
      amount: 500,
      type: 'deposit',
      date: '2024-01-15',
    });
    expect(next['2024'].cashBalance).toBe(500);
  });

  it('applyStockTransactionToYear: existing.stocks 为 undefined 时按空数组起步', () => {
    const dirty = {
      '2024': {
        cashBalance: 0,
        cashTransactions: [],
        stockTransactions: [],
      } as unknown as YearData,
    };
    const next = applyStockTransactionToYear(dirty, '2024', {
      stockName: 'X',
      shares: 10,
      price: 50,
      costPrice: 40,
      transactionShares: 10,
      transactionPrice: 50,
      transactionType: 'buy',
      today: '2024-06-01',
    });
    expect(next['2024'].stocks).toHaveLength(1);
  });

  it('applyStockTransactionToYear: existing 缺 stockTransactions/cashTransactions 时按空数组起步', () => {
    const dirty = {
      '2024': {
        stocks: [],
        cashBalance: 0,
      } as unknown as YearData,
    };
    const next = applyStockTransactionToYear(dirty, '2024', {
      stockName: 'X',
      shares: 10,
      price: 50,
      costPrice: 40,
      transactionShares: 10,
      transactionPrice: 50,
      transactionType: 'buy',
      today: '2024-06-01',
    });
    expect(next['2024'].stockTransactions).toHaveLength(1);
    expect(next['2024'].cashTransactions).toHaveLength(1);
  });

  it('applyStockTransactionToYear: today 默认为系统时间（不传 today）', () => {
    // 仅验证不报错且 date 是合法 ISO 日期前缀
    const next = applyStockTransactionToYear({}, '2024', {
      stockName: 'X',
      shares: 10,
      price: 50,
      costPrice: 40,
      transactionShares: 10,
      transactionPrice: 50,
      transactionType: 'buy',
    });
    expect(next['2024'].cashTransactions[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('carryOverYearData: today 默认为系统时间', () => {
    const yd = { '2024': buildYear({ cashBalance: 1000 }) };
    const result = carryOverYearData(yd, ['2024'], '2025');
    expect(result.yearData['2025'].cashTransactions[0].date).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });

  it('mergeEditedRowData: existing.stocks 为 undefined 时按空数组起步', () => {
    const dirty = {
      '2024': {
        cashBalance: 0,
        cashTransactions: [],
        stockTransactions: [],
      } as unknown as YearData,
    };
    const result = mergeEditedRowData(
      dirty,
      'NEW',
      {
        '2024': { quantity: '10', unitPrice: '50', costPrice: '40', symbol: 'N' },
      },
      ['2024'],
    );
    expect(result.yearData['2024'].stocks).toHaveLength(1);
  });
});
