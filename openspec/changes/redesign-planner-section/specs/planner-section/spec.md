## ADDED Requirements

### Requirement: Planner 双 Tab

Planner section SHALL 使用 Radix Tabs 提供两个子 Tab：`retirement`（退休规划）、`calendar`（月度日历）；默认打开 `retirement`。Tab 切换状态 SHALL 持久化到 URL 参数 `?plannerTab=`。

#### Scenario: 深链进入日历

- **WHEN** 用户访问 `/?view=planner&plannerTab=calendar`
- **THEN** 直接渲染日历 Tab

---

### Requirement: 退休规划卡片

`RetirementCard` SHALL 至少展示：

- 当前总资产 vs 目标（进度条）
- 核心输入：目标金额、预期年回报、目标年限 / 年化率（rate/years 两种模式）
- 输出：估算达标年 / 估算达标率 / 月供建议（若适用）
- 复利增长按钮 → 打开现有 `CompoundGrowthDialog`

MUST 复用 `useUserSettings` 持久化；MUST NOT 新建 state store。

#### Scenario: 用户改目标金额

- **WHEN** 用户输入新目标
- **THEN** `updateRetirementGoal` 被调用，进度条 + 估算结果即时更新

---

### Requirement: 日历卡片

`CalendarCard` SHALL 复用 `useCalendarView` + `useCalendarData`，渲染月度盈亏热力格：正盈利格子用 `--color-success` + 透明度表示幅度；负盈利用 `--color-danger`；零/无数据用 `--color-border-subtle`。

#### Scenario: 年度切换

- **WHEN** 顶栏年度切换
- **THEN** 日历自动重新计算该年月度盈亏
