## MODIFIED Requirements

### Requirement: 折线图渲染每日资产总值
`DailyTrendChart` 组件 SHALL 自持 `year`/`month` 状态，内部调用 `useCalendarData` 管理数据拉取，不依赖父组件注入 `calendarData`。组件接口仅需 `currency: string` 和 `formatLargeNumber` 函数（移除 `calendarData` 和 `isLoading` 外部 props）。

#### Scenario: 组件初始化加载当前月数据
- **WHEN** `DailyTrendChart` 首次渲染
- **THEN** 自动加载当前年月的日历数据并渲染折线图；图表标题行显示当前年月（如"2025年5月"）

#### Scenario: 有效数据渲染折线
- **WHEN** 当月存在 `hasData=true && totalValue>0` 的数据点
- **THEN** 折线图渲染连接这些点的折线，X 轴为 "M/D" 格式日期

#### Scenario: 单数据点渲染
- **WHEN** 当月只有 1 个有效数据点
- **THEN** 渲染单个可见圆点（`r=4`），不崩溃

### Requirement: 加载状态骨架屏
`DailyTrendChart` SHALL 在内部数据加载中时显示骨架屏（`animate-pulse`），加载完成后渲染图表。

#### Scenario: 内部加载中显示骨架屏
- **WHEN** `isLoading` 为 `true`（内部状态）
- **THEN** 渲染 240px 高的 pulse 骨架屏，不显示图表或"暂无数据"

#### Scenario: 切换月份时短暂骨架屏
- **WHEN** 用户点击导航按钮触发新月份加载
- **THEN** 骨架屏显示直至新月份数据就绪

### Requirement: 无数据降级显示
`DailyTrendChart` SHALL 在无有效数据点时显示"暂无数据"提示；在 API 请求失败时显示区分性错误提示（如"数据加载失败，请重试"），不与无数据状态混淆。

#### Scenario: 无快照数据时显示暂无数据
- **WHEN** 过滤后有效数据点为空（所有点 `hasData=false` 或 `totalValue<=0`）
- **THEN** 显示"暂无数据"提示

#### Scenario: API 失败时显示错误提示
- **WHEN** `useCalendarData` 返回非空 `error` 状态
- **THEN** 显示红色"数据加载失败，请重试"，与"暂无数据"视觉区分

#### Scenario: 未登录时显示暂无数据
- **WHEN** 用户未登录，`fetchCalendarData` 因无 token 抛出错误
- **THEN** 组件不崩溃，显示降级提示

## ADDED Requirements

### Requirement: 月份独立导航
`DailyTrendChart` SHALL 在图表区域上方提供 `←`（上一月）和 `→`（下一月）导航按钮及月份标签，用户可独立于日历切换任意历史或未来月份。

#### Scenario: 点击上一月
- **WHEN** 用户点击 `←` 按钮
- **THEN** year/month 切换到上一个月（1月→前一年12月），图表重新加载该月数据，标题同步更新

#### Scenario: 点击下一月
- **WHEN** 用户点击 `→` 按钮
- **THEN** year/month 切换到下一个月（12月→下一年1月），图表重新加载，标题同步更新

#### Scenario: 标题显示当前选中年月
- **WHEN** 图表渲染完成（任意月份）
- **THEN** 导航区域显示格式为 `YYYY年M月`（如"2025年5月"）

#### Scenario: 加载中禁用导航
- **WHEN** `isLoading` 为 `true`
- **THEN** `←` / `→` 按钮处于 disabled 状态，防止并发请求

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
