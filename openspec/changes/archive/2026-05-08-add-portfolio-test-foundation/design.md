## Context

StockPulse 前端代码现状（截至本提案起草时）：

- `src/hooks/` 共 10 个 hooks，2743 行；其中两大巨型 hook：
  - `usePortfolioData.ts` 699 行：内部混合纯计算（`convertToCurrency`/`formatLargeNumber`）、状态变换（`addNewYear`/`addCashTransaction`/`updateStock`）、HTTP IO（`fetchJsonData`/`refreshPrices`/`saveDataToBackend`）三类职责。
  - `useStockOperations.ts` 488 行：表单状态 + 编辑状态 + 跨年合并保存 + 与 `usePortfolioData.updateStock` 几乎重复的 `updateStockInternal`。
- `src/components/__tests__/` 已有 1870 行测试，**全部绑定 `StockPortfolioTracker` 主组件**，业务逻辑通过组件渲染间接覆盖。该层测试在 hook 重构时极易碎裂，与"为重构而测"目标相悖。
- `src/lib/utils.ts` 仅 6 行（`cn` 函数），项目尚无"领域纯逻辑"层。
- 根目录有两个临时验证脚本（`test-cash-transaction-duplicate.js` / `test-holdings-calculation.js`），实际是后端 Notion 同步逻辑的探针，不属于前端职责。
- 后端 `stock-backend` 仓库**独立存在且没有任何单元测试**，前端通过 `BACKEND_DOMAIN` HTTP 调用消费快照、价格、同步等能力。

约束与既有事实：

- 已配置 Jest 29 + RTL 16 + jest-dom 6（`jest.config.js` / `jest.setup.js`），路径别名 `@/components`、`@/lib`、`@/types` 已就位。
- 用户全局规则要求遵守 Prettier、优先使用 CSS 文件、Chinese 沟通。
- OpenSpec 配置 `review_mode: parallel`，归档前需特性分支 + 推送 + MR。

## Goals / Non-Goals

**Goals:**

- 在 `src/lib/portfolio/` 下建立"投资组合领域"纯函数层，使所有业务计算可在不渲染组件、不 mount hook 的前提下被测试。
- 把当前散落在 hook 内部的业务规则**显式化为 spec 契约**（已在 `specs/portfolio-domain/spec.md` 完成）。
- 规划五个执行子提案的依赖顺序与切片边界，使每个子提案都是"可独立 review、可独立回滚、合入后仓库仍处于绿色可用状态"的最小单元。
- 定义三层覆盖率验收阈值：lib 100% line + 100% branch、hooks 80% line、components 不强求。
- 明确后端独占职责（日内收益）与前后端去重契约，作为 lint/review 阶段的护栏。

**Non-Goals:**

- 本提案**不抽取任何纯函数**（提案 1 做）。
- 本提案**不写任何测试用例**（提案 2/4 做）。
- 本提案**不改动 hooks**（提案 3 做）。
- 本提案**不删除任何旧测试或临时脚本**（提案 5 做）。
- 本提案**不接入 CI 覆盖率阈值**（建议在提案 2/4 完成后再做）。
- 本提案**不修改后端 `stock-backend` 仓库**。

## Decisions

### 决策 1：分层架构 —— 三层金字塔

```
┌──────────────────────────────────────────────────────────┐
│  src/components/         UI 层                           │
│  ─────────────────       薄编排，调 hooks                 │
└────────────────┬─────────────────────────────────────────┘
                 │ depends on
                 ▼
┌──────────────────────────────────────────────────────────┐
│  src/hooks/              React 状态 + 副作用编排层        │
│  ─────────────────       useState + useCallback +        │
│                          IO（fetch / localStorage）       │
│                          调 lib/portfolio                │
└────────────────┬─────────────────────────────────────────┘
                 │ depends on
                 ▼
┌──────────────────────────────────────────────────────────┐
│  src/lib/portfolio/      纯函数领域层                     │
│  ─────────────────       零副作用、零 React、零 IO        │
│                          可被任意上下文调用                │
└──────────────────────────────────────────────────────────┘
```

依赖方向严格自上而下，**lib 层 MUST NOT 依赖 hooks 或 React**。

**为何选三层而非两层（lib + hook 合一）：**

- 现有 hook 中的纯计算只占代码量约 15%，但它们正是重构最常动到、也最容易出错的部分。把它们独立出来后，纯函数测试在"hook 重构""换状态库""组件重组"等任意维度的重构下都不动。
- 两层方案下，纯计算依然要通过 `renderHook` 触发，测试会牵连 React 生命周期，反馈速度从毫秒级退化到几十毫秒级，且 mock 成本上升。

**替代方案（已否决）：**

