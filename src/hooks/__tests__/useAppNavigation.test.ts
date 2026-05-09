/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import {
  useAppNavigation,
  SECTION_IDS,
  __resetAppNavigationForTest,
} from '../useAppNavigation';

describe('useAppNavigation', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    __resetAppNavigationForTest();
  });

  it('默认 section = "overview"', () => {
    const { result } = renderHook(() => useAppNavigation());
    expect(result.current.activeSection).toBe('overview');
  });

  it('暴露固定 5 个 section', () => {
    const { result } = renderHook(() => useAppNavigation());
    expect(result.current.sections.map((s) => s.id)).toEqual([...SECTION_IDS]);
  });

  it('URL 带 view= 时初始化为对应 section', () => {
    window.history.replaceState(null, '', '/?view=holdings');
    const { result } = renderHook(() => useAppNavigation());
    expect(result.current.activeSection).toBe('holdings');
  });

  it('无效 URL 参数回落默认', () => {
    window.history.replaceState(null, '', '/?view=notexist');
    const { result } = renderHook(() => useAppNavigation());
    expect(result.current.activeSection).toBe('overview');
  });

  it('localStorage 有值时初始化使用该值', () => {
    localStorage.setItem('sp-nav-section', 'charts');
    const { result } = renderHook(() => useAppNavigation());
    expect(result.current.activeSection).toBe('charts');
  });

  it('setActiveSection 更新 URL 与 localStorage', () => {
    const { result } = renderHook(() => useAppNavigation());
    act(() => result.current.setActiveSection('planner'));
    expect(result.current.activeSection).toBe('planner');
    expect(window.location.search).toContain('view=planner');
    expect(localStorage.getItem('sp-nav-section')).toBe('planner');
  });

  it('两个组件实例共享同一份 state（核心：修复 bug A）', () => {
    const a = renderHook(() => useAppNavigation());
    const b = renderHook(() => useAppNavigation());

    // 两个实例初始都是 overview
    expect(a.result.current.activeSection).toBe('overview');
    expect(b.result.current.activeSection).toBe('overview');

    // 在 a 调 setActiveSection，b 也应该立刻看到新值
    act(() => a.result.current.setActiveSection('charts'));

    expect(a.result.current.activeSection).toBe('charts');
    expect(b.result.current.activeSection).toBe('charts');
  });

  it('重复调 setActiveSection 同一个 section 是幂等的', () => {
    const { result } = renderHook(() => useAppNavigation());
    act(() => result.current.setActiveSection('holdings'));
    act(() => result.current.setActiveSection('holdings'));
    expect(result.current.activeSection).toBe('holdings');
  });
});
