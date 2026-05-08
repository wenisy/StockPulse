## Why

提案 1 完成后，`src/lib/portfolio/` 下所有纯函数已经独立可调用，但**还没有任何测试**。本提案是测试金字塔的"塔基"：把 `portfolio-domain` spec 中的每一条 scenario 翻译成 jest 用例，建立"重构防回归"的主防线。这一层覆盖完整后，提案 3 改造 hook 才有底气。

## What Changes

- 新增目录 `src/lib/portfolio/__tests__/`
- 为 7 个 lib 模块各创建对应 `*.test.ts`
- 每条 spec scenario 至少对应 1 个 `it` 用例，每个函数额外补"边界 + 异常"用例
- 在 `jest.config.js` 启用 `coverageThreshold` 仅针对 `src/lib/portfolio/**`：line 100% / branch 100% / function 100% / statement 100%
- 在 `package.json` scripts 不变（`npm test` 自动覆盖新测试）

## Capabilities

### New Capabilities

- `portfolio-test-coverage`: 定义"哪些 spec scenario 必须有对应的测试用例"的强制对应关系，以及覆盖率阈值的可执行契约。

### Modified Capabilities

无。

## Impact

- 新增：`src/lib/portfolio/__tests__/{currency,cost-basis,year-data,duplicate-tx,incremental,portfolio-metrics,years}.test.ts`
- 修改：`jest.config.js`（添加 `coverageThreshold` 局部阈值）
- 不改：源代码（`src/lib/portfolio/*.ts`）、hooks、components、API、数据格式
- CI 影响：`npm run test:coverage` 在 lib 覆盖率不足 100% 时会失败
