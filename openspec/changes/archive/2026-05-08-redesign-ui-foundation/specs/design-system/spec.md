## ADDED Requirements

### Requirement: 单一事实源的 design tokens

所有颜色、间距、圆角、阴影、字体尺寸、动效时长 SHALL 通过 `src/lib/design/tokens.ts` 的导出常量 **或** `src/app/globals.css` 的 `--*` CSS 变量统一访问；MUST NOT 在业务组件中硬编码 `#xxxxxx`、`rgb(...)`、具体像素值等原始值（动画过渡 `transition-*` Tailwind class 除外）。

#### Scenario: 业务组件硬编码颜色

- **WHEN** `src/components/**/*.tsx`（非 `ui/` 原子层）的 className 或 style 出现 `#1e90ff`、`rgb(30,60,90)` 等字面色
- **THEN** code review SHALL 拒绝，要求改用 Tailwind 语义 class（`bg-accent`、`text-fg-muted`）或 CSS 变量

#### Scenario: 原子层正确引用 tokens

- **WHEN** `src/components/ui/stat-card.tsx` 的容器使用 `className="bg-bg-elevated text-fg border-border rounded-lg"`
- **THEN** 视为合规

---

### Requirement: CSS 变量与 TS 常量双轨一致

`src/lib/design/tokens.ts` 中的颜色键（例如 `colors.accent`、`colors.fgMuted`）SHALL 与 `src/app/globals.css` 中的 CSS 变量（例如 `--color-accent`、`--color-fg-muted`）一一对应；新增/删除任何一侧 MUST 同步另一侧，且由一个守护测试强制校验。

#### Scenario: 新增 CSS 变量未同步到 TS

- **WHEN** `globals.css` 新增 `--color-brand-secondary` 但 `tokens.ts` 未更新
- **THEN** `tokens.test.ts` 断言失败，CI 阻止合入

#### Scenario: TS 与 CSS 两侧命名漂移

- **WHEN** TS 有 `colors.foregroundMuted`，但 CSS 变量名是 `--color-fg-muted`
- **THEN** 守护测试 SHALL 将 TS 的 camelCase 与 CSS 的 kebab-case 做双向映射校验，漂移时失败

---

### Requirement: 双主题无 FOUC

应用 SHALL 支持 `light` / `dark` / `system` 三种主题模式，并且在页面**首次渲染前** 就将正确的 `data-theme` 属性写入 `<html>`，确保用户刷新页面时不出现闪白或闪黑。

#### Scenario: 用户显式选 dark 刷新页面

- **WHEN** localStorage 中 `theme = "dark"` 且用户刷新页面
- **THEN** 浏览器解析 HTML 时 `<html data-theme="dark">` 已设置好，不会出现白底闪烁

#### Scenario: 用户未选择主题

- **WHEN** localStorage 无 `theme` 且系统为暗色
- **THEN** 页面以 `data-theme="dark"` 渲染，切换系统主题时应用主题跟随变化（仅当用户未显式选择时）

#### Scenario: 用户显式选 light 但系统是 dark

- **WHEN** localStorage `theme = "light"` 且系统为暗色
- **THEN** 页面保持 light 主题，**不** 跟随系统

---

### Requirement: `useTheme` hook 的契约

`useTheme()` SHALL 返回 `{ theme: "light" | "dark" | "system", resolvedTheme: "light" | "dark", setTheme: (t) => void }`；`resolvedTheme` 在 `theme === "system"` 时反映系统实际值，否则等于 `theme`。

#### Scenario: 切换主题

- **WHEN** 调用 `setTheme("dark")`
- **THEN** localStorage 存 `theme=dark`，`<html>` 的 `data-theme` 改为 `dark`，下次读 `theme` 返回 `"dark"`

#### Scenario: system 模式下系统主题改变

- **WHEN** `theme === "system"` 时用户在操作系统切到浅色
- **THEN** `resolvedTheme` 从 `"dark"` 变为 `"light"`，组件重新渲染

---

### Requirement: 动效时长分级

所有 CSS 过渡/动画 SHALL 使用 3 级标准时长：`fast`（120ms）、`base`（200ms）、`slow`（320ms），曲线统一使用 `cubic-bezier(0.16, 1, 0.3, 1)`。MUST NOT 在业务代码中使用非标准时长（如 `duration-150`、`duration-500`）除非在 design.md 说明。

#### Scenario: 业务组件用随意时长

- **WHEN** `HoldingsSection.tsx` 使用 `transition-all duration-500`
- **THEN** code review SHALL 要求改为 `duration-[var(--motion-slow)]` 或标准 Tailwind 语义类

#### Scenario: 使用标准时长

- **WHEN** 组件使用 `transition-colors duration-[var(--motion-fast)] ease-[cubic-bezier(0.16,1,0.3,1)]`
- **THEN** 视为合规

---

### Requirement: 数字字段 tabular-nums

所有显示金额、比例、股数、百分比的 UI SHALL 应用 `font-variant-numeric: tabular-nums` 或 Tailwind `tabular-nums` class，以保证等宽对齐。

#### Scenario: 表格金额列未用 tabular-nums

- **WHEN** `HoldingsSection` 的市值列使用默认比例字体
- **THEN** code review SHALL 要求加 `tabular-nums`

---

### Requirement: 基础原子组件目录规范

新增的应用层原子组件 SHALL 放在 `src/components/ui/` 下，文件名 kebab-case，导出 PascalCase 名；每个组件 SHALL 支持 `className` 透传以及 `data-slot` 属性以便外层样式覆盖。

#### Scenario: 组件文件名不规范

- **WHEN** 新增 `src/components/ui/StatCard.tsx`（非 kebab-case）
- **THEN** code review SHALL 要求改为 `src/components/ui/stat-card.tsx`

#### Scenario: 原子组件不支持 className

- **WHEN** 新增的 `<StatCard title=... value=... />` 不接受 `className` prop
- **THEN** code review SHALL 要求补上并用 `cn()` 合并

---

### Requirement: 语义色命名集合

design tokens SHALL 至少包含以下语义色键：`bg`、`bg-elevated`、`border`、`border-subtle`、`fg`、`fg-muted`、`fg-subtle`、`accent`、`accent-fg`、`success`、`warning`、`danger`、`info`；MUST NOT 暴露原始色阶（如 `indigo-500`）给业务组件使用。

#### Scenario: 业务组件直接用 Tailwind 原始色阶

- **WHEN** `HoldingsSection` 用 `text-indigo-500`
- **THEN** code review SHALL 要求改为 `text-accent`

#### Scenario: 原子层内部仍可引用原始色

- **WHEN** `src/components/ui/badge.tsx` 的默认 variant 内部映射到原始色（为兼容 shadcn 默认实现）
- **THEN** 视为合规
