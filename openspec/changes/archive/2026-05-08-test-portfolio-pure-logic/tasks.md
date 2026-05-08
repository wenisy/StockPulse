## 1. 准备

- [x] 1.1 在特性分支启动该变更
- [x] 1.2 确认提案 1 已归档（lib 文件存在）
- [x] 1.3 创建 `src/lib/portfolio/__tests__/` 目录

## 2. currency.test.ts

- [x] 2.1 实现 `convertToCurrency` 用例（spec scenario：换算到港币、换算到未知货币）
- [x] 2.2 实现 `formatLargeNumber` 用例（spec scenario：万元级数字格式化）
- [x] 2.3 补充边界用例：负数、零、极大值

## 3. cost-basis.test.ts

- [x] 3.1 `computeWeightedCostPrice` 用例（首次买入、加仓、零股加仓三个 scenario）
- [x] 3.2 `computeRemainingCostAfterSell` 用例（部分卖出、全部卖出 scenario）
- [x] 3.3 `computeRealizedProfit` 用例（涵盖盈利、亏损、平本三种）

## 4. year-data.test.ts

- [x] 4.1 `applyCashTransactionToYear` 用例（多笔混合、不存在年度自动初始化）
- [x] 4.2 `applyStockTransactionToYear` 用例（买入、卖出、卖出超持仓拒绝、清仓后从 stocks 移除）
- [x] 4.3 `carryOverYearData` 用例（标准结转、重复年份拒绝、跳跃添加无参考年）
- [x] 4.4 `removeStockFromAllYears` 用例（多年同时删除、流水保留）
- [x] 4.5 `mergeEditedRowData` 用例（多年同时更新、字段解析失败视为清仓）

## 5. duplicate-tx.test.ts

- [x] 5.1 `isDuplicateCashTx` 用例（三元组重复、不同日期不算重复、空列表）

## 6. incremental.test.ts

- [x] 6.1 `appendStockTxIncremental` 用例（一笔买入的四张表追加）
- [x] 6.2 `appendCashTxIncremental` 用例
- [x] 6.3 `appendYearlySummary` 用例

## 7. portfolio-metrics.test.ts

- [x] 7.1 `computePortfolioValue` 用例（含股票与现金、仅有现金、空组合）
- [x] 7.2 `computeReturnRate` 用例（25% 正向、累计投入为 0 边界）
- [x] 7.3 `computeAllocation` 用例（多股票 + 现金、总价值为 0 边界）
- [x] 7.4 `computeYearlyGrowth` 用例（25% 增长、上年价值为 0 边界）

## 8. years.test.ts

- [x] 8.1 `sortYearsDesc` 用例（标准排序、空数组、单元素）
- [x] 8.2 `computeLatestYear` 用例（多年取最大、空数组返回兜底值）

## 9. 启用覆盖率阈值

- [x] 9.1 在 `jest.config.js` 添加 `coverageThreshold` 仅针对 `./src/lib/portfolio/`，全部 100%
- [x] 9.2 运行 `npm run test:coverage` 验证 100% 通过
- [x] 9.3 故意删一行 lib 代码验证阈值确实生效（事后撤销）

## 10. 校验与归档

- [x] 10.1 `npm test` 全部通过
- [x] 10.2 `npm run test:coverage` lib 部分 100%
- [x] 10.3 PR 描述列出"spec scenario → 测试用例"对照表
- [x] 10.4 推送 + MR + review
- [x] 10.5 执行 `/opsx:archive test-portfolio-pure-logic`
