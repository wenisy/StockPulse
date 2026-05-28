# daily-trend-chart Specification

## Purpose
TBD - created by archiving change add-planner-daily-value-chart. Update Purpose after archive.
## Requirements
### Requirement: 折线图渲染每日资产总值
`DailyTrendChart` SHALL 根据当前时间范围自动决定数据粒度和折线渲染：

- `1月` → 日粒度，`totalValue` 折线（X 轴 `M/D`）
- `3月` → 周粒度（前端聚合），`totalValue` 折线（X 轴该周末日 `M/D`）
- `1年` → 月粒度，`totalGainPercent` 折线（X 轴 `M月`）

#### Scenario: 1月模式渲染日折线
- **WHEN** `range='1月'` 且 `calendarData` 非空
- **THEN** 折线展示当月每日 `totalValue`，X 轴 `M/D` 格式

#### Scenario: 3月模式按 ISO 周聚合
- **WHEN** `range='3月'` 且 3 个月的 `calendarData` 已加载
- **THEN** 按 ISO 周（year + week number 复合 key）分组，每组取最后一个 `hasData=true && totalValue>0` 数据点的 `totalValue` 作为该周点；周累计 `totalGain` 为该周所有日 `totalGain` 之和

#### Scenario: 3月模式跨 ISO 年周
- **WHEN** 3 月窗口包含跨年 ISO 周（如 2024-12-30 属于 2025 年第 1 周）
- **THEN** 按 ISO 年 + ISO 周分组，跨年周不会被错误合并到上一年

#### Scenario: 1年模式渲染月度折线
- **WHEN** `range='1年'` 且 `yearlySummary` 非空
- **THEN** 折线展示当年每月 `totalGainPercent`，X 轴 `M月` 格式（仅渲染 `tradingDaysCount > 0` 的月份）

### Requirement: 无数据降级显示
`DailyTrendChart` SHALL 区分"无数据"和"加载失败"两种空态，分别显示不同提示。

#### Scenario: API 失败显示错误提示
- **WHEN** `error` 非空
- **THEN** 显示红色"数据加载失败，请重试"

#### Scenario: 无有效数据点显示暂无数据
- **WHEN** 过滤后无有效数据点
- **THEN** 显示灰色"暂无数据"

### Requirement: 加载状态骨架屏
`DailyTrendChart` SHALL 在 `isLoading` 为 `true`（包含切换模式触发的加载）时显示骨架屏。

#### Scenario: 模式切换时显示骨架屏
- **WHEN** 用户切换 `按日`/`按月` 模式触发数据加载
- **THEN** 骨架屏显示直至数据就绪

#### Scenario: 正常加载中显示骨架屏
- **WHEN** `isLoading` 为 `true`
- **THEN** 渲染 animate-pulse 骨架屏

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

### Requirement: 月份独立导航
`DailyTrendChart` SHALL 提供时间范围切换 `[1月] [3月] [1年]` 替代原本的"按日/按月"两个 tab。三档范围共享同一个 navLabel + ← → 导航控件，导航行为按当前选中范围自动适配：

- `1月` 模式：导航上下月（`YYYY年M月`）
- `3月` 模式：滑动 3 月窗口（`YYYY年M-M月`），每次 ← → 移动 1 个月
- `1年` 模式：导航上下年（`YYYY年`）

#### Scenario: 默认 1月模式
- **WHEN** 组件初始化
- **THEN** 时间范围默认 `1月`，加载当前月数据，导航 label 显示 `YYYY年M月`，← → 上下月

#### Scenario: 切换到 3月模式
- **WHEN** 用户点击 `3月` 按钮
- **THEN** 触发 3 次并发 `fetchCalendarData`（当前选中月 + 前 2 个月），导航 label 改为 `YYYY年M-M月`，← → 滑动整个 3 月窗口（每次 1 个月）

#### Scenario: 3月窗口 ← 越界 clamp
- **WHEN** 3 月模式下用户连续点 ← 直到窗口起始月已是 1 月
- **THEN** 不再继续后退（窗口 clamp 在 `1-3 月`）

#### Scenario: 切换到 1年模式
- **WHEN** 用户点击 `1年` 按钮
- **THEN** 调用 `fetchYearlySummary(year)`，导航 label 改为 `YYYY年`，← → 切换上下年

### Requirement: Tooltip 显示当日涨跌信息
`DailyTrendChart` 的 Tooltip SHALL 在用户悬浮数据点时，同时显示 `totalValue`（资产总值）、`totalGain`（当日涨跌金额）和 `totalGainPercent`（当日涨跌幅）。涨跌金额和涨跌幅须用颜色区分正负（正值绿色，负值红色）。

#### Scenario: Tooltip 显示正涨幅
- **WHEN** 用户悬浮到 `totalGain > 0` 的数据点
- **THEN** Tooltip 显示资产总值 + 绿色涨跌金额（如 "+$1,234"）+ 绿色涨跌幅（如 "+0.5%"）

#### Scenario: Tooltip 显示负跌幅
- **WHEN** 用户悬浮到 `totalGain < 0` 的数据点
- **THEN** Tooltip 显示资产总值 + 红色跌幅金额（如 "-$567"）+ 红色涨跌幅（如 "-0.3%"）

#### Scenario: Tooltip 显示持平
- **WHEN** 用户悬浮到 `totalGain === 0` 的数据点
- **THEN** Tooltip 显示资产总值 + 涨跌金额 "$0" + 涨跌幅 "0.0%"（中性颜色）

### Requirement: 隐藏金额
`DailyTrendChart` SHALL 提供"隐藏金额"toggle 按钮（位于导航栏最右侧）。开启时，Y 轴刻度和 Tooltip 中所有数值（`totalValue`、`totalGain`、`totalGainPercent`）均显示为 `****`，折线形状保持不变。

#### Scenario: 开启隐藏金额
- **WHEN** 用户点击"隐藏金额"按钮（`hideAmount` 从 false 变 true）
- **THEN** Y 轴 tick 显示 `****`；Tooltip 中资产总值、涨跌金额、涨跌幅均显示 `****`

#### Scenario: 关闭隐藏金额
- **WHEN** 用户再次点击（`hideAmount` 从 true 变 false）
- **THEN** 恢复正常数值显示

#### Scenario: 隐藏金额跨模式保持
- **WHEN** 用户在"按日"模式开启隐藏金额后切换到"按月"模式
- **THEN** `hideAmount` 状态保持，按月模式的 Y 轴也显示 `****`

### Requirement: 按日模式 Brush 缩放
`DailyTrendChart` SHALL 仅在 `range='1月'` 模式且 `dailyChartData.length >= 5` 时渲染 Brush；`3月`/`1年` 模式 SHALL NOT 渲染 Brush。

#### Scenario: 1月模式数据点 ≥ 5 渲染 Brush
- **WHEN** `range='1月'` 且 `dailyChartData.length >= 5`
- **THEN** 图表底部渲染 Brush，`startIndex/endIndex` 受控保持最少 7 天可视范围

#### Scenario: 3月模式不渲染 Brush
- **WHEN** `range='3月'`
- **THEN** 不渲染 Brush（数据点是周粒度，已较少）

#### Scenario: 1年模式不渲染 Brush
- **WHEN** `range='1年'`
- **THEN** 不渲染 Brush

