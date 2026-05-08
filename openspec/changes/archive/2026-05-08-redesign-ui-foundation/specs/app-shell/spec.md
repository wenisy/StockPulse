## ADDED Requirements

### Requirement: 应用框架职责与结构

`src/components/shell/AppShell.tsx` SHALL 是整个应用的顶层布局容器，职责限定为：

- 渲染 `TopNav`、响应式渲染 `SideNav`（`md+`）或 `BottomTabBar`（`< md`）
- 渲染 `children`（即当前 section 内容）
- 挂载全局 `AlertDialog`、`Toaster`（若有）的 portal 根

MUST NOT 在 `AppShell` 内调用任何业务 hook（`usePortfolioData` 等），MUST NOT 直接读写 `localStorage`（主题与导航状态通过各自 hook 读取）。

#### Scenario: AppShell 内调业务 hook

- **WHEN** `AppShell.tsx` 出现 `usePortfolioData()` 调用
- **THEN** code review SHALL 拒绝，要求把业务状态下沉到具体 section 组件

#### Scenario: AppShell 组合导航与主题切换

- **WHEN** `AppShell` 渲染 `<TopNav />` 和根据 `useIsMobile()` 切换 `<SideNav>` / `<BottomTabBar>`
- **THEN** 视为合规

---

### Requirement: 响应式断点与导航形态

应用 SHALL 使用 Tailwind 的 `md`（≥ 768px）作为桌面/移动分水岭：

- `< md`：顶栏折叠入汉堡菜单（或仅保留 Logo + 用户头像） + 主内容 + 底部 `BottomTabBar`（高度 64px，`position: fixed bottom-0`）
- `≥ md`：顶栏（高度 56px） + 左侧 `SideNav`（宽度 224px，`position: sticky top-0`） + 主内容

主内容区 SHALL 在移动端保留底部 padding（≥ 80px）以避免被底栏遮挡。

#### Scenario: 移动端底栏遮挡内容

- **WHEN** 在 iPhone 尺寸查看页面，最后一个元素被底栏盖住
- **THEN** 视为违规，必须修正主内容区的 `padding-bottom`

#### Scenario: 桌面端显示侧栏

- **WHEN** 视口宽 ≥ 768px
- **THEN** 页面显示 `SideNav` 且 `BottomTabBar` 不渲染

---

### Requirement: 导航 section 列表

应用 SHALL 暴露且仅暴露以下 5 个一级 section（顺序固定）：

1. `overview` — 总览（默认）
2. `holdings` — 持仓
3. `transactions` — 交易流水
4. `charts` — 图表
5. `planner` — 规划（退休计算器 + 日历）

每个 section 必须有 id（kebab-case）、显示名、图标（来自 `lucide-react`）、`href` 形式的 URL 参数（如 `?view=overview`）。

#### Scenario: 增加第 6 个 section

- **WHEN** PR 直接在 `AppShell` 加入第 6 个 section 按钮
- **THEN** code review SHALL 要求先更新本 spec 的 section 列表再实现

#### Scenario: 删除某个 section

- **WHEN** 移除 `planner`
- **THEN** 必须先通过一个新的 OpenSpec change 以 `REMOVED` 形式修改本 spec

---

### Requirement: `useAppNavigation` hook 的契约

`useAppNavigation()` SHALL 返回 `{ activeSection: SectionId, setActiveSection: (id) => void, sections: SectionDescriptor[] }`；读取初始 section 的优先级 SHALL 为：URL `?view=` > localStorage `app-nav:section` > 默认 `overview`；setActiveSection SHALL 同步更新 URL 与 localStorage。

#### Scenario: URL 带参数初始化

- **WHEN** 用户访问 `/?view=holdings`
- **THEN** `activeSection === "holdings"` 且顶栏/侧栏高亮 Holdings

#### Scenario: 切换 section

- **WHEN** 用户点击侧栏 Charts
- **THEN** URL 变为 `/?view=charts`（用 `history.replaceState`，不刷新），localStorage 写入 `app-nav:section = "charts"`

#### Scenario: URL 参数无效

- **WHEN** 用户访问 `/?view=notexist`
- **THEN** fallback 到 localStorage 值或默认 `overview`，不抛错

---

### Requirement: Legacy 回退机制

应用 SHALL 在 URL 含 `?legacy=1` 时渲染原 `<StockPortfolioTracker/>`（legacy 长列表视图）；否则渲染 `<AppShell/>`。在所有 redesign-* sub-change 完成并通过验收前，legacy 分支 MUST NOT 删除。

#### Scenario: legacy 回退

- **WHEN** 用户访问 `/?legacy=1`
- **THEN** 页面渲染旧的 `StockPortfolioTracker` 单页长列表，新 shell 不渲染

#### Scenario: 默认访问

- **WHEN** 用户访问 `/`
- **THEN** 页面渲染 `AppShell` + 当前 section

#### Scenario: Legacy 懒加载

- **WHEN** 构建产物打包
- **THEN** `StockPortfolioTracker` 相关代码 SHALL 通过 `next/dynamic({ ssr: false })` 懒加载，默认访问不下载该 chunk

---

### Requirement: 顶栏内容与组合

`TopNav` SHALL 在所有断点下都渲染：

- 左侧：Logo（文字 `StockPulse` + `TrendingUp` 图标）
- 中部（仅 `md+`）：当前 section 的面包屑或标题
- 右侧：年度切换器（`YearSelector`）、主题切换按钮、用户头像/登录入口（来自现有 `UserProfileManager` 的 ref API，不改签名）

MUST NOT 在顶栏内嵌其它业务操作（如"添加交易"按钮），该类操作放在具体 section 的 `PageHeader` 内。

#### Scenario: 顶栏加业务按钮

- **WHEN** PR 在 `TopNav` 加入 `<Button>添加交易</Button>`
- **THEN** code review SHALL 要求把按钮移到对应 section 的 `PageHeader`

#### Scenario: 顶栏复用现有用户管理

- **WHEN** `TopNav` 通过 `useRef<UserProfileManagerRef>` 调 `profileRef.current.openLoginDialog()`
- **THEN** 视为合规（保持 UserProfileManager 命令式 API 不变）

---

### Requirement: 侧栏/底栏高亮规则

`SideNav` 与 `BottomTabBar` SHALL 根据 `useAppNavigation().activeSection` 高亮对应项；高亮态使用 `bg-accent/10 text-accent` 样式（通过 design tokens），未高亮项使用 `text-fg-muted`。

#### Scenario: 切换 section 后高亮跟随

- **WHEN** `setActiveSection("charts")` 被调用
- **THEN** `SideNav` 的 Charts 项立即变为高亮态，其它项变为未高亮

---

### Requirement: 键盘可达性

导航项 SHALL 为真正的 `<a>` 或 `<button>` 元素（而非 `<div onClick>`），并在 focus 时可见 focus ring（`focus-visible:ring-2 ring-accent`）。所有导航项 SHALL 支持键盘 Enter/Space 激活。

#### Scenario: 用 div 替代按钮

- **WHEN** 侧栏项使用 `<div onClick={...}>`
- **THEN** code review SHALL 要求改为 `<button>` 并补 `aria-label`

#### Scenario: focus ring 缺失

- **WHEN** 用户按 Tab 聚焦侧栏项但无视觉反馈
- **THEN** 视为违规
