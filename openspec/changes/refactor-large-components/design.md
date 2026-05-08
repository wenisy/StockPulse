## Context

经过 7 个已归档提案的累积，仓库已具备：

- `src/lib/portfolio/` 100% 覆盖的纯函数层
- `src/hooks/` 14 个 hook 全部有测试，已拆为单职责（useYearData/usePortfolioSync/useStockForm/useStockRowEdit）
- 264 个测试用例，CI 强制 lint + test:coverage + build

但**组件层仍是大泥球**：
- `ProfitLossCalendar.tsx`（872 行）：日历视图 + 年度汇总 + 快照生成 + 美东时间同步混在一起
- `UserProfileManager.tsx`（649 行）：登录 + 注册 + 个人资料 + ref 暴露 4 个独立弹窗流程
- `StockPortfolioTracker.tsx`（553 行）：16 个 useState，作为应用入口聚合了所有 hooks 和子组件

这三个文件**完全没有测试**，是仓库剩下的最大风险点。

## Goals / Non-Goals

**Goals:**
- 3 个组件先有 ≥ 80% 集成测试覆盖，再做重构
- 重构后每个组件文件 ≤ 300 行（spec 软约束）
- 重构不改变组件对外 props/ref API
- 拆出的新 hook 各 ≤ 200 行（与 refactor-hooks-structure 一致）
- 全程 npm test 不退化、CI 持续绿色

**Non-Goals:**
- 不重构 `usePortfolioSync.ts`（374 行但已有测试，可后续单独提案）
- 不修改 `src/lib/portfolio/`
- 不改业务行为
- 不修改组件对外 API
- 不引入 Zustand/Redux 等

## Decisions

### 决策 1：测试先行（硬约束）

每个组件**必须先有 ≥ 80% line 覆盖率的集成测试 + tests passing**，才能开始重构。Phase 1 完成后必须：

- 运行 `npm test` 全部通过
- 运行 `npm run test:coverage` 三个组件 line 覆盖 ≥ 80%
- commit Phase 1 测试到独立 branch
- 才开始 Phase 2 重构

理由：用户原话"如果没有对应的测试的话, 需要先添加测试, 跑完证明没问题之后, 再去重构"。这是用户最关心的安全网。

### 决策 2：测试策略 —— 集成测试

不抽纯函数到 lib 后单测（这条路线 hooks 重构已经走过了），直接对组件做集成测试：

- 用 `@testing-library/react` 渲染整个组件
- mock `global.fetch` + `localStorage` + 业务 hooks（`useUserManagement`、`useUserSettings`、`useCalendarData` 等）
- 触发用户交互（点击、输入、切换）
- 断言 DOM 状态变化或 mock 调用参数

**为何选集成测试而非拆函数后单测**：
- 这 3 个组件的核心是"UI + 状态编排"，纯逻辑很少
- 集成测试能保证"重构前后用户看到的行为一致"，正是安全网的本质
- 单测拆出的纯函数对 UI 组件帮助有限

**测试边界**：
- mock 业务 hooks（如 `usePortfolioData` 整个 mock）：避免测试意外覆盖了 hook 实现细节
- 不 mock UI 库（shadcn/Radix）：让真实 DOM 渲染
- 时间相关用 `jest.useFakeTimers()` 控制

### 决策 3：组件拆分模式

**ProfitLossCalendar（872 → ~300）**：

```
src/components/calendar/
├── ProfitLossCalendar.tsx       主组件（编排）≤ 200 行
├── MonthlyCalendarView.tsx      按日视图 ≤ 200 行
├── YearlySummaryView.tsx        年度汇总视图 ≤ 200 行
└── hooks/
    ├── useCalendarView.ts       视图状态 ≤ 100 行
    └── useSnapshotGeneration.ts 快照生成 ≤ 100 行
```

**UserProfileManager（649 → ~200）**：

```
src/components/user/
├── UserProfileManager.tsx       主组件 + forwardRef（≤ 200 行）
├── LoginDialog.tsx              登录对话框 ≤ 150 行
├── RegisterDialog.tsx           注册对话框 ≤ 150 行
├── ProfileEditDialog.tsx        资料编辑对话框 ≤ 150 行
└── hooks/
    ├── useAuthDialogs.ts        弹窗状态聚合 ≤ 100 行
    └── useUserAuthApi.ts        登录/注册 fetch 封装 ≤ 100 行
```

