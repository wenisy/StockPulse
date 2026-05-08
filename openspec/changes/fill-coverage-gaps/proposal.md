## Why

目前 hooks 层覆盖率整体 80% line，但单文件差异明显：

| Hook | Lines | 差距 |
|------|-------|------|
| useStockRowEdit | 66% | 大量 merge/delete 分支未测 |
| useStockData | 70% | stockTransaction 各路径 |
| useUserManagement | 72% | saveDataToBackend 未测 |
| useUserSettings | 74% | localStorage 初始化路径 |
| useStockForm | 79% | confirmAddNewStock 边界 |
| usePortfolioSync | 80% | refreshPrices 成功路径 |
| usePriceData | 80% | loadSymbols 路径 |

整体目标 85%+ lines、70%+ branches。不追求 100%（已证明会逼出脆弱测试）。

## What Changes

为 7 个 hook 补针对性单元测试，重点覆盖：
- 现有 Uncovered Line #s 中的关键业务路径
- branch 分支（错误处理 / 边界条件）

提升 jest.config.js 的 hooks 阈值从当前 79/55/75/79 → 85/68/80/85。

**明确不做**：
- 不追求 100%（无意义的 defensive code 跳过）
- 不修改被测 hook 源代码
- 不增加集成测试

## Capabilities

### Modified Capabilities

- `portfolio-test-coverage`: 提升 hooks 层覆盖率阈值

## Impact

- 修改 7 个 `src/hooks/__tests__/*.test.ts` 添加更多用例
- 修改 jest.config.js 阈值
- 不改任何源代码
