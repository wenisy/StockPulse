import { sortYearsDesc, computeLatestYear } from '@/lib/portfolio/years';

describe('sortYearsDesc（年份降序排列）', () => {
  it('标准排序：数值大的在前', () => {
    expect(sortYearsDesc(['2022', '2024', '2023'])).toEqual([
      '2024',
      '2023',
      '2022',
    ]);
  });

  it('空数组：返回空数组', () => {
    expect(sortYearsDesc([])).toEqual([]);
  });

  it('单元素：返回同样数组', () => {
    expect(sortYearsDesc(['2024'])).toEqual(['2024']);
  });

  it('已排序数组：保持降序', () => {
    expect(sortYearsDesc(['2024', '2023', '2022'])).toEqual([
      '2024',
      '2023',
      '2022',
    ]);
  });

  it('不修改入参（返回新数组）', () => {
    const input = ['2022', '2024', '2023'];
    const output = sortYearsDesc(input);
    expect(input).toEqual(['2022', '2024', '2023']);
    expect(output).not.toBe(input);
  });
});

describe('computeLatestYear（取最大年份）', () => {
  it('多年取最大', () => {
    expect(computeLatestYear(['2022', '2024', '2023'])).toBe('2024');
  });

  it('空数组兜底返回 "2024"', () => {
    expect(computeLatestYear([])).toBe('2024');
  });

  it('单年返回该年', () => {
    expect(computeLatestYear(['2025'])).toBe('2025');
  });

  it('字符串排序与数值排序的差异：仍按数值取最大', () => {
    // 字符串排序下 '9' > '10'，但本函数应取数值最大
    expect(computeLatestYear(['9', '10', '11'])).toBe('11');
  });
});
