## Why

`DailyTrendChart` 当前是一个无状态的哑组件，完全依赖 `PlannerSection` 注入的 `calendarData`（始终是日历当前月份的数据）。结果：图表无月份标签、无导航按钮，用户不知道看的是哪个月、也无法独立切换历史月份查看趋势。同时，`CalendarData` 中已有 `totalGainPercent`（当日涨跌幅），但图表未展示，信息利用率低。

## What Changes

- **`DailyTrendChart` 变为智能自治组件**：内置 `year`/`month` 状态，自管理数据拉取，有独立的上下月导航（`←` / `→`）
- **图表标题显示当前选中年月**（如"2025年4月 · 每日资产走势"），让用户一眼知道图表对应哪个月
- **Tooltip 新增当日涨跌信息**：涨跌金额（`totalGain`）+ 涨跌幅（`totalGainPercent`），颜色区分正负
- **`PlannerSection` 简化**：移除共享的 `useCalendarData` 状态及传递给 `DailyTrendChart` 的 `calendarData` prop；图表与日历各自独立，`ProfitLossCalendar` 回归完全内部自治模式

## Capabilities

### New Capabilities

- `daily-trend-chart`: **MODIFIED** — 折线图独立导航与涨跌幅显示

### Modified Capabilities

（无新 spec 文件需创建；对现有 `daily-trend-chart` spec 做 delta）

## Impact

- **修改文件**：`src/components/DailyTrendChart.tsx`、`src/components/sections/PlannerSection.tsx`
- **依赖**：`useCalendarData`（现在在图表内部直接使用）
- **API 调用**：图表独立导航时额外触发一次 `/api/calendarData`（与日历无关），初始加载时图表和日历各自拉取当前月，共 2 次（可接受）
- **无破坏性改动**：`ProfitLossCalendar` 外部 props 接口保留但 `PlannerSection` 不再传入，组件自动回退到内部 hook 模式
