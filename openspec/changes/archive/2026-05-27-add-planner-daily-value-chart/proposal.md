## Why

用户在 Planner 页面已能查看月度盈亏日历，但缺乏直观的每日资产总值折线图，无法一眼看出当月资产的增减趋势。后端每日快照（`NOTION_DAILY_SNAPSHOTS_DB_ID`）已持续记录 `totalValue`，且现有 `/api/calendarData` 月度接口已返回该字段，只需在前端补充类型声明并新增图表组件即可完成。

## What Changes

- 在 `CalendarData` 接口中补充 `totalValue?: number` 字段（前端类型与后端实际返回对齐）
- 新建 `DailyTrendChart` 组件，使用 Recharts `LineChart` 渲染当月每日资产总值曲线
- 将 `useCalendarData` 的状态管理提升至 `PlannerSection`，让日历和折线图共享同一份数据（**不增加额外 Vercel API 调用**）
- `ProfitLossCalendar` 改为支持通过 props 接收数据（向下兼容，props 优先于内部 hook）
- `PlannerSection` 在月度盈亏日历下方新增折线图 Section

## Capabilities

### New Capabilities

- `daily-trend-chart`: 在 Planner 页面展示当月每日资产总值折线图，与日历联动、支持未登录降级提示和加载骨架屏

### Modified Capabilities

- `profit-loss-calendar`: `ProfitLossCalendar` 接受外部 `calendarData` / `monthlySummary` / `isLoading` / `error` 等 props，减少重复 API 调用

## Impact

- **修改文件**：`src/types/stock.ts`、`src/components/ProfitLossCalendar.tsx`、`src/components/sections/PlannerSection.tsx`
- **新增文件**：`src/components/DailyTrendChart.tsx`
- **依赖**：无新增（Recharts 已安装）
- **后端**：无改动
- **API 调用次数**：不变（状态提升复用同一次 fetch）
