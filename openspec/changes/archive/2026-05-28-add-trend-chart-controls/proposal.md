## Why

`DailyTrendChart` 当前缺少三类常用控件：金额隐私保护（无隐藏金额）、视图粒度切换（只能看按天，无法看按月整体趋势）、时间范围缩放（无法在当月数据内自由拉框聚焦）。这三个功能让图表从"只能看当月每日"升级为一个灵活的资产趋势工具。

## What Changes

- **隐藏金额**：在图表导航栏右侧加一个 `隐藏金额` toggle 按钮；开启时 Y 轴 tick 和 Tooltip 里的数值均替换为 `****`
- **按日/按月切换**：在导航栏加 `按日 | 按月` 模式按钮（使用现有 `Button` 组件）；
  - `按日`（现有行为）：显示当月每日资产总值折线，月份 prev/next 导航
  - `按月`（新）：调用 `fetchYearlySummary(year)` 获取 12 月汇总，显示每月涨跌幅（`totalGainPercent`）折线，切换为年份 prev/next 导航
- **Brush 拖拽缩放**：在 `按日` 模式下，图表底部加 Recharts `<Brush>` 组件；用户可左右拖拽选取要放大查看的日期区间，`按月` 模式因数据点只有 12 个无需 Brush

## Capabilities

### New Capabilities

（无新 capability spec — 均为 `daily-trend-chart` spec 的 MODIFIED delta）

### Modified Capabilities

- `daily-trend-chart`：增加隐藏金额、视图模式切换、Brush 缩放三条需求

## Impact

- **修改文件**：`src/components/DailyTrendChart.tsx`（主要改动）
- **新增依赖**：无（`Brush` 是 recharts 内置组件，已安装）
- **API 调用**：`按月` 模式额外触发 `fetchYearlySummary`（后端有 in-memory cache，往年 7 天 TTL，当年 10 分钟 TTL）；整体调用次数可控
