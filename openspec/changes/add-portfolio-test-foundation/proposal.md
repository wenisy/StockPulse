## Why

当前 `src/hooks/` 下的核心 hooks（尤其是 `usePortfolioData.ts` 699 行、`useStockOperations.ts` 488 行）将**纯计算逻辑、React 状态管理副作用、HTTP/localStorage 等 IO** 三类职责揉在一起，且存在跨 hook 的重复实现（`updateStock` 与 `updateStockInternal` 是同一段逻辑的两份拷贝）。这种结构有两个直接后果：

1. **没有任何能保护重构的单元测试**：现有 1870 行集成测试（`StockPortfolioTracker.*.test.tsx`）全部打在最外层组件，重构 hook 拆分时测试就会跟着碎一片，但实际业务逻辑并未改变 —— 这正是"为重构而测"的反模式。
2. **业务规则散落在副作用里**：成本均价、卖出盈亏、年度增长率、占比、货币换算等核心计算公式埋在 `setYearData` 回调内部，无法独立验证、复用、推理。

用户已明确表达"准备开始一系列重构，但希望先有可靠的测试网"。**现在是建立测试基础的最佳时机** —— 在重构动手之前。

## What Changes

本提案是一个**框架性提案（meta-proposal）**，**不直接产出任何生产代码**。它的产出物是：

- 一份完整的"投资组合领域"规格契约（specs/portfolio-domain/spec.md），把当前散落在 hooks 中的业务规则、以及从历史测试和后端调研中提炼出的契约，**首次显式化**。
- 一份分层架构设计（design.md），定义 `src/lib/portfolio/`（纯函数）/ `src/hooks/`（薄壳）/ `src/components/`（UI）三层职责与依赖方向。
- 五个执行子提案（提案 1–5）的骨架规划与依赖顺序，每个都是可独立 review、可独立回滚的小切片。
- 三层各自的覆盖率验收阈值（lib 100% / hooks 80% / components 不强求）。

**明确不在本提案范围**：
- 抽取纯函数（提案 1 做）
- 编写纯函数测试（提案 2 做）
- 改造 hooks 调用 lib（提案 3 做）
- 编写 hook 测试（提案 4 做）
- 删除旧集成测试与根目录 `test-*.js`（提案 5 做）
- 后端 `stock-backend` 仓库的测试改造（不在本仓库范围）

## Capabilities

### New Capabilities

- `portfolio-domain`: 投资组合领域的核心计算与状态变换规则。覆盖加权成本价、卖出盈亏、现金交易余额与去重、货币换算、组合总价值、回报率、年度增长率、持仓占比、新建年份结转、跨年股票删除、行编辑合并、增量变更拼装。spec 同时记录"前后端职责分工"，明确"日内收益"归后端 `stock-backend/api/generateSnapshot.js` 独有，前端只通过 `POST /api/generateSnapshot` 消费。

### Modified Capabilities

无（本仓库 `openspec/specs/` 当前为空，无既有 spec 需要修改）。

## Impact

**受影响的代码区域**：
- 新增目录：`src/lib/portfolio/`（提案 1 落地）
- 新增目录：`src/lib/portfolio/__tests__/`（提案 2 落地）
- 现有目录：`src/hooks/`（提案 3 改造、提案 4 加测试）
- 现有目录：`src/components/__tests__/`（提案 5 清理）
- 根目录文件：`test-cash-transaction-duplicate.js`、`test-holdings-calculation.js`（提案 5 删除）

**受影响的工作流**：
- `package.json` 的 `test` / `test:coverage` 脚本不变
- `jest.config.js` 不变（`@/lib/*` 别名已支持）
- CI 暂不强制覆盖率阈值（提案中可讨论是否在 jest config 加 `coverageThreshold`）

**依赖与外部系统**：
- 不引入任何新依赖（Jest + RTL + jest-dom 已在 package.json）
- 不修改后端 `stock-backend` 仓库
- 不影响数据持久化格式、API 契约、用户数据
