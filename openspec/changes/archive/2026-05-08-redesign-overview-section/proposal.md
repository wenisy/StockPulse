## Why

`redesign-ui-foundation` 合入后，`OverviewSection` 只是 legacy `InvestmentOverview + PortfolioOverview` 的包装。Overview 是用户第一眼看到的页面，应当给出"一眼看懂当前财务状况"的 dashboard 体验。

## What Changes

- 新增 `src/components/sections/overview/OverviewSection.tsx` 真实实现，替换之前的 legacy 嵌入。
- 新增 4 个 KPI `StatCard`（总资产、总收益、年初至今收益、持仓数），含同比 delta 与 `AnimatedNumber`。
- 新增 `AssetTrendCard`：复用 `useChartData`，用 Recharts 画资产走势面积图，线条用 `--color-accent`。
- 新增 `QuickActions` 行：4 个按钮（添加交易、切换年度、导出报告、查看日历），复用现有 hook 与 dialog。
- 移除 `OverviewSection` 对 `InvestmentOverview.tsx`、`PortfolioOverview.tsx` 的引用（它们保留在 legacy 路径下不动）。

## Capabilities

### New Capabilities
- `overview-section`：Overview 页面的布局、KPI 指标定义、走势图契约、快捷操作集合。

### Modified Capabilities
（无）

## Impact

- 新增 `src/components/sections/overview/*`（OverviewSection、KpiCards、AssetTrendCard、QuickActions）
- 新增 `src/components/sections/overview/__tests__/*`
- 不改 hooks / lib / 数据模型
