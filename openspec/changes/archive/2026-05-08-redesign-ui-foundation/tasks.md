## 1. 设计令牌（tokens 基础）

- [x] 1.1 新增 `src/lib/design/tokens.ts`，导出 `colors`、`spacing`、`radii`、`shadows`、`fontSize`、`motion` 等常量对象
- [x] 1.2 更新 `src/app/globals.css`：声明 light/dark 两套 CSS 变量（`--color-*`、`--radius-*`、`--motion-*`、`--shadow-*`），使用 `oklch()`
- [x] 1.3 更新 Tailwind 4 主题映射（`@theme` 指令），让 `bg-accent`、`text-fg`、`text-fg-muted`、`border-border-subtle` 等语义 class 直达 CSS 变量
- [x] 1.4 新增 `src/lib/design/__tests__/tokens.test.ts`：守护测试，断言 tokens.ts 键与 globals.css 变量名对齐

## 2. 主题系统

- [x] 2.1 在 `src/app/layout.tsx` `<head>` 顶部注入 inline blocking script：读 localStorage `theme` 并写 `<html data-theme=...>`，防 FOUC
- [x] 2.2 新增 `src/hooks/useTheme.ts`，返回 `{ theme, resolvedTheme, setTheme }`，使用 `useSyncExternalStore` 订阅 `matchMedia('(prefers-color-scheme: dark)')`
- [x] 2.3 新增 `src/components/ui/theme-toggle.tsx`：三态切换按钮（light / dark / system），图标来自 `lucide-react`
- [x] 2.4 新增 `src/hooks/__tests__/useTheme.test.ts`：覆盖显式/system/切换/FOUC 等场景

## 3. 基础原子组件（shadcn 风格）

- [x] 3.1 新增 `src/components/ui/section.tsx`：内容区卡片容器（`rounded-lg border bg-bg-elevated`）
- [x] 3.2 新增 `src/components/ui/page-header.tsx`：section 顶部标题 + 描述 + 右侧 actions slot
- [x] 3.3 新增 `src/components/ui/stat-card.tsx`：KPI 卡片（title、value、delta、icon），支持 tabular-nums
- [x] 3.4 新增 `src/components/ui/animated-number.tsx`：`requestAnimationFrame` 平滑过渡的数字组件（支持整数/小数/货币格式化）
- [x] 3.5 新增 `src/components/ui/empty-state.tsx`：空态组件（icon + title + description + optional action）
- [x] 3.6 新增 `src/components/ui/skeleton.tsx`（若不存在）：骨架屏基础件
- [x] 3.7 为以上每个新组件写最小单测（渲染 + className 合并 + 关键 prop 行为）

## 4. 应用框架 Shell

- [x] 4.1 新增 `src/hooks/useIsMobile.ts`：通过 `matchMedia('(max-width: 767px)')` + `useSyncExternalStore`
- [x] 4.2 新增 `src/hooks/useAppNavigation.ts`：返回 `{ activeSection, setActiveSection, sections }`，读写 URL + localStorage
- [x] 4.3 新增 `src/components/shell/TopNav.tsx`：Logo / section 标题 / YearSelector / ThemeToggle / UserAvatar 插槽
- [x] 4.4 新增 `src/components/shell/SideNav.tsx`：左侧垂直导航（`md+`）
- [x] 4.5 新增 `src/components/shell/BottomTabBar.tsx`：底部 5 Tab（`< md`）
- [x] 4.6 新增 `src/components/shell/AppShell.tsx`：组合以上，返回 `<div className="min-h-dvh flex flex-col md:flex-row">...`
- [x] 4.7 新增 `src/hooks/__tests__/useAppNavigation.test.ts`：覆盖 URL 初始化、切换、localStorage、无效值 fallback

## 5. 页面骨架与 Legacy 回退

- [x] 5.1 新增 `src/components/sections/PlaceholderSection.tsx`：占位视图（Icon + "section under construction"）
- [x] 5.2 新增 `src/components/sections/OverviewSection.tsx`、`HoldingsSection.tsx`、`TransactionsSection.tsx`、`ChartsSection.tsx`、`PlannerSection.tsx`：本批次内仅渲染现有 legacy 组件做"嵌入过渡"（Overview 嵌 `InvestmentOverview + PortfolioOverview`；Holdings 嵌 `StockTable`；Transactions 先用 Placeholder；Charts 嵌 `StockCharts`；Planner 嵌 `RetirementCalculator + ProfitLossCalendar`）
- [x] 5.3 改造 `src/app/page.tsx`：根据 `searchParams.legacy` 渲染 `<AppShell>` 或懒加载的 `<StockPortfolioTracker>`
- [x] 5.4 改造 `src/app/layout.tsx`：插入 FOUC 保护脚本、设置 `lang`、使用 `next/font` Geist
- [x] 5.5 `StockPortfolioTracker.tsx` 通过 `next/dynamic({ ssr: false })` 做 legacy 懒加载包装（新建 `src/components/LegacyTrackerEntry.tsx`）

## 6. 集成测试

- [x] 6.1 新增 `src/app/__tests__/page.test.tsx`：默认访问渲染 AppShell；`?legacy=1` 渲染 legacy 视图
- [x] 6.2 新增 `src/components/shell/__tests__/AppShell.test.tsx`：桌面/移动不同断点渲染正确的导航（用 `matchMedia` mock）
- [x] 6.3 运行 `npm run test:coverage` 确认 hooks 层 ≥ 85%、lib/portfolio 100% 维持

## 7. 文档与验收

- [x] 7.1 更新 `docs/guides/`（如无则新建 `docs/guides/design-system.md`）：列出语义色、动效时长、组件清单
- [x] 7.2 运行 `openspec validate redesign-ui-foundation --strict`
- [x] 7.3 运行 `npm run lint` + `npm run build` 验证构建通过
- [x] 7.4 用 Explore subagent 做独立 verifier + reviewer，修复 CRITICAL
- [x] 7.5 合入 main、push、`openspec archive redesign-ui-foundation -y`、更新 `archive/INDEX.md`
