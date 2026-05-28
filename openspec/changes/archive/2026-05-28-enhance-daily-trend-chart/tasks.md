## 1. 重构 DailyTrendChart — 变为自治组件

- [x] 1.1 移除 `DailyTrendChart` 的 `calendarData: CalendarData[]` 和 `isLoading: boolean` 外部 props；内部引入 `useCalendarData` hook、`useState(year, month)` 初始化为当前年月
- [x] 1.2 在组件内部添加 `useEffect` 在 year/month 变化时调用 `fetchCalendarData(year, month)`
- [x] 1.3 用内部 `calendarData` 和 `isLoading` 替换原本从 props 读取的同名变量（骨架屏、降级逻辑保持不变）

## 2. 添加月份导航 UI

- [x] 2.1 在图表 Section 标题行中添加 `←` / `→` 导航按钮（使用 `Button variant="ghost" size="sm"`）和 `YYYY年M月` 月份标签，布局：`[← ] [YYYY年M月] [ →]` 右对齐
- [x] 2.2 实现 `prevMonth` / `nextMonth` 处理函数：1月←→前一年12月、12月→→下一年1月，点击后更新 year/month state
- [x] 2.3 导航按钮点击时显示骨架屏（`isLoading` 自动变 true，无需额外处理）

## 3. Tooltip 新增涨跌幅信息

- [x] 3.1 在 `ChartPoint` 接口中新增 `totalGain: number` 和 `totalGainPercent: number` 字段
- [x] 3.2 在 `chartData` 映射中补充 `totalGain: d.totalGain` 和 `totalGainPercent: d.totalGainPercent ?? 0`
- [x] 3.3 更新 `CustomTooltip` 组件：新增涨跌金额行（`totalGain`，使用 `formatLargeNumber` 格式化）+ 涨跌幅行（`totalGainPercent`，保留 2 位小数加 `%`），正值绿色（`colors.success`）、负值红色（`colors.danger`）、零值使用 `colors.fgMuted`

## 4. 简化 PlannerSection

- [x] 4.1 从 `PlannerSection` 中移除 `useCalendarData` import 及其 hook 调用（`calendarData`, `monthlySummary`, `isLoading`, `error`, `fetchCalendarData`）
- [x] 4.2 从 `<ProfitLossCalendar>` 移除所有 external props（`externalCalendarData`, `externalMonthlySummary`, `externalIsLoading`, `externalError`, `onExternalFetchCalendarData`）
- [x] 4.3 从 `<DailyTrendChart>` 移除 `calendarData` 和 `isLoading` props（只保留 `currency` 和 `formatLargeNumber`）

## 5. 测试与收尾

- [x] 5.1 更新 `DailyTrendChart.test.tsx`：移除外部 `calendarData`/`isLoading` props；mock `useCalendarData` hook 返回数据，调整测试用例保持 5 个 case 都通过
- [x] 5.2 运行 `npm test -- --no-coverage` 确认全量测试 pass
