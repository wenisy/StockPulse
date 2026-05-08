'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'sp-theme';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

/** 将当前 `<html data-theme>` 同步到 light/dark，规则：
 *  - 若 mode === "system"，根据 matchMedia 决定
 *  - 否则直接用 mode
 */
const applyResolvedTheme = (mode: ThemeMode) => {
  if (typeof document === 'undefined') return;
  const systemDark =
    typeof window !== 'undefined' && window.matchMedia(MEDIA_QUERY).matches;
  const resolved: ResolvedTheme = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
  document.documentElement.setAttribute('data-theme', resolved);
  // shadcn 旧组件依赖 .dark class，保持同步
  document.documentElement.classList.toggle('dark', resolved === 'dark');
};

const readStoredMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'system';
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === 'light' || v === 'dark' || v === 'system') return v;
  return 'system';
};

const writeStoredMode = (mode: ThemeMode) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }
};

// ---- external store ----
type Listener = () => void;
const listeners = new Set<Listener>();

// 状态全部靠 `<html data-theme>` 和 localStorage 实时推导，无需本地缓存。
const subscribe = (cb: Listener) => {
  listeners.add(cb);
  const mq =
    typeof window !== 'undefined' ? window.matchMedia(MEDIA_QUERY) : null;
  const onSystem = () => {
    if (readStoredMode() === 'system') {
      applyResolvedTheme('system');
    }
    cb();
  };
  mq?.addEventListener('change', onSystem);
  return () => {
    listeners.delete(cb);
    mq?.removeEventListener('change', onSystem);
  };
};

const notify = () => listeners.forEach((l) => l());

const getSnapshot = (): ThemeMode => readStoredMode();
const getServerSnapshot = (): ThemeMode => 'system';

const getResolvedSnapshot = (): ResolvedTheme => {
  if (typeof document === 'undefined') return 'light';
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'dark' ? 'dark' : 'light';
};

export const useTheme = () => {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const resolvedTheme = useSyncExternalStore(
    subscribe,
    getResolvedSnapshot,
    () => 'light' as const,
  );

  // 首次挂载时保证 data-theme 已设置（FOUC 脚本应已设置，这里是兜底）
  useEffect(() => {
    applyResolvedTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: ThemeMode) => {
    writeStoredMode(next);
    applyResolvedTheme(next);
    notify();
  }, []);

  return { theme, resolvedTheme, setTheme };
};

/** 用于在 Next.js layout.tsx 注入的内联防 FOUC 脚本。 */
export const THEME_BOOT_SCRIPT = `
(function(){try{
var key='${STORAGE_KEY}';
var v=localStorage.getItem(key);
var sys=window.matchMedia('${MEDIA_QUERY}').matches?'dark':'light';
var r=(v==='light'||v==='dark')?v:sys;
document.documentElement.setAttribute('data-theme',r);
if(r==='dark')document.documentElement.classList.add('dark');
}catch(e){}})();`.replace(/\n/g, '');
