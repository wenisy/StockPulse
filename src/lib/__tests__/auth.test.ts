import { clearAuthStorage, isUnauthorizedResponse } from '../auth';

describe('auth helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'test');
    localStorage.setItem('user', '{}');
  });

  it('isUnauthorizedResponse: 401 返回 true', () => {
    expect(isUnauthorizedResponse(401)).toBe(true);
  });

  it('isUnauthorizedResponse: 过期令牌消息返回 true', () => {
    expect(isUnauthorizedResponse(403, '无效或过期的令牌')).toBe(true);
  });

  it('isUnauthorizedResponse: 其他错误返回 false', () => {
    expect(isUnauthorizedResponse(500, '服务器错误')).toBe(false);
  });

  it('clearAuthStorage: 清除 token 和 user', () => {
    clearAuthStorage();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});