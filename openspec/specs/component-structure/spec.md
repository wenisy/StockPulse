# component-structure Specification

## Purpose
TBD - created by archiving change refactor-large-components. Update Purpose after archive.
## Requirements
### Requirement: 大组件重构前必须先有集成测试

任何超过 300 行的 React 组件 SHALL 在重构（拆分文件、提取 hook、移动代码）**之前**先有集成测试，且测试 SHALL 满足：

- 使用 `@testing-library/react` 渲染整个组件
- 至少覆盖：初始渲染、主要用户交互（点击/输入/切换/ref API）、API 失败兜底
- 重构前后测试集合 MUST 保持通过
- 不强求具体 line 覆盖率数字（避免为追指标写脆弱断言）；以"重构能否安全推进"为首要目标

#### Scenario: 大组件无测试时直接重构

- **WHEN** 有 PR 直接重构 `ProfitLossCalendar.tsx` / `UserProfileManager.tsx` / `StockPortfolioTracker.tsx` 但未先添加测试
- **THEN** code review SHALL 拒绝合入，要求先补测试

#### Scenario: 测试通过后重构破坏行为

- **WHEN** 重构 commit 导致已有集成测试 failing
- **THEN** 该重构 MUST 修复或回滚，CI 阻止合入

---

### Requirement: 重构后组件文件 ≤ 300 行

`src/components/**/*.tsx` 中的单文件 SHALL ≤ 300 行（含注释和类型定义）。超出时必须拆分为子组件、抽取 hook 或抽取纯函数到 lib 层。

#### Scenario: 重构完成后某文件仍 > 300 行

- **WHEN** 重构 PR 合入后存在 `*.tsx` 文件超过 300 行
- **THEN** code review SHALL 要求继续拆分或在 design.md 中明确说明合理原因

#### Scenario: 测试文件不计入限制

- **WHEN** `__tests__/*.test.tsx` 超过 300 行
- **THEN** 视为合规，因为测试文件主要由数据 fixture 和场景描述组成

---

### Requirement: 组件拆分边界

重构后每个文件 SHALL 遵守以下职责边界：

- **主组件**（如 `ProfitLossCalendar.tsx`）：layout 编排、组合子组件和 hook，避免内联业务状态
- **子组件**（如 `MonthlyCalendarView.tsx`）：纯视图，不包含 fetch / localStorage 调用
- **业务 hook**（如 `useCalendarView.ts`）：状态管理 + 操作编排，按业务概念命名
- **API hook**（如 `useUserAuthApi.ts`）：fetch 封装

#### Scenario: 子组件中调 fetch

- **WHEN** `MonthlyCalendarView.tsx` 中出现 `fetch(...)` 调用
- **THEN** code review SHALL 要求把 IO 逻辑移到 hook 层

#### Scenario: 主组件包含大量 useState

- **WHEN** 重构后的主组件文件仍有 5+ 个 useState 用于业务状态（不计 UI 状态如 dialogOpen）
- **THEN** code review SHALL 建议进一步抽取业务 hook

---

### Requirement: forwardRef API 向下兼容

使用 `forwardRef + useImperativeHandle` 暴露命令式 API 的组件（如 `UserProfileManager`），在拆分重构后 MUST 保持原 API 不变（方法名、签名、行为）。

#### Scenario: 重构破坏 ref API

- **WHEN** 父组件通过 `userProfileRef.current.openLoginDialog()` 调用，重构后该方法不存在或行为不一致
- **THEN** TypeScript 编译失败或集成测试 failing，CI 阻止合入

#### Scenario: 拆分后正确转发 API

- **WHEN** 重构后主组件用 `useImperativeHandle(ref, () => useAuthDialogs())` 把 hook 暴露的方法转发到 ref
- **THEN** 视为合规

---

### Requirement: 集成测试 mock 边界

组件集成测试 SHALL 仅 mock IO 边界（`fetch` / `localStorage` / `Date`）和业务 hook（如整个 `usePortfolioData`），MUST NOT mock UI 库（shadcn/Radix）或子组件。

#### Scenario: 测试 mock 子组件

- **WHEN** `ProfitLossCalendar.test.tsx` 中出现 `jest.mock('../MonthlyCalendarView')`
- **THEN** code review SHALL 要求改为渲染真实子组件

#### Scenario: 测试 mock 业务 hook（合规）

- **WHEN** `StockPortfolioTracker.test.tsx` 中 `jest.mock('@/hooks/usePortfolioData')` 返回 fixture
- **THEN** 视为合规，因为业务 hook 已经在 hook 测试中被覆盖

