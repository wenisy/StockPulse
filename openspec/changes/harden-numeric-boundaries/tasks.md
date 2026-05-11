## 1. lib/portfolio/portfolio-metrics 边界

- [x] 1.1 `computeReturnRate`：NaN/Infinity 投入 → 返回 0
- [x] 1.2 `computePortfolioValue`：含 NaN price 的 stocks → 不抛
- [x] 1.3 `computeAllocation`：所有 shares=0 → 全 0 占比
- [x] 1.4 `computeYearlyGrowth`：lastYearValue=0 / 负值 → 返回 0
- [x] 1.5 `computeYearNetReturnRate`：prevYear 缺失 / prev=0 / 负值 → null

## 2. useChartData 边界

- [x] 2.1 yearData={} 时 lineChartData 返回 [{}] 或空数组（不抛）
- [x] 2.2 years=[] 时 getLatestYearGrowthRate 返回 ""
- [x] 2.3 全 cashTransactions=[] → getLatestYearGrowthRate 返回 ""
- [x] 2.4 单年数据 → calculateInvestmentReturn 不 NaN

## 3. useCalculations 边界

- [x] 3.1 单年 → getLatestYearGrowthRate 返回 null
- [x] 3.2 prevYear shares 全 0 → previousValue=0 触发保护，返回 null
- [x] 3.3 prepareLineChartData 在 stocks=[] 时不抛

## 4. useYearData 边界（如需新建测试文件）

- [x] 4.1 latestYear 始终是有效字符串（非空、非 NaN）

## 5. 验收

- [x] 5.1 `npm run lint` 0 errors
- [x] 5.2 `npm run test:coverage` 全过 + 至少 +12 用例
- [x] 5.3 `npm run build` 成功
