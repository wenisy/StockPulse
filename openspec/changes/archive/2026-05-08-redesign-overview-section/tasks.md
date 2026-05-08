## 1. KPI 卡

- [x] 1.1 新增 `src/components/sections/overview/KpiCards.tsx`
- [x] 1.2 复用 `useChartData` / `useTableData` / `usePortfolioData` 得到 4 项指标
- [x] 1.3 单元测试

## 2. 走势图

- [x] 2.1 新增 `AssetTrendCard.tsx`，用 Recharts `<AreaChart>`
- [x] 2.2 颜色用 CSS 变量 `hsl(var(--color-accent))`
- [x] 2.3 无数据显示 EmptyState

## 3. 快捷操作

- [x] 3.1 新增 `QuickActions.tsx`，4 按钮
- [x] 3.2 接入 ReportDialog / StockForm / YearSelector 的命令式 API

## 4. 组装

- [x] 4.1 `OverviewSection.tsx` 组合以上三部分
- [x] 4.2 替换 `src/components/sections/OverviewSection.tsx` 的 legacy 占位
- [x] 4.3 集成测试：渲染 + EmptyState + 点击快捷操作
