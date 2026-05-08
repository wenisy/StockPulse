## Why

StockPulse 当前是一个单页垂直长列表布局：头部 → 控制面板 → 投资总览 → 组合总览 → 退休计算 → 图表 → 表格 → 日历报表，所有模块堆在同一个滚动视口内。信息无层次、移动端滚动冗长、视觉语言（色彩/间距/圆角/阴影）零散，暗色模式支持不完整。业务逻辑已在前几轮重构中被抽离到 `src/lib/portfolio/` 与 `src/hooks/` 之下、测试覆盖率稳定在 hooks 89% / lib 100%，**这是一次只动 UI 层、不动数据层**的低风险改版时机。

本提案（本批次）**只交付改版的"总纲 + 设计系统基础 + 应用框架骨架"**：产出 design tokens、主题系统、应用层导航框架（顶栏 + 侧栏/底栏）、路由骨架与空壳页面。后续的"总览页 / 持仓页 / 交易页 / 图表页 / 规划页 / 日历报表 / 用户面板"各自独立再走 propose → apply → archive，保证小步快跑、可随时停住。

## What Changes

### 设计系统（新增 Capability：`design-system`）
- 新增 `src/lib/design/tokens.ts`：颜色、间距、圆角、阴影、字体尺寸等设计令牌 (design tokens) 的单一事实源。
- 新增 `src/app/globals.css` 里的 CSS 变量体系：light/dark 双主题 + 系统跟随，所有颜色通过 `hsl(var(--token))` 引用，不再散落硬编码色值。
- 新增 `ThemeProvider` + `useTheme` hook：切换 light / dark / system，localStorage 持久化；SSR 期间防止闪烁（FOUC 保护）。
- 扩展 `src/components/ui/` shadcn 基础件：统一改用新 tokens、新增 `Skeleton`、`Badge`（如未有）、`Kbd`、`StatCard`、`Section`、`PageHeader` 等应用层原子组件。
- 动效约定：仅用 Tailwind `transition-*` + `tw-animate-css` + CSS keyframes（已在依赖中），不引入 framer-motion。
- 字体：使用 Geist Sans（Next.js 内置）+ Geist Mono；数字统一 tabular-nums，保证对齐。

### 应用框架（新增 Capability：`app-shell`）
- 新增 `src/components/shell/AppShell.tsx`：桌面端 = 顶部 `TopNav` + 左侧 `SideNav` + 主内容区；移动端 = 顶栏 + 底部 `BottomTabBar` + 汉堡侧抽屉。
- 新增 `src/components/shell/TopNav.tsx`：Logo、主导航、年度切换器、主题切换、用户头像/登录入口。
- 新增 `src/components/shell/SideNav.tsx` & `BottomTabBar.tsx`：5 个主区段导航（Overview / Holdings / Transactions / Charts / Planner）。
- 新增 `useAppNavigation` hook：当前激活 section、切换 section、持久化上次选择。
- Tab 内容由"占位 PlaceholderView 组件"占位，等待后续 sub-change 逐一实现。

### 页面骨架（占位不含业务迁移）
- `src/app/page.tsx` 改造为：`<AppShell><ActiveSectionView/></AppShell>`。
- 当前的 `StockPortfolioTracker`（297 行主组件）**不删不改**，而是作为"Legacy 视图"挂在一个隐藏 `?legacy=1` URL 参数下保留，便于并排对比与快速回滚。
- 新增 5 个 section 容器：`OverviewSection`、`HoldingsSection`、`TransactionsSection`、`ChartsSection`、`PlannerSection`，本批次内全部仅渲染 `<PlaceholderView/>` 以及"来自 legacy 的对应旧组件"作为过渡视图。
- 后续每个 sub-change 会"拿掉某个 section 的 legacy 内嵌、替换为全新设计"。

### 对外契约
- **不改**任何 hook 签名、lib/portfolio 纯函数签名、数据结构、localStorage key、后端 API 契约。
- **不改**现有测试（保持 342 个测试全绿、覆盖率门槛不降）。

## Capabilities

### New Capabilities
- `design-system`：设计令牌、主题系统、基础原子组件的契约（命名、CSS 变量、暗色/浅色双主题规则、动效时长等级、字体规范）。
- `app-shell`：应用框架的契约（顶栏/侧栏/底栏结构、响应式断点、导航 section 列表、当前 section 持久化规则）。

### Modified Capabilities
- `component-structure`：新增对 `src/components/shell/` 与 `src/lib/design/` 的结构约束；保留既有 tracker / user / calendar 子目录规则不变。

## Impact

- **受影响代码**：
  - 新增 `src/lib/design/tokens.ts`、`src/lib/design/theme.ts`
  - 新增 `src/hooks/useTheme.ts`、`src/hooks/useAppNavigation.ts`
  - 新增 `src/components/shell/*`、`src/components/ui/` 若干原子件
  - 改造 `src/app/page.tsx`、`src/app/layout.tsx`、`src/app/globals.css`
  - `StockPortfolioTracker.tsx` 仅新增 `?legacy=1` 入口分支，内部不动
- **不受影响**：`src/lib/portfolio/**`、`src/hooks/use{Portfolio,Stock,Calendar,Chart,Year,User}*` 等全部业务 hook 与纯函数。
- **依赖**：不新增生产依赖；`tw-animate-css`、Radix、Lucide、Recharts 已在 package.json。
- **测试**：新增 design-system + app-shell 相关测试用例约 25+，整体覆盖率门槛维持 hooks ≥85% / portfolio 100%。
- **构建与部署**：Next.js 静态导出流程不变；GitHub Pages 部署路径不变。
- **风险**：极低——不改数据层；legacy 视图在整批 sub-change 完成前一直可回退。
