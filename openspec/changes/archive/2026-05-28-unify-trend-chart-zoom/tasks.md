## 1. 类型与状态重构

- [x] 1.1 替换 `viewMode: 'daily' | 'monthly'` 为 `range: '1M' | '3M' | '1Y'`，默认 `'1M'`
- [x] 1.2 新增 `WeeklyChartPoint` 类型：`{ weekKey: string; label: string; totalValue: number; totalGain: number; totalGainPercent: number; date: string }`（date = 该周最后一个有效交易日）

## 2. 三月数据聚合逻辑

- [x] 2.1 新增工具函数 `getISOWeek(date: Date): { year: number; week: number }`（处理跨年 ISO 周）
- [x] 2.2 新增 `aggregateByWeek(calendarData: CalendarData[]): WeeklyChartPoint[]` — 按 ISO (year, week) 分组，取每周最后有效点 totalValue，累加该周 totalGain，计算周涨跌幅
- [x] 2.3 新增 `range='3M'` 状态下的数据存储：`threeMonthData: CalendarData[]`，由 3 次并发 fetch 合并而成
- [x] 2.4 新增内部函数 `fetchThreeMonths(endYear, endMonth)`：用 `Promise.allSettled([fetchMonth(y,m), fetchMonth(y,m-1), fetchMonth(y,m-2)])` 并发拉取（处理跨年），合并到 `threeMonthData`，调用 `aggregateByWeek` 得到 `weeklyChartData`

## 3. 导航行为适配

- [x] 3.1 替换原 `prevMonth`/`nextMonth`/`prevYear`/`nextYear` 为统一的 `onPrev`/`onNext`，根据 `range` 调用不同行为
- [x] 3.2 `range='3M'` 时实现窗口滑动：起点 `windowStart`（year, month），导航 ← → 整体移动 1 个月
- [x] 3.3 `navLabel` 根据 `range` 动态生成：`1M → YYYY年M月`、`3M → YYYY年M-M月`、`1Y → YYYY年`

## 4. UI 重构

- [x] 4.1 替换 `[按日][按月]` 两个按钮为 `[1月][3月][1年]` 三按钮组，激活态高亮
- [x] 4.2 移除原 `viewMode === 'monthly'` 的 yearlySummary 渲染分支，整合到 `range === '1Y'` 分支
- [x] 4.3 新增 `range === '3M'` 渲染分支：基于 `weeklyChartData` 渲染折线，X 轴用周末日 label，Y 轴用 totalValue + formatLargeNumber
- [x] 4.4 Brush 仅在 `range === '1M' && dailyChartData.length >= 5` 时渲染

## 5. Tooltip 适配

- [x] 5.1 创建 `WeeklyTooltip` 组件，复用 `DailyTooltip` 的样式和颜色逻辑，显示"周末日 + 总资产 + 周累计涨跌 + 周涨跌幅"
- [x] 5.2 hideAmount 在 WeeklyTooltip 中遮金额（totalValue + totalGain）但保留涨跌幅 %

## 6. 测试更新

- [x] 6.1 更新现有 mock：拆分 mock state 为 `mockCalendarData`、`mockYearlySummary`、`mockIsLoading`、`mockError`（沿用现状即可）
- [x] 6.2 重命名 mode-switch 测试用例：`切换到按月模式` → `切换到 1年范围`；删除 `按月模式渲染折线` 用 `1Y 范围渲染折线`
- [x] 6.3 新增 `3M 范围触发 3 次 fetch` 测试（断言 `mockFetchCalendarData` 被调用 3 次）
- [x] 6.4 新增 `aggregateByWeek` 单元测试：输入 calendarData，断言输出 weekly 数据点数 + totalValue 取最后一天 + totalGain 累计正确
- [x] 6.5 新增 `getISOWeek` 跨年测试：2024-12-30（应在 ISO 2025 W01）+ 2024-12-29（应在 ISO 2024 W52）

## 7. 收尾

- [x] 7.1 运行 `npx tsc --noEmit` 确认无 TS 错误
- [x] 7.2 运行 `npm test -- --no-coverage` 确认所有测试通过
