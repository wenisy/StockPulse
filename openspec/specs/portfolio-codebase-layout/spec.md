# portfolio-codebase-layout Specification

## Purpose
TBD - created by archiving change extract-portfolio-pure-logic. Update Purpose after archive.
## Requirements
### Requirement: 投资组合纯函数库目录结构

`src/lib/portfolio/` 目录 SHALL 包含且仅包含以下 7 个模块文件，每个文件 SHALL 导出列出的函数。函数签名遵循"输入纯数据、返回新数据"的不可变风格。

| 模块 | 必须导出的函数 |
|---|---|
| `currency.ts` | `convertToCurrency`、`formatLargeNumber` |
| `cost-basis.ts` | `computeWeightedCostPrice`、`computeRemainingCostAfterSell`、`computeRealizedProfit` |
| `year-data.ts` | `applyCashTransactionToYear`、`applyStockTransactionToYear`、`carryOverYearData`、`removeStockFromAllYears`、`mergeEditedRowData` |
| `duplicate-tx.ts` | `isDuplicateCashTx` |
| `incremental.ts` | `appendStockTxIncremental`、`appendCashTxIncremental`、`appendYearlySummary` |
| `portfolio-metrics.ts` | `computePortfolioValue`、`computeReturnRate`、`computeAllocation`、`computeYearlyGrowth` |
| `years.ts` | `sortYearsDesc`、`computeLatestYear` |

#### Scenario: 新增模块或函数命名变更（破坏性）

- **WHEN** 任何后续提案要新增 lib 模块、删除现有模块、或重命名上表中的导出函数
- **THEN** MUST 通过修改本 spec 完成，不得在不更新 spec 的情况下静默改动

#### Scenario: 单个 lib 文件被引入到测试中

- **WHEN** 测试文件 `src/lib/portfolio/__tests__/cost-basis.test.ts` 仅 import `cost-basis.ts`
- **THEN** 该测试 MUST 能在不 mock 任何依赖、不 mount React 的情况下运行通过

---

### Requirement: lib 层依赖方向约束

`src/lib/portfolio/**` 下的源代码 MUST NOT import 以下任何模块：`react`、`react-dom`、`next`、`next/*`、`@/hooks/*`、`@/components/*`。该约束 SHALL 通过 ESLint `no-restricted-imports` 规则在静态层面强制执行。

#### Scenario: lib 文件尝试 import React

- **WHEN** 任何 `src/lib/portfolio/*.ts` 写入 `import { useState } from 'react'`
- **THEN** `npm run lint` MUST 报错并阻止合入

#### Scenario: lib 文件 import 自身或类型

- **WHEN** `cost-basis.ts` import `@/types/stock` 或 `./currency`
- **THEN** lint 通过（类型与同层 lib 之间允许互相依赖）

---

### Requirement: 与现有 hook 实现共存（提案 1 阶段）

本提案完成时，`src/hooks/usePortfolioData.ts` 与 `src/hooks/useStockOperations.ts` 中既有的等价实现 SHALL 保持原状不被删除或修改。lib 与 hook 此时形成"双份共存"，由后续提案 3 完成切换与去重。

#### Scenario: 提案 1 合入后 hook 行为不变

- **WHEN** 用户在 UI 上添加现金交易、买入股票、新建年份等
- **THEN** 行为与本提案合入前完全一致（hook 仍走自己的实现，未调用 lib）

### Requirement: hooks 必须通过 lib 完成领域计算

`src/hooks/**` 下的代码 SHALL NOT 内联实现以下任何领域计算（必须改为调用 `src/lib/portfolio/` 的对应函数）：

- 加权成本价、卖出剩余成本、实现盈亏的算式
- 现金交易后年度状态的不可变更新
- 股票交易后年度状态的不可变更新
- 新建年份的结转
- 跨年股票删除
- 行编辑合并保存
- 现金交易去重判定
- 货币换算与大数格式化
- 投资组合总价值、回报率、占比、年度增长率

#### Scenario: hook 内部出现等价于 lib 的算式

- **WHEN** 任何 hook 文件中出现 `(oldShares × oldCost + ...) / (oldShares + ...)` 这类加权成本价的本地实现
- **THEN** code review SHALL 拒绝合入并要求改为 `computeWeightedCostPrice(...)`

#### Scenario: hook 通过 lib 完成状态更新

- **WHEN** `addCashTransaction` 内部调用 `applyCashTransactionToYear`
- **THEN** 视为合规；hook 的 `setYearData(prev => applyCashTransactionToYear(prev, ...))` 是允许的标准范式

---

### Requirement: 删除 hook 间的重复实现

`useStockOperations.ts` 中的 `updateStockInternal` SHALL 被删除。`usePortfolioData.ts` 中的 `updateStock` 与 `useStockOperations.ts` 中之前的 `updateStockInternal` 这两份语义重复的实现 SHALL 收敛为同一条路径——即"由 hook 调用 lib 的 `applyStockTransactionToYear`"。

#### Scenario: 文件中仍存在 updateStockInternal

- **WHEN** 本提案合入后的 `useStockOperations.ts` 仍有 `updateStockInternal` 函数定义
- **THEN** 视为本提案未完成

#### Scenario: 两个 hook 都正确通过 lib 完成股票交易状态更新

- **WHEN** `usePortfolioData.updateStock` 与 `useStockOperations` 各自的交易处理路径都调用 `applyStockTransactionToYear`
- **THEN** 视为重复实现已收敛

### Requirement: 聚合 hook 模式

当多个子 hook 共同构成一个更大的业务能力时，SHALL 通过聚合 hook 向外暴露统一接口。聚合 hook MUST NOT 包含任何业务逻辑或状态，只负责组合子 hook 的返回值并透传给调用方。

#### Scenario: 聚合 hook 包含业务逻辑

- **WHEN** `usePortfolioData.ts`（聚合层）中出现 `useState` 或 `useCallback` 包裹业务操作
- **THEN** code review SHALL 要求将该逻辑下沉到对应的子 hook

#### Scenario: 聚合 hook 正确组合子 hook

- **WHEN** `usePortfolioData` 内部调用 `useYearData` 和 `usePortfolioSync` 并合并返回
- **THEN** 视为符合聚合 hook 模式，代码结构合规

### Requirement: 单文件 300 行软约束

`src/**/*.{ts,tsx}`（除 `__tests__/` 外）单文件 SHALL ≤ 300 行。超出时应拆分子组件 / 抽 hook / 提取 lib 纯函数；如确有合理原因（如纯函数本身需要长函数体）SHALL 在 design.md 中说明。

#### Scenario: 新增/修改后某文件超 300 行

- **WHEN** PR 中任何 `*.{ts,tsx}` 源文件（非 __tests__）超过 300 行
- **THEN** code review SHALL 询问是否可拆分；接受 design.md 中明确说明的例外

#### Scenario: 测试文件不受此约束

- **WHEN** `__tests__/*.test.{ts,tsx}` 行数超过 300
- **THEN** 视为合规

