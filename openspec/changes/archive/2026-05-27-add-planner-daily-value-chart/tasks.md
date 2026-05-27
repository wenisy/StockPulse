## 1. 类型定义

- [x] 1.1 在 `src/types/stock.ts` 的 `CalendarData` 接口中添加 `totalValue?: number` 字段

## 2. 新建 DailyTrendChart 组件

- [x] 2.1 新建 `src/components/DailyTrendChart.tsx`，定义组件 props 接口：`calendarData: CalendarData[]`、`isLoading: boolean`、`currency: string`、`formatLargeNumber: (v: number, c: string) => string`
- [x] 2.2 实现 `isLoading` 骨架屏状态（灰色占位矩形 + pulse 动画）
- [x] 2.3 实现无数据降级：过滤 `hasData && totalValue > 0` 数据点，若结果为空则渲染"暂无数据"提示
- [x] 2.4 实现 Recharts `LineChart`：X 轴为日期（`M/D` 格式）、Y 轴为 `totalValue`（使用 `formatLargeNumber` 格式化 tick）、`Line` 组件带渐变或固定颜色、`Tooltip` 显示日期 + 资产总值
- [x] 2.5 Section 标题设为"每日资产走势"，样式与页面其他 Section 标题一致

## 3. 重构 ProfitLossCalendar（支持外部 props 注入）

- [x] 3.1 为 `ProfitLossCalendar` 添加可选 props：`externalCalendarData?`、`externalMonthlySummary?`、`externalIsLoading?`、`externalError?`、`onExternalFetchCalendarData?`
- [x] 3.2 在组件内部实现"props 优先，内部 hook 兜底"逻辑：若 `externalCalendarData` 不为 `undefined`，则跳过内部 `fetchCalendarData`，直接使用外部数据
- [x] 3.3 月份切换时：若 `onExternalFetchCalendarData` 存在则调用该回调，否则调用内部 `fetchCalendarData`
- [x] 3.4 验证现有无 props 场景行为不变（向下兼容测试：直接使用 `ProfitLossCalendar` 不传外部 props 时功能正常）

## 4. 重构 PlannerSection（状态提升 + 接入折线图）

- [x] 4.1 在 `PlannerSection` 内部引入 `useCalendarData` hook，持有 `calendarData`、`monthlySummary`、`isLoading`、`error`、`fetchCalendarData`、`fetchYearlySummary`、`generateDailySnapshot` 状态
- [x] 4.2 将以上状态和回调通过 external props 传入 `ProfitLossCalendar`（替换其内部自管理）
- [x] 4.3 在 `PlannerSection` 底部新增 `<Section>` 区块，内部渲染 `<DailyTrendChart>`，传入 `calendarData`、`isLoading`、`currency`、`formatLargeNumber`
- [x] 4.4 确保月份切换（`ProfitLossCalendar` 内部导航）触发 `PlannerSection` 的 `fetchCalendarData`，折线图同步更新

## 5. 样式与收尾

- [x] 5.1 折线图容器高度设为约 240px（与月度盈亏日历区块视觉对称），响应式宽度 100%
- [x] 5.2 检查暗色模式下折线/轴颜色是否可读（使用 CSS 变量或 Tailwind 暗色类）
- [x] 5.3 在 `src/components/__tests__/` 中为 `DailyTrendChart` 新增基础渲染测试（空数据 + 正常数据两个 case）
