## Why

现有 `StockCharts.tsx` 提供了多维度图表，但颜色、布局、tooltip 样式都用默认 Recharts，与新设计系统脱节。需要主题化重绘。

## What Changes

- 新增 `src/components/sections/charts/ChartsSection.tsx` 真实实现
- 新增 `ChartSwitcher.tsx`：切换"资产走势 / 年度对比 / 持仓分布饼图 / 年化收益柱图"4 种视图
- 新增 `theme/chartTheme.ts`：Recharts 的统一主题 wrapper（颜色、tick 字体、grid 线样式），从 `tokens.ts` 读取
- 所有图表 stroke/fill 用 `--color-accent`、辅助色用 `--color-accent/60`、grid 用 `--color-border-subtle`

## Capabilities

### New Capabilities
- `charts-section`：图表页面契约与图表主题规范

## Impact

- 新增 `src/components/sections/charts/*`
- 不改 hooks；不改 Recharts 依赖
