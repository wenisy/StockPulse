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