- 直接给现有 hooks 写 `renderHook` 测试，不抽取 → 测试与实现强耦合，与"为重构而测"目标矛盾。
- 引入 Redux/Zustand 等状态库重构 → 范围爆炸，远超用户当前需求。

### 决策 2：纯函数模块切分

`src/lib/portfolio/` 内按"业务概念"切分子模块（非按 hook 切分），具体清单：

| 模块文件 | 职责 | 主要导出 |
|---------|------|---------|
| `currency.ts` | 货币换算与本地化格式化 | `convertToCurrency`、`formatLargeNumber` |
| `cost-basis.ts` | 持仓成本相关纯计算 | `computeWeightedCostPrice`、`computeRemainingCostAfterSell`、`computeRealizedProfit` |
| `year-data.ts` | 年度数据状态变换（不可变） | `applyCashTransactionToYear`、`applyStockTransactionToYear`、`carryOverYearData`、`removeStockFromAllYears`、`mergeEditedRowData` |
| `duplicate-tx.ts` | 现金交易去重判定（前端规则） | `isDuplicateCashTx` |
| `incremental.ts` | 增量变更拼装 | `appendStockTxIncremental`、`appendCashTxIncremental`、`appendYearlySummary` |
| `portfolio-metrics.ts` | 组合级聚合指标 | `computePortfolioValue`、`computeReturnRate`、`computeAllocation`、`computeYearlyGrowth` |
| `years.ts` | 年份数组工具 | `sortYearsDesc`、`computeLatestYear` |

**为何按业务概念切而非按 hook 切：**

- `useStockOperations` 与 `usePortfolioData` 之间存在重复实现（`updateStockInternal` vs `updateStock`），如果按 hook 切会把同一逻辑放进两个 lib 文件。按业务概念切自然完成去重。
- 未来 hook 可能合并/拆分，业务概念稳定。

### 决策 3：提案切片（风格 B：框架 + 多个执行）

依赖顺序与切片边界：

```
┌──────────────────────────────────────┐
│  提案 0  add-portfolio-test-foundation│ ← 当前提案
│  产出：spec + design + 子提案规划      │
│  代码改动：无                          │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  提案 1  extract-portfolio-pure-logic │
│  抽出 7 个 lib 模块（行为不变）         │
│  改动：新增 src/lib/portfolio/*.ts     │
│  hook 暂不修改，旧测试仍作为兜底网      │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  提案 2  test-portfolio-pure-logic    │
│  给所有 lib 函数补 100% 单测           │
│  改动：新增 src/lib/portfolio/__tests__│
│  目标：line 100% + branch 100%        │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  提案 3  refactor-hooks-to-use-pure-logic
│  hook 内部改调 lib，删除重复实现        │
│  改动：src/hooks/*.ts 内部             │
│  hook 对外签名保持不变（可由 spec 验证）│
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  提案 4  test-hooks                   │
│  10 个 hook 各加 1 个 renderHook 测试  │
│  目标：hook line 80%                   │
│  覆盖 IO 边界（mock fetch/localStorage）│
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  提案 5  cleanup-legacy-tests         │
│  删除 6 个旧测试文件 + 2 个根目录脚本   │
│  改动：删除 src/components/__tests__/  │
│        StockPortfolioTracker.*.test.tsx│
│        及根目录 test-*.js              │
│  保留：Combobox.test.tsx（与领域无关）  │
└──────────────────────────────────────┘
```

**关键时序约束：**

- 提案 1 推进期间，新 lib 函数尚无测试，但 hook 未改动 → 旧集成测试仍能跑（视为临时兜底）。
- 提案 2 完成后，lib 测试 100% 覆盖；提案 3 重构 hook 时**主要靠 lib 测试保护**。
- 提案 5 必须最后做：在 lib 测试 + hook 测试都到位之前不能删旧测试。

**为何不一次性大爆炸：**

- 切片让每个 PR 可在 30 分钟内审完。
- 每个提案都有独立的"完成定义"，便于个人节奏控制。

### 决策 4：覆盖率阈值

| 层 | line | branch | function | statement |
|---|---|---|---|---|
| `src/lib/portfolio/**` | 100% | 100% | 100% | 100% |
| `src/hooks/**` | 80% | 70% | 80% | 80% |
| `src/components/**` | 不强求 | 不强求 | 不强求 | 不强求 |

**为何 lib 强求 100%：**

- 纯函数没有"难以测试的边界"借口。
- 这是重构防回归的主防线。

**为何 hooks 设 80%：**

- IO 路径（fetch 失败、network error 重试等）允许略低，避免为追覆盖率写无意义的 mock。

**何时启用 jest `coverageThreshold`：**

- 提案 2 完成时启用 lib 阈值。
- 提案 4 完成时启用 hooks 阈值。
- 本提案**不修改 jest config**。

