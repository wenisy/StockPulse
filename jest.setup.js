// 导入jest-dom扩展断言
import '@testing-library/jest-dom';

// 模拟window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // 已弃用
    removeListener: jest.fn(), // 已弃用
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// 模拟ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// 模拟IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// 模拟window.scrollTo
window.scrollTo = jest.fn();

// 模拟console.error，防止测试输出过多错误信息
const originalConsoleError = console.error;
console.error = (...args) => {
  // 过滤掉一些React内部警告
  if (
    typeof args[0] === 'string' && 
    (args[0].includes('Warning:') || args[0].includes('Error:'))
  ) {
    return;
  }
  originalConsoleError(...args);
};
