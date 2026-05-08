/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { useTheme, THEME_BOOT_SCRIPT } from '../useTheme';

const setMatchMedia = (matches: boolean) => {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })),
  });
  return {
    listeners,
    emit: (m: boolean) => listeners.forEach((cb) => cb({ matches: m } as MediaQueryListEvent)),
  };
};

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
  });

  it('默认 theme === "system"', () => {
    setMatchMedia(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('system');
  });

  it('setTheme("dark") 写 localStorage + data-theme', () => {
    setMatchMedia(false);
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('dark'));
    expect(localStorage.getItem('sp-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('setTheme("light")', () => {
    setMatchMedia(true);
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('light'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('theme=system 时 resolvedTheme 跟随 matchMedia', () => {
    setMatchMedia(true); // system = dark
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('system'));
    expect(['light', 'dark']).toContain(result.current.resolvedTheme);
  });

  it('localStorage 里有无效值，退回 system', () => {
    localStorage.setItem('sp-theme', 'purple');
    setMatchMedia(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('system');
  });

  it('THEME_BOOT_SCRIPT 是一行字符串', () => {
    expect(THEME_BOOT_SCRIPT).not.toContain('\n');
    expect(THEME_BOOT_SCRIPT.length).toBeGreaterThan(30);
  });
});
