## Why

代码里很多地方做了数值边界防护（`if (totalInvestment > 0)`、`years.length < 1` 等），但**没有测试断言这些保护持续有效**。一旦未来重构改坏了某处保护，KPI 卡可能直接显示 NaN，整个 Overview 页崩。这次为所有"已存在的边界保护"补**断言型测试**，作为防回归基线。

## What Changes

补**纯测试**（不改源代码逻辑）：

1. **lib/portfolio/portfolio-metrics.test.ts**：补 NaN/Infinity 输入边界
   - `computeReturnRate`：`portfolioValue=NaN`、`totalInvestment=Infinity`、负投入
   - `computePortfolioValue`：含 `price=NaN`、`shares=Infinity`
   - `computeAllocation`：`totalValue=0`、所有股票 `shares=0`
   - `computeYearlyGrowth`：`lastYearValue=0`、负值
   - `computeYearNetReturnRate`：`prevYear` 缺失场景

2. **hooks/__tests__/useChartData.test.ts**：补空数据 / 极端输入
   - `years=[]` 时 `getLatestYearGrowthRate` 返回 `""`（不 NaN）
   - 单年数据时年化合理
   - `cashTransactions=[]` 全部年份 → `netDeposits<=0` 返回 `""`
   - `lineChartData` 在 `yearData={}` 时返回空数组

3. **hooks/__tests__/useCalculations.test.ts**：补 prevYear 边界
   - `getLatestYearGrowthRate` 单年 / 0 上年 / 负上年 均返回 null
   - `prepareLineChartData` 空 stocks 不 crash

4. **hooks/__tests__/useYearData.test.ts**（新建或扩展）：
   - 初始数据为空对象时不崩
   - `latestYear` 始终是有效字符串

## Capabilities

**Modified Capabilities**:
- `portfolio-domain`：新增"边界保护必须有测试"约束

## Impact

- 仅新增测试，不改源代码
- 预期 +20 测试用例
- 覆盖率维持或微升
- 一旦未来源代码改坏边界保护，CI 立即拦截