### 决策 5：测试组织约定

- 文件位置：`src/lib/portfolio/__tests__/<module>.test.ts`（与被测文件同名 + `.test.ts` 后缀）。
- 用例命名：用业务场景描述，不用函数名。例：`describe('加权成本价', () => { it('首次买入时成本价等于交易价', ...) })`。
- 一个 spec scenario 至少对应一个 `it` 用例。
- 浮点数比较一律用 `toBeCloseTo(expected, 2)`，不用 `toBe`。
- 测试不引入新 mock 库（`jest.fn` / `jest.mock` 已足够）。

### 决策 6：旧测试与临时脚本的处置时机

- **现在**：保留全部，包括 1870 行集成测试与根目录两个 `test-*.js`（决策延后到提案 5 执行）。
- **提案 1–4 推进期间**：旧测试不修复、不维护，只要"还能跑通"就让它继续跑作为兜底；如果中途因为 hook 内部调整而失败，**容忍其失败**（在 PR 描述中说明），不阻塞合入。
- **提案 5**：物理删除以下文件：
  - `src/components/__tests__/StockPortfolioTracker.test.tsx`
  - `src/components/__tests__/StockPortfolioTracker.basic.test.tsx`
  - `src/components/__tests__/StockPortfolioTracker.core.test.tsx`
  - `src/components/__tests__/StockPortfolioTracker.calculations.test.tsx`
  - `src/components/__tests__/StockPortfolioTracker.async.test.tsx`
  - `src/components/__tests__/test-helpers.ts`
  - 根目录 `test-cash-transaction-duplicate.js`
  - 根目录 `test-holdings-calculation.js`
- **保留**：`src/components/__tests__/Combobox.test.tsx`（185 行，针对独立 UI 组件，与 portfolio 领域无关）。

## Risks / Trade-offs

- **风险：spec 过细导致维护负担** → 缓解：spec 只描述"行为契约"（输入 → 输出 + 边界），不描述"如何实现"；后续 hook 内部重构时无需修改 spec。
- **风险：抽出的纯函数与现有 hook 行为不一致（提案 1 风险）** → 缓解：提案 1 推进期间保留旧集成测试作为临时回归网；提案 1 的 PR 描述要逐函数说明"从哪里抽出来 + 行为是否完全等价"。
- **风险：覆盖率阈值与开发节奏冲突** → 缓解：阈值不在本提案启用，而是在提案 2/4 完成时分两步启用；阈值仅作用于 `src/lib/portfolio/**` 与 `src/hooks/**` 两个目录，不影响其他代码。
- **风险：用户决策"全部删除旧测试"可能丢失隐性知识** → 缓解：本提案已从 `calculations.test.tsx` 与两个 `test-*.js` 中提取了 7+ 条业务断言写入 spec，删除时知识已落档。
- **权衡：未把后端 `stock-backend` 测试纳入** → 用户范围限定在前端；但 spec 已记录前后端职责分工与去重契约，避免未来误把后端逻辑搬到前端。
- **权衡：保留 `Combobox.test.tsx` 而非统一删除** → 它测的是 UI 组件而非业务规则，与本次重构方向无冲突，删除收益小于成本。

## Migration Plan

本提案无代码迁移（无代码改动）。子提案的发布节奏建议：

1. 当前提案合入并归档后，立即开始提案 1（不等任何外部条件）。
2. 提案 1 与提案 2 之间**不要并行**：必须先有可见的 lib 函数，再写测试。
3. 提案 3 应在提案 2 合入后开始，因为它依赖 lib 测试作为护栏。
4. 提案 4 可与提案 3 并行（不同文件，无依赖）。
5. 提案 5 必须在 1–4 全部合入并验证测试通过后做，作为收尾。

回滚策略：每个子提案都是独立 git 提交序列，单独 revert 即可。本提案 0 仅产生 OpenSpec 文档，回滚 = 删除目录。

## Open Questions

1. **提案 2 完成后是否在 jest config 启用 `coverageThreshold`？** 建议启用，但具体阈值数值（如 lib branch 是否真到 100%）等到测试落地后再调整。本提案 0 不解决此问题。
2. **是否在 lint 中增加"禁止 lib 引入 React"的规则？** 例如 `no-restricted-imports` 限制 `src/lib/**` 不许 import `react` / `next` / 任何 hook。建议在提案 1 落地时一起加，本提案 0 仅记录意向。
3. **`useCalendarData.ts` 中 `POST /api/generateSnapshot` 的请求体格式是否需要写进 spec？** 当前 spec 只锁定职责分工，未锁定具体请求体。建议在提案 4 写 hook 测试时如果发现 mock 困难，再回头补 spec。
