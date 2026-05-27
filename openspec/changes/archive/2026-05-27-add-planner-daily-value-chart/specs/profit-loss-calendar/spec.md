## ADDED Requirements

### Requirement: 支持外部数据 props 注入
`ProfitLossCalendar` 组件 SHALL 支持通过 props 接收 `calendarData`、`monthlySummary`、`isLoading`、`error` 以及 `onFetchCalendarData`、`onFetchYearlySummary` 回调。当这些 props 被提供时，组件 SHALL 优先使用外部数据，不再内部调用 `useCalendarData`。当 props 未提供时（向下兼容），组件 SHALL 继续使用内部 `useCalendarData` hook 自主管理数据。

#### Scenario: 外部 props 优先
- **WHEN** `ProfitLossCalendar` 接收到非 undefined 的 `calendarData` prop
- **THEN** 组件使用该外部数据渲染，不调用内部 `fetchCalendarData`

#### Scenario: 向下兼容（无 props）
- **WHEN** `ProfitLossCalendar` 未传入 `calendarData` prop（undefined）
- **THEN** 组件行为与改动前完全一致，内部 `useCalendarData` 正常工作

#### Scenario: 外部 loading 状态传递
- **WHEN** 外部传入 `isLoading=true`
- **THEN** 日历显示加载状态，与自管理时的加载表现一致

#### Scenario: 月份切换回调
- **WHEN** 用户点击日历的月份切换按钮
- **THEN** 若 `onFetchCalendarData` prop 存在，则调用该回调（而非内部 fetch）；PlannerSection 在收到回调后更新共享状态，折线图同步刷新
