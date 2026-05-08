## Why

`StockPortfolioTracker.tsx` 是应用根组件，553 行，混合：

- 16 个 useState（用户认证 + 表单 + 筛选 + 图表状态 + 报表 + 币种）
- 6 个 useEffect（初始化数据、localStorage 同步、debounced save、window 监听）
- 8 个 callback（handleReportClick / onAddStock / handleYearFilterSelectionChange 等）
- 10+ 子组件渲染

测试网已就绪（`refactor-large-components` 阶段写了 7 个集成测试）。保持 API 和 UI 不变的前提下，按 UI 层 / 副作用 / 回调 / 子组件视图拆分。

## What Changes

拆为新 `components/tracker/` 目录 + 3 个 hook：

```
src/components/tracker/
├── hooks/
│   ├── useTrackerState.ts       16 个 useState 按业务分组聚合
│   ├── useTrackerCallbacks.ts   8 个 handler 聚合
│   └── useTrackerEffects.ts     6 个 useEffect 聚合
```

主文件 `src/components/StockPortfolioTracker.tsx` 改为纯 layout，≤ 300 行。

**明确范围**：
- 不改任何业务行为
- 不修改子组件（PortfolioHeader 等保持现状）
- 不改 API 调用

## Capabilities

### Modified Capabilities

- `component-structure`: 增加"应用根组件的状态拆分模式"——UI state / effects / callbacks 各有归属 hook

## Impact

- 新增：`src/components/tracker/hooks/` 3 个文件
- 修改：`src/components/StockPortfolioTracker.tsx` 改为编排层
- 不改：子组件、API、localStorage 键名、DOM 结构
- 测试：7 个集成测试不变
