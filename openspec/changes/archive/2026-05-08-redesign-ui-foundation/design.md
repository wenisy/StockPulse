## Context

**现状**：StockPulse 的业务逻辑已经清理到位（lib/portfolio 100%、hooks 89% 覆盖），但 UI 层仍是"单页垂直长滚动 + 零散视觉"，不符合现代 SaaS dashboard 的交互预期，暗色模式也不完整。

**约束**：
- 不改数据层（hooks / lib / localStorage / 后端契约）。
- 不新增生产依赖（已有 Radix / shadcn / Tailwind 4 / Lucide / Recharts / tw-animate-css 足够）。
- 静态站点部署（GitHub Pages），所有导航必须在客户端完成，不能引入 SSR-only 特性。
- Next.js 16 App Router + React 19。
- 项目有强制测试覆盖率门槛。

**风格取向**：Linear / Vercel / Raycast ——克制的色彩、信息密度高、圆角中性（8-12px）、柔和阴影、tabular-nums 数字对齐、0.15-0.3s 微动效、深浅双主题都精致。

**利益相关者**：单人业主用户（开发者 + 最终用户同一人），无需向他人过审。决策偏好快速迭代、小步可回滚。

## Goals / Non-Goals

**Goals（本批次）**
1. 建立一套**单一事实源**的 design tokens，后续所有组件必须通过它引用色值、间距、圆角。
2. 完成 light/dark/system 三态主题，**无 FOUC**（初次渲染不闪）。
3. 落地应用框架骨架（TopNav + SideNav/BottomTab + Content），**移动端优先** 响应式。
4. 新增 5 个 section 的导航路由结构，**每个 section 暂用占位或 legacy 组件渡过**。
5. 保留 `?legacy=1` URL 参数可随时看旧版本用于对比/回退。
6. 测试：新增的 hooks/组件补到 hooks 层覆盖率 ≥85% 不掉。

**Non-Goals（本批次不做，留给后续 sub-change）**
- 不迁移任何业务模块的 UI（总览页、持仓表、交易流水、图表、规划、日历）——这些全部放在独立 sub-change。
- 不做国际化（i18n）抽离。
- 不做性能大改动（只做必要的 code split）。
- 不做数据获取方式改变（仍保持现有 hook + localStorage + 可选 backend）。

## Decisions

### D1. Design Tokens：CSS 变量 + TypeScript 镜像双轨

**选择**：在 `globals.css` 声明 CSS 变量（供 Tailwind 通过 `hsl(var(--color-bg))` 消费），同时在 `src/lib/design/tokens.ts` 里导出 TypeScript 常量镜像（供 JS 运行期读取，例如传给 Recharts 的 `stroke`）。

**为什么**：Tailwind 4 原生支持 `@theme` 指令读 CSS 变量；但 Recharts 这类库需要运行期 JS 值。两者分裂会让主题切换对图表失效。双轨 + 构建期一致性测试可兼得。

**替代方案**：纯 TS 常量 → 无法让 Tailwind class 自动随主题切换；纯 CSS 变量 → 图表无法响应主题。

**一致性保证**：新增 `tokens.test.ts`，断言 `tokens.ts` 的键与 `globals.css` 的 `--color-*` 变量名一一对应。

### D2. 主题切换：`[data-theme]` 属性 + `next-themes` 风格

**选择**：在 `<html>` 根加 `data-theme="light|dark"`，CSS 用 `[data-theme="dark"]` 覆盖变量。通过一段 **inline blocking script**（放在 `<head>` 顶部）在 React hydrate 前就读 localStorage 并设置 `data-theme`，避免 FOUC。

**为什么**：不引入 `next-themes` 库（项目偏好 0 新依赖）。Next.js App Router 允许在 `layout.tsx` 插入 `<script dangerouslySetInnerHTML>`，这是事实上的惯例做法。

**替代方案**：依赖 CSS `prefers-color-scheme` → 无法区分"用户显式选 light 但系统是 dark"；用 `next-themes` → 新依赖。

### D3. 响应式策略：Tailwind 断点 + 两种形态

**选择**：单一断点 `md`（768px）作为分水岭：
- `< md`：顶栏（折叠为汉堡菜单） + 内容区 + 底部 `BottomTabBar`。
- `≥ md`：顶栏 + 左侧 `SideNav`（宽 224px） + 内容区。

**为什么**：避免 3+ 断点带来的复杂布局 bug；绝大多数用户只有手机/桌面两种场景。

**替代方案**：`sm/md/lg` 三级 → 过度工程。

### D4. 路由：App Router 单页 + 客户端 section 状态

**选择**：**不**在 `src/app/` 下建子路由，而是把 section 切换做成客户端 state（持久化到 URL `?view=overview` + localStorage）。

**为什么**：
- 静态导出 + GitHub Pages 上子路由刷新会 404，除非配 rewrites。
- 所有 section 共享同一份 `yearData` / `stocks` 大 state，放同一组件树内 React 重渲染成本最低。
- 切 section 是"同页切 Tab"，不是真正的路由跳转。

**替代方案**：App Router 子路由 → 404 + 重复加载 state 成本；tanstack-router → 新依赖。

### D5. Legacy 保留策略：`?legacy=1` URL flag

**选择**：新 `page.tsx` 读 `searchParams`，若 `legacy=1` 则渲染原 `<StockPortfolioTracker/>`；否则渲染新 `<AppShell/>`。

