# daily-trend-chart Specification

## Purpose
TBD - created by archiving change add-planner-daily-value-chart. Update Purpose after archive.
## Requirements
### Requirement: 折线图渲染每日资产总值
`DailyTrendChart` 组件 SHALL 接收 `calendarData: CalendarData[]`、`currency: string`、`formatLargeNumber` 函数，并使用 Recharts `LineChart` 渲染以日期为 X 轴、`totalValue` 为 Y 轴的折线图。只渲染 `hasData === true && totalValue > 0` 的数据点。

#### Scenario: 有效数据渲染折线
- **WHEN** `calendarData` 包含至少 2 个 `hasData=true && totalValue>0` 的数据点
- **THEN** 折线图显示连接这些点的折线，X 轴展示日期（短格式如 "5/1"），Y 轴展示资产总值

#### Scenario: 只有 1 个数据点
- **WHEN** `calendarData` 中只有 1 个有效数据点
- **THEN** 折线图渲染单个点，不显示连线，图表仍正常不崩溃

#### Scenario: 日期 X 轴格式
- **WHEN** 折线图渲染完成
- **THEN** X 轴 tick 显示为 "M/D" 格式（如 "5/15"），不显示年份

#### Scenario: Y 轴金额格式化
- **WHEN** 折线图渲染完成
- **THEN** Y 轴 tick 使用 `formatLargeNumber` 格式化，并附带 `currency` 符号

### Requirement: 无数据降级显示
`DailyTrendChart` 组件 SHALL 在没有有效数据时显示"暂无数据"提示，而非空白区域或报错。

#### Scenario: calendarData 为空数组
- **WHEN** 传入的 `calendarData` 为 `[]`
- **THEN** 组件显示"暂无数据"或等价提示文字，不渲染折线图

#### Scenario: 所有数据点 hasData=false
- **WHEN** 所有 `CalendarData` 条目均 `hasData=false`
- **THEN** 组件显示"暂无数据"提示

#### Scenario: 未登录时无数据
- **WHEN** 用户未登录（token 不存在），`calendarData` 为空
- **THEN** 组件显示"登录后查看每日资产趋势"或等价提示，不报错

### Requirement: 加载状态骨架屏
`DailyTrendChart` 组件 SHALL 接收 `isLoading: boolean` prop，在加载中时显示骨架屏。

#### Scenario: 数据加载中
- **WHEN** `isLoading` 为 `true`
- **THEN** 组件渲染骨架屏（可使用灰色占位矩形或 pulse 动画），不显示折线图内容

#### Scenario: 加载完成
- **WHEN** `isLoading` 变为 `false` 且 `calendarData` 已填充
- **THEN** 骨架屏消失，折线图渲染正常数据

### Requirement: 与日历联动
折线图 SHALL 与日历的年月选择器保持联动，展示相同月份的数据。

#### Scenario: 月份切换同步
- **WHEN** 用户在日历区块切换到不同月份
- **THEN** 折线图同步展示切换后月份的每日资产曲线，**不发起额外 API 请求**

#### Scenario: 切换月份时短暂 loading
- **WHEN** 用户切换月份，`isLoading` 变为 `true`
- **THEN** 折线图区域显示骨架屏直至新数据就绪

### Requirement: Planner 页面布局位置
`DailyTrendChart` SHALL 位于 Planner 页面月度盈亏日历 Section 的下方，作为独立 Section 渲染。

#### Scenario: 页面结构顺序
- **WHEN** 用户访问 `?view=planner`
- **THEN** 页面从上到下依次为：退休计算器 → 月度盈亏日历 → 每日资产折线图

#### Scenario: 区块标题
- **WHEN** 折线图区块渲染
- **THEN** Section 标题为"每日资产走势"或等价中文标题

