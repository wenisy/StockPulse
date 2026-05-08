## ADDED Requirements

### Requirement: 应用级目录新增结构

仓库 SHALL 在 `src/` 下引入两个新目录：

- `src/lib/design/` — 设计令牌与主题工具（`tokens.ts`、`theme.ts`）
- `src/components/shell/` — 应用框架与导航组件（`AppShell.tsx`、`TopNav.tsx`、`SideNav.tsx`、`BottomTabBar.tsx`、`hooks/useAppNavigation.ts`）

`src/components/shell/` 内 SHALL 只包含"应用框架"相关组件，MUST NOT 放置任何业务 section（`OverviewSection` 等必须放在 `src/components/sections/` 下）。

#### Scenario: 把业务 section 放进 shell

- **WHEN** 新增 `src/components/shell/OverviewSection.tsx`
- **THEN** code review SHALL 要求改为 `src/components/sections/OverviewSection.tsx`

#### Scenario: 把设计令牌放进 hooks

- **WHEN** 新增 `src/hooks/tokens.ts`
- **THEN** code review SHALL 要求改为 `src/lib/design/tokens.ts`

---

### Requirement: Shell 组件的职责边界

`src/components/shell/*.tsx` MUST NOT 调用业务 hook（`usePortfolioData`、`useStockData` 等），MUST NOT 直接读写 `localStorage` 或 `fetch`；它们 SHALL 仅消费：

- `useTheme`、`useAppNavigation`、`useIsMobile` 等纯 UI hook
- props（如 TopNav 可接收 `profileRef` 用于唤起登录弹窗）

#### Scenario: TopNav 调业务 hook

- **WHEN** `TopNav.tsx` 出现 `usePortfolioData()`
- **THEN** code review SHALL 拒绝合入
