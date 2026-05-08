## 1. 准备

- [x] 1.1 在特性分支启动该变更
- [x] 1.2 确认提案 1 和提案 2 已归档（lib 存在且 100% 覆盖）
- [x] 1.3 跑一次 `npm run test:coverage`，确认 lib 层 100% 覆盖作为基线

## 2. usePortfolioData 改造

- [x] 2.1 `convertToCurrency` / `formatLargeNumber` 改为直接包装 lib 函数（或直接 re-export）
- [x] 2.2 `addNewYear` 改调 `carryOverYearData`
- [x] 2.3 `addCashTransaction` 改调 `applyCashTransactionToYear` + `isDuplicateCashTx` + `appendCashTxIncremental`
- [x] 2.4 `updateStock` 改调 `applyStockTransactionToYear` + `appendStockTxIncremental`
- [x] 2.5 每步改完跑一次 `npm test`，确认不退化

## 3. useStockOperations 改造

- [x] 3.1 删除 `updateStockInternal` 函数定义
- [x] 3.2 `confirmAddNewStock` 改用 lib 的 `computeWeightedCostPrice` / `computeRemainingCostAfterSell` / `computeRealizedProfit` 做预计算
- [x] 3.3 `confirmAddNewStock` 的现金不足判定抽为 lib `shouldWarnInsufficientCash`（新增）并补单测 → spec 更新到 portfolio-domain
- [x] 3.4 `handleSaveRow` 改调 `mergeEditedRowData`
- [x] 3.5 `handleDeleteStock` 改调 `removeStockFromAllYears`

## 4. 其他 hooks 审查

- [x] 4.1 `useCalculations.ts` 检查是否有等价 lib 的本地实现，替换
- [x] 4.2 `useChartData.ts` 检查，替换
- [x] 4.3 `useCalendarData.ts` 检查（重点：保留对后端 `/api/generateSnapshot` 的调用，不自行计算日内收益）

## 5. 校验

- [x] 5.1 `npm run lint` 通过（新增的 hook 禁用等价实现的 lint 规则若已加）
- [x] 5.2 `npm run build` 通过
- [x] 5.3 `npm run test:coverage` lib 部分仍 100%
- [x] 5.4 手动回归：启动 dev server，测试添加现金交易、买入、卖出、新建年份、行编辑、删除股票六个核心流程
- [x] 5.5 PR 描述附"hook 改动前后对照表"

## 6. 归档

- [x] 6.1 推送 + MR + review
- [x] 6.2 执行 `/opsx:archive refactor-hooks-to-use-pure-logic`
