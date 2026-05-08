## ADDED Requirements

### Requirement: 图表视图集

Charts section SHALL 提供 4 种视图，通过 `ChartSwitcher` 切换（Tabs 形态）：

1. 资产走势 AreaChart（按年）
2. 年度对比 BarChart（各年末资产）
3. 持仓分布 PieChart（当前年末）
4. 年化收益 BarChart（每年收益 %）

数据来源 SHALL 为 `useChartData`；若某视图数据为空 SHALL 显示 EmptyState。

#### Scenario: 切换视图

- **WHEN** 用户在 Switcher 里点"持仓分布"
- **THEN** 图表区淡入切换到 PieChart，其它视图卸载

---

### Requirement: 图表主题一致

所有图表的颜色、字号、grid 样式 MUST 通过 `src/components/sections/charts/chartTheme.ts` 统一定义；MUST NOT 在图表组件内硬编码颜色。

#### Scenario: 图表内硬编码色

- **WHEN** `ChartsSection.tsx` 写 `<Line stroke="#4f46e5">`
- **THEN** code review 拒绝，要求改为 `stroke={chartTheme.accent}`

---

### Requirement: 响应主题切换

图表颜色 MUST 跟随 `data-theme` 切换自动更新；通过订阅 `useTheme().resolvedTheme` 并重新读取 `chartTheme`（Recharts 本身不支持 CSS 变量，所以 chartTheme 从 JS tokens 读）。

#### Scenario: dark 模式下

- **WHEN** 用户切到 dark
- **THEN** 图表线条颜色变为 dark 主题的 accent 值，不闪烁
