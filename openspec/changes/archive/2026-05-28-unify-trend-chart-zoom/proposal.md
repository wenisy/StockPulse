## Why

当前 `DailyTrendChart` 用 `[按日][按月]` 两个 tab 切换粒度，用户实际心智模型是"一个连续的视图通过缩放看不同时间范围"——拖小看一周、再拖小看一月、再缩看一年。两个独立 tab 强行把"日视图"和"月视图"拆成两件事，并且只能看 1 个月的每日 / 1 个年的每月，**中间的"3 个月每周"刻度完全缺失**。

## What Changes

- **拆掉 `[按日][按月]` 两个 tab**，改为统一的**时间范围选择器** `[1月] [3月] [1年]`
- **三档时间范围对应三种粒度（自动）**：
  - `1月`（默认）→ 日粒度，使用 `calendarData(year, month)` 一次 API
  - `3月` → **周粒度**，前端聚合 3 个连续月份的 `calendarData`，每周取最后一个有数据的交易日的 `totalValue` 作为该周值（每条用户主动选 `3月` 触发 3 次 API）
  - `1年` → 月粒度，使用 `yearlySummary(year)` 一次 API
- **导航适配范围**：
  - `1月` → ← `YYYY年M月` → 月份导航
  - `3月` → ← `YYYY年M-M月` → 滑动 3 月窗口（每次移动 1 个月）
  - `1年` → ← `YYYY年` → 年份导航
- **Brush 仅在 `1月` 模式可用**（数据点 ≥ 5 时），其他模式数据点已较少不需要缩放
- 隐藏金额 toggle 在三档模式下都生效，仍然只遮金额不遮 %

## Capabilities

### Modified Capabilities

- `daily-trend-chart`：从"按日/按月双 tab"改为"时间范围统一视图"

## Impact

- **修改文件**：`src/components/DailyTrendChart.tsx`、`src/components/__tests__/DailyTrendChart.test.tsx`
- **新增依赖**：无（只用现有 `calendarData` / `yearlySummary` API + 前端聚合逻辑）
- **API 调用**：
  - 默认状态（`1月`）：1 次 `calendarData`（与现状相同）
  - 用户切到 `3月`：3 次 `calendarData`（用户主动触发，可接受）
  - 用户切到 `1年`：1 次 `yearlySummary`（与现状相同）
- **破坏性**：UI 重构（按钮文案/位置变了），但数据接口不变
