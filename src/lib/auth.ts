const EXPIRED_TOKEN_MESSAGE = '无效或过期的令牌';

export function isUnauthorizedResponse(
  status: number,
  message?: string | null,
): boolean {
  return status === 401 || !!message?.includes(EXPIRED_TOKEN_MESSAGE);
}

export function clearAuthStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}