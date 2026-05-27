## Context

Planner 页面（`?view=planner`）已包含退休计算器和月度盈亏日历两个区块。日历区块内部通过 `useCalendarData` hook 直接调用后端 `/api/calendarData`，每次切换年/月都会触发一次 Vercel Serverless Function 调用。

后端已在每条日历响应中返回 `totalValue`（每日资产总值），但前端 `CalendarData` 类型尚未声明该字段。

**Vercel 免费限制**：6,000 次/天 Serverless 调用，单次最长 10 秒。最高优先级约束是**不增加额外 API 调用**。

## Goals / Non-Goals

**Goals:**
- 在 Planner 页面月度盈亏日历下方新增每日资产总值折线图
- 折线图与日历共享同一份 `calendarData`，月份切换时同步更新，**零额外 API 调用**
- 未登录 / 无数据时优雅降级
- 加载中显示骨架屏

**Non-Goals:**
- 跨月/多月/全历史折线图（当前月即够用，跨月需多次 API 调用）
- 新增后端 API 接口
- 图表交互（缩放、刷选等）
- 引入新图表库

## Decisions

### 1. 状态提升（最重要决策）

**决策**：将 `useCalendarData` 从 `ProfitLossCalendar` 内部迁移到父级 `PlannerSection`，通过 props 向下传递数据。

**理由**：这是避免重复 API 调用的唯一可行方案。若日历和折线图各自持有独立的 hook 实例，同一月份会被请求两次，直接消耗双倍 Vercel 调用配额。

**替代方案排除**：
- ❌ 用 Context 共享：引入全局状态污染，Planner 专属数据没必要放 Context
- ❌ 两个组件各自独立 hook + 重复调用：违反零额外 API 调用目标
- ❌ 在折线图内部从 `ProfitLossCalendar` 的 DOM 读数据：无法实现

**向下兼容**：`ProfitLossCalendar` 改为"props 优先，无 props 则内部 hook 兜底"模式，不破坏现有用法。

### 2. totalValue 字段处理

**决策**：在 `CalendarData` 接口中补充 `totalValue?: number`（可选字段），不修改后端。

**理由**：后端已返回该字段，只需前端类型声明对齐即可。设为可选以兼容无快照的日期（周末/节假日）。

### 3. 图表库选型

**决策**：使用项目已安装的 Recharts `LineChart`（`recharts@2.15`），与 `StockCharts.tsx` 保持一致的技术栈。

**理由**：0 新增依赖；项目内已有使用样例可参考。

### 4. 折线图数据过滤策略

**决策**：只渲染 `hasData === true && totalValue > 0` 的日期点，跳过周末/无快照日期（不在折线中插入 null gap）。

**理由**：null gap 在 Recharts 中会断线，视觉上不自然；股票市场本就不连续，连续折线更符合用户预期。

### 5. 时间范围

**决策**：默认展示当前选中月份（与日历联动），不提供额外时间范围选择器（初版）。

**理由**：初版 YAGNI——月份切换按钮已在日历上，无需重复 UI。复杂范围选择器会显著增加实现成本，且跨月需额外 API 调用，违反 Vercel 调用约束。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| `ProfitLossCalendar` 现有内部状态管理逻辑复杂（含快照生成、月份导航等），提升状态时可能遗漏 | 采用"props 优先，内部 hook 兜底"策略，最小化改动面；仔细阅读组件现有逻辑 |
| 某月无快照数据（数据为空）时折线图显示空白 | 显示"暂无数据"提示，与日历的空状态一致 |
| `totalValue` 字段在历史旧快照中可能为 0 或缺失 | 过滤掉 `totalValue <= 0` 的点，不在折线中渲染 |
| Vercel 免费 10 秒执行上限（现有 vercel.json 已配 30-60s maxDuration） | 本次改动不新增接口，不影响此现状 |
