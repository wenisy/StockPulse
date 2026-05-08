import { convertToCurrency, formatLargeNumber } from '@/lib/portfolio/currency';
import type { ExchangeRates } from '@/types/stock';

const rates: ExchangeRates = { USD: 1, HKD: 0.12864384, CNY: 0.14 };

describe('convertToCurrency（货币换算）', () => {
  it('换算到港币：100 USD ≈ 777.34 HKD', () => {
    expect(convertToCurrency(100, 'HKD', rates)).toBeCloseTo(777.34, 2);
  });

  it('换算到人民币：100 USD ≈ 714.29 CNY', () => {
    expect(convertToCurrency(100, 'CNY', rates)).toBeCloseTo(714.29, 2);
  });

  it('换算到 USD：保持原值（rate = 1）', () => {
    expect(convertToCurrency(100, 'USD', rates)).toBe(100);
  });

  it('未知货币兜底（rate 取 1，等于原值）', () => {
    expect(convertToCurrency(100, 'EUR', rates)).toBe(100);
  });

  it('rate 为 0 时也兜底（|| 1 短路）', () => {
    expect(convertToCurrency(100, 'XXX', { USD: 1, XXX: 0 } as ExchangeRates)).toBe(100);
  });

  it('零金额：返回 0', () => {
    expect(convertToCurrency(0, 'HKD', rates)).toBe(0);
  });

  it('负数金额：按比例换算（保留符号）', () => {
    expect(convertToCurrency(-100, 'HKD', rates)).toBeCloseTo(-777.34, 2);
  });

  it('极大值：保持精度', () => {
    expect(convertToCurrency(1e9, 'HKD', rates)).toBeCloseTo(7.7734e9, -3);
  });
});

describe('formatLargeNumber（大数本地化格式化）', () => {
  it('万元级：千分位 + 最多 2 位小数', () => {
    expect(formatLargeNumber(1234567.891, 'USD', rates)).toBe('1,234,567.89');
  });

  it('整数无小数', () => {
    expect(formatLargeNumber(1000, 'USD', rates)).toBe('1,000');
  });

  it('小于 1 的小数', () => {
    expect(formatLargeNumber(0.123, 'USD', rates)).toBe('0.12');
  });

  it('换算 + 格式化叠加：100 USD → 港币 777.34', () => {
    expect(formatLargeNumber(100, 'HKD', rates)).toBe('777.34');
  });

  it('零金额：返回 "0"', () => {
    expect(formatLargeNumber(0, 'USD', rates)).toBe('0');
  });

  it('负数：保留负号', () => {
    expect(formatLargeNumber(-1234.56, 'USD', rates)).toBe('-1,234.56');
  });
});
