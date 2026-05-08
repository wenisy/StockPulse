## Why

退休计算器 + 日历是偏"工具类"的功能，合并到 Planner section 一个入口。现有 `RetirementCalculator.tsx` (234 行) 和 `ProfitLossCalendar.tsx` 视觉老旧。

## What Changes

- 新增 `src/components/sections/planner/PlannerSection.tsx` 真实实现
- 内部分为两个子 Tab：
  - **退休规划**：新增 `RetirementCard.tsx`，重绘 UI，复用 `useUserSettings` + 现有的 `CompoundGrowthDialog` 命令式 API
  - **月度日历**：新增 `CalendarCard.tsx`，复用 `useCalendarView` + `useCalendarData`，月份热力图配色改为 `--color-success` / `--color-danger` 渐变
- 移除对 legacy `RetirementCalculator.tsx` 和 `ProfitLossCalendar.tsx` 的直接引用（仅在 legacy 路径保留）

## Capabilities

### New Capabilities
- `planner-section`：Planner 页面契约（退休 + 日历双 Tab）

## Impact

- 新增 `src/components/sections/planner/*`
- 不改 hooks
