'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 767px)';

const subscribe = (cb: () => void) => {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

const getSnapshot = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(QUERY).matches;
};

const getServerSnapshot = () => false;

export const useIsMobile = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
