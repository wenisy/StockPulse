## 1. 视图模式基础

- [x] 1.1 在 `DailyTrendChart.tsx` 中新增 `viewMode: 'daily' | 'monthly'` state，默认 `'daily'`
- [x] 1.2 在导航栏最左侧添加"按日"/"按月"切换按钮（`Button variant="ghost" size="sm"`，当前模式高亮）
- [x] 1.3 `viewMode='monthly'` 时调用 `fetchYearlySummary(year)` 并监听 `year` 变化；`viewMode='daily'` 时维持现有 `fetchCalendarData(year, month)` 逻辑

## 2. 按月数据与图表

- [x] 2.1 将 `useCalendarData` 中的 `yearlySummary`、`fetchYearlySummary`、`isLoading` 一并解构
- [x] 2.2 新建 `monthlyChartData` 计算：过滤 `yearlySummary` 中 `tradingDaysCount > 0` 的月份，映射为 `{ label: 'M月', totalGainPercent, totalGain }` 数组
- [x] 2.3 `viewMode='monthly'` 时渲染按月折线图：`dataKey="totalGainPercent"`，Y 轴 `tickFormatter` 加 `%` 后缀，Tooltip 展示月份 + 涨跌幅 + 涨跌金额（同样受 `hideAmount` 控制）
- [x] 2.4 `viewMode='monthly'` 时导航改为年份 `← YYYY年 →`，实现 `prevYear` / `nextYear` 函数

## 3. 隐藏金额

- [x] 3.1 新增 `hideAmount: boolean` state，默认 `false`
- [x] 3.2 在导航栏最右侧添加"隐藏金额"toggle 按钮（参考 `ProfitLossCalendar` 的实现样式）
- [x] 3.3 `hideAmount=true` 时：Y 轴 `tickFormatter` 返回 `'****'`；`按日` Tooltip 的 totalValue、totalGain、totalGainPercent 均显示 `'****'`；`按月` Tooltip 同理

## 4. Brush 缩放（按日模式）

- [x] 4.1 从 `recharts` import `Brush`
- [x] 4.2 在 `按日` 模式 `LineChart` 内，当 `chartData.length >= 5` 时渲染 `<Brush dataKey="label" height={20} stroke={colors.borderDefault} fill={colors.bgSubtle} />`
- [x] 4.3 为 Brush 存在时给 `LineChart` 额外设置 `margin={{ bottom: 0 }}`，确保图表总高保持 240px 内不溢出（Brush 内嵌在 LineChart 高度中）

## 5. 测试与收尾

- [x] 5.1 更新 `DailyTrendChart.test.tsx`：在现有 mock 基础上补充 `yearlySummary`、`fetchYearlySummary` mock 返回值；新增 2 个测试 case（按月模式空数据 + 有数据）
- [x] 5.2 运行 `npm test -- --no-coverage` 确认全量测试 pass
