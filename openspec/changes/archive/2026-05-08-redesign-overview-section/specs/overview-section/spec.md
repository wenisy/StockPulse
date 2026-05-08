## ADDED Requirements

### Requirement: Overview 页面 KPI 指标集

Overview 页面 SHALL 在页面顶部显示 4 张 KPI StatCard，顺序固定：

1. 总资产（当前年末持仓市值 + 现金余额）
2. 总收益（市值 - 成本基础）
3. 年初至今收益（当年盈亏）
4. 持仓数（当前年末 stocks.length）

每张 KPI MUST 使用 `AnimatedNumber`，数值使用 `tabular-nums`，涨跌用 `--color-success` / `--color-danger`。

#### Scenario: 无数据时

- **WHEN** 当前年 `yearData` 为空
- **THEN** KPI 显示 `—` 或 `0`，不崩，EmptyState 组件提示"添加第一笔交易"

#### Scenario: 盈利为正

- **WHEN** 总收益 > 0
- **THEN** 数值颜色 `text-success`，加 `TrendingUp` 图标

---

### Requirement: AssetTrendCard 走势图

Overview SHALL 渲染一张资产走势面积图，数据来源 SHALL 为 `useChartData`（不新增 hook）；线条颜色 SHALL 引用 `--color-accent`，悬浮 tooltip 用 `--color-bg-elevated` 背景。

#### Scenario: 只有 1 年数据

- **WHEN** `yearData` 只有一个年份
- **THEN** 图表以月为 X 轴展示该年内数据；若数据不足以绘制，显示 EmptyState

---

### Requirement: QuickActions 快捷操作

Overview SHALL 提供 4 个快捷操作按钮：

1. 添加交易 → 打开 legacy `StockForm` 的对话框（或由 Holdings section 提供的 drawer）
2. 切换年度 → 聚焦 TopNav 的 YearSelector
3. 导出报告 → 调用 legacy `ReportDialog.open()`
4. 查看日历 → 切换到 `planner` section

MUST NOT 为这些按钮新增业务 hook；MUST 复用现有 hook/组件实例的命令式 API。

#### Scenario: 导出报告按钮

- **WHEN** 用户点击"导出报告"
- **THEN** 打开现有 ReportDialog，功能与 legacy 完全一致

---

### Requirement: Overview 不调 fetch

`OverviewSection.tsx` 及其子组件 MUST NOT 调用 `fetch` 或直接读写 `localStorage`；所有数据来源 SHALL 为 props 或现有业务 hook。

#### Scenario: 在 KPI 卡里调 fetch

- **WHEN** `KpiCards.tsx` 出现 `fetch(...)`
- **THEN** code review 拒绝
