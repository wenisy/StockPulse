## Context

`DailyTrendChart` 是自治组件，内部持有 `year`/`month` state，使用 `useCalendarData` 获取数据（`calendarData` for daily, `yearlySummary` for monthly）。`useCalendarData` 已提供 `fetchYearlySummary` 和 `yearlySummary` 返回值，本次直接使用，无需改 hook 层。

## Goals / Non-Goals

**Goals:**
- 隐藏金额 toggle（Y 轴 + Tooltip 打码）
- 视图模式 `按日` / `按月` 切换，`按月` 展示 `totalGainPercent`（来自 `yearlySummary`）
- `按日` 模式下加 Recharts `<Brush>` 拖拽缩放

**Non-Goals:**
- `按月` 模式展示每月末总资产（需 12 次额外 API 调用，暂不做）
- 跨年 `按月` 连续折线（每年独立加载一次即可）
- Y 轴值域手动锁定（Recharts auto domain 足够）

## Decisions

### 1. 视图模式状态

**决策**：新增 `viewMode: 'daily' | 'monthly'` state，默认 `'daily'`。

- `daily`：沿用现有逻辑（`calendarData`, 月份导航）
- `monthly`：切换时调用 `fetchYearlySummary(year)` → 读 `yearlySummary`，X 轴为月份标签（"1月"...），Y 轴为 `totalGainPercent`；导航切换为年份 prev/next

**月份标签格式**：`M月`（"1月", "2月"...），Y 轴格式 `+X.XX%` / `-X.XX%`。

### 2. 隐藏金额实现

**决策**：新增 `hideAmount: boolean` state；开启时：
- Y 轴 `tickFormatter` 返回 `'****'`
- Tooltip 中所有数值字段替换为 `****`
- `totalGainPercent`（`按月` 模式也用）也替换为 `****%`

### 3. Brush 放置策略

**决策**：`按日` 模式下，`<Brush>` 放在 `<LineChart>` 内，`startIndex={0}` `endIndex={chartData.length - 1}`（默认全选），高度 24px，使图表总高度维持 240px（LineChart 内部空间分配）。

**理由**：Brush 是 Recharts 内置组件，无新依赖；`按月` 模式数据点最多 12 个，缩放无意义故隐藏。

### 4. 导航栏布局

新布局（自左到右）：
```
[按日][按月]    ←  YYYY年M月/YYYY年  →    [隐藏金额]
```
- 模式按钮在最左
- 月份/年份导航居中
- 隐藏金额 toggle 在最右

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| `yearlySummary` 数据稀疏（某月没有快照） | 过滤 `tradingDaysCount > 0` 的月份才显示，其余月份显示空点或跳过 |
| Brush 在少量数据点（< 5 天）时 UX 差 | `chartData.length >= 5` 才渲染 Brush，否则隐藏 |