**StockPortfolioTracker（553 → ≤ 250）**：

```
src/components/tracker/
├── StockPortfolioTracker.tsx    主入口 + layout（≤ 250 行）
├── PortfolioTrackerHeader.tsx   顶部状态栏 ≤ 150 行
└── hooks/
    └── useTrackerState.ts       聚合 16 个 useState ≤ 150 行
```

**为何选这种细分**：
- 每个新文件都对应一个清晰的职责
- 主组件变成编排器，可读性高
- forwardRef API 保留在主文件，向下兼容

### 决策 4：保留 forwardRef API

`UserProfileManager` 通过 `forwardRef + useImperativeHandle` 暴露 `openLoginDialog` / `openRegisterDialog` / `openProfileDialog` / `logout` 给父组件。重构后**继续保留这个 API**，把弹窗控制权交给 `useAuthDialogs` hook，主组件通过 `useImperativeHandle(ref, () => ({ ... }))` 转发到 hook。

调用侧（`StockPortfolioTracker`）零改动。

### 决策 5：分支策略

考虑到工作量大（预计 ~4000 行新代码），切两个独立 branch：

- `feat/component-tests` —— Phase 1 完成后 merge
- `feat/refactor-large-components` —— Phase 2 完成后 merge

或者一个长 branch 内分两个 commit phase。本次会话用单 branch 简化，但 commit 严格分两组。

### 决策 6：ProfitLossCalendar 集成测试用什么数据驱动

由于 `ProfitLossCalendar` 依赖 `useCalendarData` hook（fetch 后端 API），测试中：
- 直接 mock `useCalendarData` 返回 fixture（避免双层 mock）
- 测试关注：渲染网格 / 点击单元格 / 切换月份 / 切视图 / 生成按钮

### 决策 7：测试目录约定

继续用 `src/components/__tests__/` 平铺存放测试。重构后子组件目录变成：
```
src/components/calendar/
src/components/calendar/__tests__/   ← 子组件测试
```

主组件测试仍在 `src/components/__tests__/`，方便集成层定位。

## Risks / Trade-offs

- **风险：集成测试脆弱**（依赖大量 DOM 查询），重构时容易碎裂 → 缓解：测试断言用 `getByRole` / `getByText` 等语义查询，避免 `getByTestId`，让重构后只要"用户能看到的还在"就不破。
- **风险：mock fetch 复杂度高** → 缓解：用 `jest.fn().mockResolvedValueOnce` 串接，每个用例独立 setup。
- **风险：useImperativeHandle 在拆分后行为变化** → 缓解：写 ref-触发的专门测试用例，重构前后跑两遍验证。
- **风险：Phase 1 完成后 Phase 2 的工作量被低估** → 接受：如果 Phase 2 中途发现某个组件太复杂，可以拆为后续单独提案，本提案至少完成测试网。
- **权衡：测试 mock 业务 hook 而不 mock 子组件** → 选这条路线让测试更接近用户视角，同时避免与具体 DOM 结构耦合。

## Migration Plan

```
Phase 1：补测试
1. 给 ProfitLossCalendar 写测试 → 跑通
2. 给 UserProfileManager 写测试 → 跑通
3. 给 StockPortfolioTracker 写测试 → 跑通
4. npm run test:coverage 三组件 line ≥ 80%
5. commit Phase 1
6. /tcsc:review-pipeline（验证测试质量）

Phase 2：重构
1. 拆 ProfitLossCalendar → 跑测试不退化
2. 拆 UserProfileManager → 跑测试不退化
3. 拆 StockPortfolioTracker → 跑测试不退化
4. commit Phase 2
5. /tcsc:review-pipeline（验证重构质量）
6. push + merge + archive
```

每个组件拆完都立即跑全量测试，发现红色立即停下修复。

## Open Questions

1. `usePortfolioSync.ts` 374 行也超 300 行但有测试，要不要顺便拆？建议**不拆**，本次只解决"零测试 + 大文件"的双重风险，已有测试的文件后续单独提案。
2. 测试中 fixture 数据放哪？建议测试文件内联，本次工作量不需要全局 fixture 库。
