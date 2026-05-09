/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { useResolvedColors } from '../useResolvedColors';

// useTheme 依赖 matchMedia
const setupMatchMedia = (matches = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })),
  });
};

describe('useResolvedColors', () => {
  beforeEach(() => {
    setupMatchMedia(false);
    localStorage.clear();
  });

  it('返回包含所有预期 key 的对象', () => {
    const { result } = renderHook(() => useResolvedColors());
    const keys = [
      'brand', 'brandFg', 'success', 'danger', 'warning', 'info',
      'fg', 'fgMuted', 'bgElevated', 'bgSubtle', 'borderDefault', 'borderSubtle',
      'chartColors',
    ];
    for (const key of keys) {
      expect(result.current).toHaveProperty(key);
    }
  });

  it('chartColors 是长度为 5 的数组', () => {
    const { result } = renderHook(() => useResolvedColors());
    expect(Array.isArray(result.current.chartColors)).toBe(true);
    expect(result.current.chartColors).toHaveLength(5);
  });

  it('所有颜色值都是非空字符串', () => {
    const { result } = renderHook(() => useResolvedColors());
    const { chartColors, ...scalar } = result.current;
    for (const val of Object.values(scalar)) {
      expect(typeof val).toBe('string');
      expect(val.length).toBeGreaterThan(0);
    }
    for (const c of chartColors) {
      expect(typeof c).toBe('string');
      expect(c.length).toBeGreaterThan(0);
    }
  });
});
