const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // 指向Next.js应用的路径
  dir: './',
});

// 自定义Jest配置
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // 处理模块别名
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
  ],
  collectCoverageFrom: [
    'src/lib/portfolio/**/*.ts',
    'src/hooks/**/*.ts',
  ],
  coverageThreshold: {
    './src/lib/portfolio/': {
      lines: 100,
      branches: 100,
      functions: 100,
      statements: 100,
    },
    './src/hooks/': {
      lines: 79,
      branches: 55,
      functions: 75,
      statements: 79,
    },
  },
};

// 创建并导出Jest配置
module.exports = createJestConfig(customJestConfig);
