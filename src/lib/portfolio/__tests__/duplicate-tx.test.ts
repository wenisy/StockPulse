import { isDuplicateCashTx } from '@/lib/portfolio/duplicate-tx';
import type { CashTransaction } from '@/types/stock';

const tx = (
  amount: number,
  type: CashTransaction['type'],
  date: string,
): CashTransaction => ({ amount, type, date });

describe('isDuplicateCashTx（前端会话内三元组去重）', () => {
  it('空列表：永远不重复', () => {
    expect(isDuplicateCashTx([], tx(1000, 'deposit', '2024-01-15'))).toBe(false);
  });

  it('完全相同的 (amount, type, date)：判定重复', () => {
    const existing = [tx(1000, 'deposit', '2024-01-15')];
    expect(isDuplicateCashTx(existing, tx(1000, 'deposit', '2024-01-15'))).toBe(
      true,
    );
  });

  it('不同日期相同金额：不重复', () => {
    const existing = [tx(1000, 'deposit', '2024-01-15')];
    expect(isDuplicateCashTx(existing, tx(1000, 'deposit', '2024-01-16'))).toBe(
      false,
    );
  });

  it('不同 type 相同金额相同日期：不重复', () => {
    const existing = [tx(1000, 'deposit', '2024-01-15')];
    expect(
      isDuplicateCashTx(existing, tx(1000, 'withdraw', '2024-01-15')),
    ).toBe(false);
  });

  it('不同金额：不重复', () => {
    const existing = [tx(1000, 'deposit', '2024-01-15')];
    expect(isDuplicateCashTx(existing, tx(2000, 'deposit', '2024-01-15'))).toBe(
      false,
    );
  });

  it('多条已存在交易，候选与其中一条相同：判定重复', () => {
    const existing = [
      tx(500, 'deposit', '2024-01-10'),
      tx(1000, 'deposit', '2024-01-15'),
      tx(2000, 'deposit', '2024-02-01'),
    ];
    expect(isDuplicateCashTx(existing, tx(1000, 'deposit', '2024-01-15'))).toBe(
      true,
    );
  });

  it('userUuid 不在去重维度内（前端只看三元组）', () => {
    const existing: CashTransaction[] = [
      { amount: 1000, type: 'deposit', date: '2024-01-15', userUuid: 'A' },
    ];
    const candidate: CashTransaction = {
      amount: 1000,
      type: 'deposit',
      date: '2024-01-15',
      userUuid: 'B',
    };
    expect(isDuplicateCashTx(existing, candidate)).toBe(true);
  });
});

// ============================================================================
// 深度边界
// ============================================================================

describe('isDuplicateCashTx 深度边界', () => {
  it('amount=0 的两笔相同交易：判定重复', () => {
    const tx = { amount: 0, type: 'deposit' as const, date: '2024-01-01' };
    expect(isDuplicateCashTx([tx], tx)).toBe(true);
  });

  it('amount=0 不同日期：不重复', () => {
    const existing = { amount: 0, type: 'deposit' as const, date: '2024-01-01' };
    const candidate = { amount: 0, type: 'deposit' as const, date: '2024-01-02' };
    expect(isDuplicateCashTx([existing], candidate)).toBe(false);
  });

  it('负数 amount 去重（withdraw 存为负值）', () => {
    const tx = { amount: -1000, type: 'withdraw' as const, date: '2024-03-01' };
    expect(isDuplicateCashTx([tx], { ...tx })).toBe(true);
  });

  it('空 date 字段：仍按三元组判断', () => {
    const tx = { amount: 500, type: 'deposit' as const, date: '' };
    expect(isDuplicateCashTx([tx], { ...tx })).toBe(true);
  });

  it('大量已存交易中查找：不崩（线性扫描）', () => {
    const many = Array.from({ length: 1000 }, (_, i) => ({
      amount: i,
      type: 'deposit' as const,
      date: '2024-01-01',
    }));
    const candidate = { amount: 999, type: 'deposit' as const, date: '2024-01-01' };
    expect(isDuplicateCashTx(many, candidate)).toBe(true);
  });
});
