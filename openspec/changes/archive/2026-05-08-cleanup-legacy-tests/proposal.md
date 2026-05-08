## Why

提案 1–4 完成后，lib 层 100% 覆盖 + hook 层 80% 覆盖已经构成完整测试防线。旧的 1870 行组件级集成测试与根目录两个 `test-*.js` 调试脚本此时已失去价值：
- 它们覆盖的业务规则早已被 lib 测试精确覆盖
- 组件级集成测试在 hook 内部重构时会碎裂，反而阻碍未来的进一步重构
- 根目录两个 `test-*.js` 是后端探针，与前端职责不符

本提案是整个测试基础建设的收尾动作——**安全地删除**。

## What Changes

- 删除 `src/components/__tests__/StockPortfolioTracker.test.tsx`（522 行）
- 删除 `src/components/__tests__/StockPortfolioTracker.basic.test.tsx`（137 行）
- 删除 `src/components/__tests__/StockPortfolioTracker.core.test.tsx`（281 行）
- 删除 `src/components/__tests__/StockPortfolioTracker.calculations.test.tsx`（373 行）
- 删除 `src/components/__tests__/StockPortfolioTracker.async.test.tsx`（166 行）
- 删除 `src/components/__tests__/test-helpers.ts`（206 行）
- 删除根目录 `test-cash-transaction-duplicate.js`
- 删除根目录 `test-holdings-calculation.js`
- **保留** `src/components/__tests__/Combobox.test.tsx`（UI 组件测试，与领域无关）

## Capabilities

### Modified Capabilities

- `portfolio-codebase-hygiene`: 新增这条约束"禁止 `StockPortfolioTracker` 级别的端到端业务规则测试"，防止未来有人再造同样的臃肿集成测试。

注：本项目 `openspec/specs/` 此时应已含 `portfolio-codebase-layout`（由提案 1/3 建立），本提案新增一个并列的 `portfolio-codebase-hygiene` capability。

### New Capabilities

- `portfolio-codebase-hygiene`: 定义代码库中禁止存在的文件/模式，作为清理动作的契约锚点。

## Impact

- 删除：6 个前端测试文件 + 2 个根目录脚本（共 ~1870+ 行）
- 不删：`Combobox.test.tsx`、`jest.config.js`、`jest.setup.js`
- 对 CI 影响：`npm test` 时长下降（集成测试启动成本高）
- 对 git 历史：这些文件的知识已在提案 0 的 `portfolio-domain` spec 中落档
