## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: 视图模式导航适配
**Reason**: "按日/按月"两个 tab 的概念被废弃，统一为时间范围 `[1月] [3月] [1年]`，导航适配的需求融合进新的 `月份独立导航` 需求

**Migration**: 原"按日"模式 → 新 `1月` 模式；原"按月"模式 → 新 `1年` 模式；新增中间 `3月` 模式
