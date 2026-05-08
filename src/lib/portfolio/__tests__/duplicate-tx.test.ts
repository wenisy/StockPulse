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
