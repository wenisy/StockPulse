## Context

上一个 change（`add-planner-daily-value-chart`）将 `DailyTrendChart` 设计为哑组件，由 `PlannerSection` 统一持有 `useCalendarData` 状态，以"零额外 API 调用"为核心约束。

这个设计在功能上可行（日历切换月份时图表数据会跟随更新），但存在两个 UX 问题：
1. 图表无月份标签，用户不知道图表对应哪个月
2. 图表无独立导航，必须通过日历来切换月份（操作不直觉）

本次 change 改为"图表自治"架构，接受"初始化时多 1 次 API 调用"的代价，换取独立导航体验和更清晰的 UX。

## Goals / Non-Goals

**Goals:**
- `DailyTrendChart` 内置月份选择器（prev/next + 月份标签）
- 图表显示 `totalGain`（涨跌金额）和 `totalGainPercent`（涨跌幅）在 Tooltip 中
- `PlannerSection` 简化（移除共享状态）

**Non-Goals:**
- 多月/全年跨月折线图（当前月粒度足够）
- `DailyTrendChart` 与日历"联动同步"（用户主动导航即可）
- 第二 Y 轴展示涨跌幅（Tooltip 足够，双轴视觉复杂）
- 图表内"年份选择器"（只需 prev/next 月即可穿越年份）

## Decisions

### 1. 图表自治 vs 父组件注入

**决策**：`DailyTrendChart` 自持 `year`/`month` state + 内部 `useCalendarData()`，不依赖父组件注入 `calendarData`。

**理由**：
- 父注入方案的核心 UX 问题是"图表导航与日历耦合"，用户必须通过日历操作图表
- 自治方案代价是初始化时多一次 API 调用；对 Vercel 免费 6000 次/天的限额，单个用户每次页面加载多 1 次完全可以接受
- 自治方案更易扩展（将来加"3个月"视图只需在图表内部处理）

**替代方案排除**：
- ❌ 父注入 + 图表独立月份 state（需要父组件感知图表的月份状态，双向数据流复杂）

### 2. 涨跌幅展示方式

**决策**：只在 Tooltip 中显示 `totalGain` 和 `totalGainPercent`，用颜色区分正负（绿色/红色）。

**理由**：
- 双 Y 轴会让 Recharts 的轴刻度对齐复杂，且涨跌幅值域（-5% ~ +5%）与资产总值（几十万）差距过大，双轴体验往往适得其反
- Tooltip 是用户悬浮时关注细节的场景，在此展示涨跌信息刚好合适

### 3. 月份导航 UI

**决策**：在图表标题行右侧放置 `←` / `→` 按钮 + `YYYY年MM月` 文本，使用项目现有 `Button` 组件（`variant="ghost"`，`size="sm"`）。

**理由**：与日历区块的月份导航视觉语言保持一致。

### 4. PlannerSection 清理

**决策**：移除 `PlannerSection` 中的 `useCalendarData` 调用及传给图表和 `ProfitLossCalendar` 的外部 props，让两个子组件完全自治。

**理由**：共享状态的存在意义（零额外调用）已被图表自治方案放弃；继续保留只会增加 `PlannerSection` 的无谓复杂度。`ProfitLossCalendar` 外部 props 接口仍保留（不删除 props 定义），只是不再由 `PlannerSection` 传入，组件自动 fallback 到内部 hook 模式。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| 初始化时 2 次 `calendarData` 请求（图表 + 日历各一次） | 后端有内存缓存（月度数据 10 分钟 TTL），第二次命中缓存不打 Notion；即使都是 cold request，2 次/页面加载对 Vercel 免费配额影响可忽略 |
| `totalGain`/`totalGainPercent` 在某些日期为 0（周末/无快照） | 已有 `hasData` 过滤，这些点不渲染；Tooltip 只在 `activeDot` hover 时显示，不会展示空数据点 |
