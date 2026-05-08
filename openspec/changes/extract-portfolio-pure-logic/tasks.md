## 1. 准备

- [ ] 1.1 在特性分支上启动该变更
- [ ] 1.2 创建 `src/lib/portfolio/` 目录
- [ ] 1.3 在 `eslint.config.mjs`（或 `.eslintrc.json`）添加 `no-restricted-imports` 规则，限制 `src/lib/**` 不可 import react/next/hooks/components
- [ ] 1.4 在 `jest.config.js` 添加 `collectCoverageFrom: ['src/lib/portfolio/**/*.ts']`（不启用阈值）

## 2. 抽出 currency 模块

- [ ] 2.1 创建 `src/lib/portfolio/currency.ts`
- [ ] 2.2 从 `usePortfolioData.ts:121-135` 复制 `convertToCurrency` / `formatLargeNumber` 实现
- [ ] 2.3 改写为接收 `exchangeRates` 参数（不再闭包捕获）
- [ ] 2.4 导出函数

## 3. 抽出 cost-basis 模块

- [ ] 3.1 创建 `src/lib/portfolio/cost-basis.ts`
- [ ] 3.2 从 `useStockOperations.ts:173-177` 提取加权成本价计算 → `computeWeightedCostPrice`
- [ ] 3.3 从 `useStockOperations.ts:220-224` 提取卖出剩余成本 → `computeRemainingCostAfterSell`
- [ ] 3.4 从 `useStockOperations.ts:236-237` 提取实现盈亏 → `computeRealizedProfit`
- [ ] 3.5 处理零股、零成本边界（按 spec 的 scenario）

## 4. 抽出 year-data 模块

- [ ] 4.1 创建 `src/lib/portfolio/year-data.ts`
- [ ] 4.2 从 `usePortfolioData.ts:505-562` 提取 `applyCashTransactionToYear`
- [ ] 4.3 从 `usePortfolioData.ts:565-664` + `useStockOperations.ts:54-148`（去重两份实现）提取 `applyStockTransactionToYear`
- [ ] 4.4 从 `usePortfolioData.ts:458-502` 提取 `carryOverYearData`
- [ ] 4.5 从 `useStockOperations.ts:421-459` 提取 `removeStockFromAllYears`
- [ ] 4.6 从 `useStockOperations.ts:323-405` 提取 `mergeEditedRowData`

## 5. 抽出 duplicate-tx 模块

- [ ] 5.1 创建 `src/lib/portfolio/duplicate-tx.ts`
- [ ] 5.2 从 `usePortfolioData.ts:534-539` 提取 `isDuplicateCashTx`

## 6. 抽出 incremental 模块

- [ ] 6.1 创建 `src/lib/portfolio/incremental.ts`
- [ ] 6.2 整合 `usePortfolioData.ts:640-658` 与 `useStockOperations.ts:124-142` 的拼装逻辑，提取 `appendStockTxIncremental` / `appendCashTxIncremental` / `appendYearlySummary`

## 7. 抽出 portfolio-metrics 模块

- [ ] 7.1 创建 `src/lib/portfolio/portfolio-metrics.ts`
- [ ] 7.2 实现 `computePortfolioValue`（总价值）、`computeReturnRate`（回报率）、`computeAllocation`（占比）、`computeYearlyGrowth`（年度增长）
- [ ] 7.3 这些指标在现有 hook 中分散存在（`useCalculations.ts` / `useChartData.ts`），抽取时注意行为一致

## 8. 抽出 years 模块

- [ ] 8.1 创建 `src/lib/portfolio/years.ts`
- [ ] 8.2 提取 `sortYearsDesc`、`computeLatestYear`

## 9. 校验与归档

- [ ] 9.1 运行 `npm run lint` 通过
- [ ] 9.2 运行 `npm run build` 通过
- [ ] 9.3 现有集成测试 `npm test` 至少不退化（容忍既有失败但不引入新失败）
- [ ] 9.4 PR 描述附"原位置 → 新位置"对照表
- [ ] 9.5 推送 + MR + 等待 review
- [ ] 9.6 执行 `/opsx:archive extract-portfolio-pure-logic`
