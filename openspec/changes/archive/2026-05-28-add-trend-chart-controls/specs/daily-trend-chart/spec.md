## MODIFIED Requirements

### Requirement: 折线图渲染每日资产总值
`DailyTrendChart` 在 `按日` 模式（`viewMode='daily'`，默认）下 SHALL 展示当月每日资产总值折线；在 `按月` 模式（`viewMode='monthly'`）下 SHALL 展示当年每月涨跌幅（`totalGainPercent`）折线，Y 轴格式为 `+X.XX%` / `-X.XX%`。两种模式共享同一个容器组件。

#### Scenario: 按日模式默认加载
- **WHEN** 组件初始化，`viewMode` 为 `'daily'`
- **THEN** 加载当月数据，渲染每日 totalValue 折线；X 轴为 `M/D` 格式日期

#### Scenario: 切换到按月模式
- **WHEN** 用户点击"按月"按钮
- **THEN** `viewMode` 切为 `'monthly'`；调用 `fetchYearlySummary(year)`；图表 X 轴变为 `M月`（1月-12月），Y 轴为月度涨跌幅 %；导航改为年份 prev/next

#### Scenario: 按月模式过滤无效月份
- **WHEN** `yearlySummary` 中某月 `tradingDaysCount === 0`（无快照数据）
- **THEN** 该月不渲染为折线数据点（连线跳过，不显示 0%）

#### Scenario: 切回按日模式
- **WHEN** 用户点击"按日"按钮
- **THEN** `viewMode` 切为 `'daily'`；恢复月份导航，图表重新渲染当月每日数据

### Requirement: 加载状态骨架屏
`DailyTrendChart` SHALL 在 `isLoading` 为 `true`（包含切换模式触发的加载）时显示骨架屏。

#### Scenario: 模式切换时显示骨架屏
- **WHEN** 用户切换 `按日`/`按月` 模式触发数据加载
- **THEN** 骨架屏显示直至数据就绪

#### Scenario: 正常加载中显示骨架屏
- **WHEN** `isLoading` 为 `true`
- **THEN** 渲染 animate-pulse 骨架屏

### Requirement: 无数据降级显示
`DailyTrendChart` SHALL 区分"无数据"和"加载失败"两种空态，分别显示不同提示。

#### Scenario: API 失败显示错误提示
- **WHEN** `error` 非空
- **THEN** 显示红色"数据加载失败，请重试"

#### Scenario: 无有效数据点显示暂无数据
- **WHEN** 过滤后无有效数据点
- **THEN** 显示灰色"暂无数据"

## ADDED Requirements

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
`DailyTrendChart` 在 `按日` 模式且当月有效数据点 ≥ 5 个时，SHALL 在图表底部渲染 Recharts `<Brush>` 组件，允许用户拖拽左右边界来缩放查看的日期范围。`按月` 模式不显示 Brush。

#### Scenario: 按日模式有效数据点 ≥ 5 时渲染 Brush
- **WHEN** `viewMode='daily'` 且过滤后有效数据点 ≥ 5
- **THEN** 图表底部显示 Brush 拖拽条，用户可缩放

#### Scenario: 按日模式数据点 < 5 不渲染 Brush
- **WHEN** `viewMode='daily'` 且有效数据点 < 5
- **THEN** 不渲染 Brush（数据点太少缩放无意义）

#### Scenario: 按月模式不渲染 Brush
- **WHEN** `viewMode='monthly'`
- **THEN** 不渲染 Brush

### Requirement: 视图模式导航适配
`DailyTrendChart` SHALL 根据 `viewMode` 自动切换导航按钮行为：`按日` 模式导航为上/下月，`按月` 模式导航为上/下年。导航标签也相应变化（`按日` 显示 `YYYY年M月`，`按月` 显示 `YYYY年`）。

#### Scenario: 按日模式显示月份导航
- **WHEN** `viewMode='daily'`
- **THEN** 导航显示 `← YYYY年M月 →`，点击切换月份

#### Scenario: 按月模式显示年份导航
- **WHEN** `viewMode='monthly'`
- **THEN** 导航显示 `← YYYY年 →`，点击切换年份
