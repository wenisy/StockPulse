## 1. 准备

- [x] 1.1 在 feat/fill-coverage-gaps 分支工作

## 2. 补 useStockRowEdit 测试（66% → 85%+）

- [x] 2.1 覆盖 handleSaveRow 有 affected 的路径
- [x] 2.2 覆盖 handleInputChange 各字段
- [x] 2.3 覆盖 handleDeleteStock onCancel

## 3. 补 useStockData 测试（70% → 85%+）

- [x] 3.1 覆盖 addStockTransaction 各分支

## 4. 补 useUserManagement 测试（72% → 85%+）

- [x] 4.1 覆盖 saveDataToBackend 成功/失败

## 5. 补 useUserSettings 测试（74% → 85%+）

- [x] 5.1 覆盖 localStorage getter 各初始化分支

## 6. 补 useStockForm 测试（79% → 85%+）

- [x] 6.1 覆盖 confirmAddNewStock onCancel 路径

## 7. 补 usePortfolioSync 测试（80% → 85%+）

- [x] 7.1 覆盖 refreshPrices 成功路径
- [x] 7.2 覆盖 saveDataToBackend 成功/失败/异常

## 8. 补 usePriceData 测试（80% → 85%+）

- [x] 8.1 覆盖 refreshPrices 成功路径

## 9. 提升阈值

- [x] 9.1 jest.config.js: lines 79 → 85, branches 55 → 68, functions 75 → 80, statements 79 → 85
- [x] 9.2 `npm run test:coverage` 阈值通过

## 10. 归档

- [x] 10.1 commit
- [x] 10.2 review-pipeline
- [x] 10.3 merge + push + archive
