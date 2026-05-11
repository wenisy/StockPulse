## 1. ReportDialog 过滤修复

- [x] 1.1 `preparePieChartData`：过滤条件加 `&& stock.shares > 0`
- [x] 1.2 `prepareBarChartData`：过滤条件加 `&& stock.shares > 0`
- [x] 1.3 `prepareTopPerformers`：过滤条件加 `&& stock.shares > 0`

## 2. GrowthInfo 语义明确化

- [x] 2.1 持仓价值 reduce 前加 `.filter(s => s.shares > 0)`（不影响数值，语义明确）

## 3. 验收

- [x] 3.1 `npm run lint` 0 errors
- [x] 3.2 `npm run test:coverage` 全过，阈值满足
- [x] 3.3 `npm run build` 成功
