## 1. 修复 3 处展示层 shares=0 过滤遗漏

- [x] 1.1 `src/hooks/useChartData.ts` line ~108：barChartData 的 latestStocks 收集加 `&& stock.shares > 0`
- [x] 1.2 `src/hooks/useCalculations.ts` line ~37：prepareLineChartData 的 stockNames 收集加 `&& stock.shares > 0`
- [x] 1.3 `src/components/StockTable.tsx` line ~244：tfoot 年度合计 reduce 加 `&& stock.shares > 0`

## 2. 新增防回归测试

- [x] 2.1 `src/hooks/__tests__/useChartData.test.ts`：补 4 个用例
  - lineChartData：shares=0 股票不作为 key 出现
  - lineChartData：shares>0 股票正常出现
  - barChartData：shares=0 股票不计入
  - barChartData：mixed 场景（部分 0 部分 >0）
- [x] 2.2 `src/hooks/__tests__/useCalculations.test.ts`：补 2 个用例
  - prepareLineChartData：stockNames 不含 shares=0
  - prepareLineChartData：mixed 场景

## 3. 验收

- [x] 3.1 `npm run lint` 0 errors
- [x] 3.2 `npm run test:coverage` 全过 + 阈值满足，新增至少 6 个用例
- [x] 3.3 `npm run build` 成功