**为什么**：零风险回滚。任何 section 没实现好、用户想看旧版本，URL 加一个参数就行。后续 sub-change 全部做完后再一次性删除 legacy。

### D6. 动效：CSS-only、已有依赖

**选择**：用 Tailwind 4 的 `transition-*`、`animate-in/out`（由 `tw-animate-css` 提供）、以及 `@keyframes`。不装 framer-motion。

**动效约定**：
- 时长等级：`--motion-fast: 120ms`、`--motion-base: 200ms`、`--motion-slow: 320ms`。
- 曲线：统一 `cubic-bezier(0.16, 1, 0.3, 1)`（ease-out-expo，感觉"吸附"）。
- 数字滚动：`<AnimatedNumber value={x} />` 用 `requestAnimationFrame` + `easeOutQuad`，60 帧内完成，不依赖库。

### D7. 字体：Geist 直接用，数字 tabular-nums

**选择**：Next.js 自带 `next/font/google` 或本地化 Geist Sans + Geist Mono；所有金额/比例字段加 `font-variant-numeric: tabular-nums` 保证对齐。

### D8. 原子组件命名

新增 shadcn 风格：`StatCard`（KPI 卡片）、`PageHeader`（区段标题）、`Section`（白底圆角容器）、`Kbd`（键盘键）、`EmptyState`、`Skeleton`。命名全部 PascalCase，文件 `src/components/ui/<kebab-case>.tsx`。

### D9. 颜色 palette

**语义色**：
- `--color-bg`、`--color-bg-elevated`、`--color-border`、`--color-border-subtle`
- `--color-fg`、`--color-fg-muted`、`--color-fg-subtle`
- `--color-accent`（品牌主色，可由用户切换）、`--color-accent-fg`
- `--color-success`、`--color-warning`、`--color-danger`、`--color-info`

**主色方案**：默认 `indigo-500` 系 → 存 localStorage，后续可选 `emerald / rose / amber / violet`。本批次只实现"读取 + 默认 indigo"，切换 UI 留给后续。

**暗色策略**：用 `oklch()` 定义（Tailwind 4 默认），对暗色下对比度更稳定；不用简单 `#000` 黑，而是 `oklch(0.18 0.02 240)` 这类偏冷深蓝灰。

## Risks / Trade-offs

- **R1：内联主题 script 易跟 React 19 hydration 冲突** → 只在 script 里设置 `data-theme`，不碰 React 管理的 DOM；React 端再用 `useSyncExternalStore` 读取当前主题。
- **R2：CSS 变量和 TS 镜像漂移** → 加 `tokens.test.ts` 作为守护测试，任何一边加字段没同步就 fail。
- **R3：Legacy 分支长期存在导致 bundle 变大** → 用 `next/dynamic({ ssr: false })` 懒加载 legacy，只有 `?legacy=1` 访问时才下载。
- **R4：导航 section 状态与 URL 不一致** → 统一走 `useAppNavigation`，所有读/写 section 必须经过它；直接访问 `?view=xxx` URL 也会被读进初始 state。
- **R5：移动端底栏遮挡内容** → 主内容区 `pb-20 md:pb-0`，底栏 `position: fixed`，主内容补偿内边距。
- **R6：shadcn 组件升级期间旧组件并存，样式不统一** → 本批次只新增原子件 + 骨架，不动老组件；后续 sub-change 逐步替换时再消除。

## Migration Plan

### 上线顺序（严格）
1. 合入本批次：`design-system` + `app-shell` 骨架；默认 URL 仍进新壳，但每个 section 内嵌 legacy 组件内容，视觉上几乎等同于旧版（只是多了顶栏/侧栏/底栏包装）。
2. 观察 1-N 天（无监控也无妨，仅本地 + CI 验证）。
3. 按序合入后续 sub-change（每个独立 propose）：
   - `redesign-overview-section`（KPI + 走势图 + 快捷操作）
   - `redesign-holdings-section`（持仓表 + 编辑抽屉）
   - `redesign-transactions-section`（交易流水 + 筛选）
   - `redesign-charts-section`（重绘 Recharts 图表样式）
   - `redesign-planner-section`（退休计算器重设计）
   - `redesign-calendar-section`（月历热力图重设计）
   - `redesign-user-panel`（登录/注册/资料面板）
   - `redesign-cleanup-legacy`（最后删掉 `StockPortfolioTracker` + `?legacy=1` 分支）

### 回滚
- **本批次内任何问题**：`git revert` 本次合并即可，hooks/lib 未动。
- **某个 sub-change 上线后发现问题**：用户访问 `?legacy=1` 立刻拿到完整旧版；同时项目作者可 revert 对应 sub-change。
- **所有 sub-change 完成后**：`?legacy=1` 与 Legacy 代码才一次性删除。

## Open Questions

1. **主色强度**：默认 indigo-500 是否足够"金融感"？还是换 emerald-500（涨跌感）？ → 暂按 indigo，主色切换 UI 后续再做，用户可自由选。
2. **Logo**：项目目前无 logo，本批次先用"文字 Logo `StockPulse`" + 一个 `lucide-react` 的 `TrendingUp` 图标；正式 logo 后续再议。
3. **是否保留年度选择器在 TopNav**：目前年度是核心全局状态，放顶栏右侧下拉；若 section 内部也有年度相关内容，以顶栏为准，section 内不再重复。
4. **键盘快捷键系统**：是否在本批次顺便加 `Cmd+K` 命令面板？ → 不。留给后续 `add-command-palette` 独立提案，避免范围蔓延。
