## 1. 新建 useYearData（从 usePortfolioData 提取）

- [x] 1.1 创建 `src/hooks/useYearData.ts`，定义 `UseYearDataProps` 和 `UseYearDataReturn` 接口
- [x] 1.2 迁移状态：yearData / years / filteredYears / selectedYear / comparisonYear / incrementalChanges / exchangeRates
- [x] 1.3 迁移操作：addNewYear（调 lib/year-data.carryOverYearData）
- [x] 1.4 迁移操作：addCashTransaction（调 lib/year-data.applyCashTransactionToYear + lib/duplicate-tx + lib/incremental）
- [x] 1.5 迁移操作：updateStock（调 lib/year-data.applyStockTransactionToYear + lib/incremental）
- [x] 1.6 迁移工具：convertToCurrency / formatLargeNumber（wrap lib/currency 函数，依赖 exchangeRates 状态）
- [x] 1.7 迁移工具：latestYear（计算属性，依赖 years）
- [x] 1.8 确认文件行数 ≤ 200 行

## 2. 新建 usePortfolioSync（从 usePortfolioData 提取）

- [x] 2.1 创建 `src/hooks/usePortfolioSync.ts`，定义接收来自 useYearData 的 setter 的 props 类型
- [x] 2.2 迁移状态：isLoading / priceData / lastRefreshTime
- [x] 2.3 迁移 IO：fetchJsonData（含 legacy 回退 + 后台加载剩余年份逻辑）
- [x] 2.4 迁移 IO：saveDataToBackend
- [x] 2.5 迁移 IO：refreshPrices
- [x] 2.6 迁移工具：handleTokenExpired / getBasePath
- [x] 2.7 确认文件行数 ≤ 200 行（如超出，提取 fetch 辅助逻辑到单独函数）

## 3. 改写 usePortfolioData 为聚合 hook

- [x] 3.1 改写 `src/hooks/usePortfolioData.ts`：内部调用 useYearData + usePortfolioSync
- [x] 3.2 合并返回值，确保 `UsePortfolioDataReturn` 中所有字段名和类型与重构前完全一致
- [x] 3.3 处理命名冲突（如两个子 hook 都暴露 isLoading 时）
- [x] 3.4 跑 TypeScript 编译：`npx tsc --noEmit`，确认无类型错误

## 4. 新建 useStockForm（从 useStockOperations 提取）

- [x] 4.1 创建 `src/hooks/useStockForm.ts`
- [x] 4.2 迁移表单状态：newStockName / newShares / newPrice / newYearEndPrice / newStockSymbol / transactionType
- [x] 4.3 迁移操作：resetForm
- [x] 4.4 迁移操作：commitStockTransaction（内部私有，调 lib/year-data + lib/incremental）
- [x] 4.5 迁移操作：confirmAddNewStock（含现金不足弹窗 + 卖超持仓拒绝，调 lib/cost-basis）
- [x] 4.6 确认文件行数 ≤ 200 行

## 5. 新建 useStockRowEdit（从 useStockOperations 提取）

- [x] 5.1 创建 `src/hooks/useStockRowEdit.ts`
- [x] 5.2 迁移编辑状态：editingStockName / editedRowData
- [x] 5.3 迁移操作：handleEditRow / handleSaveRow / handleInputChange
- [x] 5.4 迁移操作：handleDeleteStock（含确认弹窗，调 lib/year-data.removeStockFromAllYears）
- [x] 5.5 确认文件行数 ≤ 200 行

## 6. 改写 useStockOperations 为聚合 hook

- [x] 6.1 改写 `src/hooks/useStockOperations.ts`：内部调用 useStockForm + useStockRowEdit
- [x] 6.2 合并返回值，确保所有字段与重构前一致
- [x] 6.3 跑 TypeScript 编译确认无类型错误

## 7. 校验（lint + build + test）

- [x] 7.1 `npm run lint`：0 errors
- [x] 7.2 `npm run build`：通过
- [x] 7.3 `npm test`：221 passed（与重构前完全一致，不新增失败）
- [x] 7.4 `npm run test:coverage`：hooks 覆盖率不低于重构前（lines ≥ 79%）

## 8. 补写 4 个新 hook 的测试

- [x] 8.1 `src/hooks/__tests__/useYearData.test.ts`：覆盖 addNewYear / addCashTransaction / updateStock / convertToCurrency
- [x] 8.2 `src/hooks/__tests__/usePortfolioSync.test.ts`：覆盖 fetchJsonData（成功/401/回退）/ refreshPrices / saveDataToBackend
- [x] 8.3 `src/hooks/__tests__/useStockForm.test.ts`：覆盖 confirmAddNewStock（买入/卖出/现金不足/卖超）
- [x] 8.4 `src/hooks/__tests__/useStockRowEdit.test.ts`：覆盖 handleEditRow / handleSaveRow / handleDeleteStock
- [x] 8.5 `npm run test:coverage`：hooks 覆盖率提升（目标 lines ≥ 82%）

## 9. 归档

- [x] 9.1 `openspec validate refactor-hooks-structure --strict` 通过
- [x] 9.2 commit + push + 归档 `/opsx:archive refactor-hooks-structure`
