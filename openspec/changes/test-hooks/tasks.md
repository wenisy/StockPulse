## 1. 准备

- [x] 1.1 在特性分支启动该变更
- [x] 1.2 确认提案 3 已归档（hooks 已调用 lib）
- [x] 1.3 创建 `src/hooks/__tests__/` 目录

## 2. usePortfolioData.test.ts

- [x] 2.1 初值测试：初始 years/yearData 来自 stockInitialData
- [x] 2.2 `addNewYear` 测试：正常添加、重复年份被忽略
- [x] 2.3 `addCashTransaction` 测试：deposit / withdraw 后 cashBalance 正确
- [x] 2.4 `fetchJsonData` 测试：200 成功、401 触发 handleTokenExpired、旧版 API 回退
- [x] 2.5 `refreshPrices` 测试：当年无股票短路、成功更新价格、失败弹 alert
- [x] 2.6 `saveDataToBackend` 测试：成功清空 incrementalChanges、失败保留

## 3. useStockOperations.test.ts

- [x] 3.1 表单状态读写：newStockName/newShares/... 的 setter
- [x] 3.2 `confirmAddNewStock` 买入测试：现金充足直接下单、不足弹确认
- [x] 3.3 `confirmAddNewStock` 卖出测试：超持仓被拒绝
- [x] 3.4 `handleEditRow` / `handleSaveRow`：行编辑状态切换
- [x] 3.5 `handleDeleteStock`：带确认弹窗的删除

## 4. useCalculations.test.ts

- [x] 4.1 依赖 yearData/priceData 的各种派生值计算

## 5. useChartData.test.ts

- [x] 5.1 图表数据生成（mock yearData 后验证结构）

## 6. useCalendarData.test.ts

- [x] 6.1 日历数据通过 `POST /api/generateSnapshot` 获取（mock fetch）
- [x] 6.2 空响应与失败响应的兜底

## 7. usePriceData.test.ts

- [x] 7.1 价格加载 happy path
- [x] 7.2 缓存命中逻辑

## 8. useStockData.test.ts / useTableData.test.ts

- [x] 8.1 各自的派生状态正确
- [x] 8.2 边界：空数据集

## 9. useUserManagement.test.ts / useUserSettings.test.ts

- [x] 9.1 登录/注册 happy path（mock fetch）
- [x] 9.2 token 保存到 localStorage
- [x] 9.3 设置持久化

## 10. 启用 hooks 覆盖率阈值

- [x] 10.1 在 `jest.config.js` 为 `./src/hooks/` 添加 coverageThreshold（line 80, branch 70, function 80, statement 80）
- [x] 10.2 `npm run test:coverage` 通过

## 11. 归档

- [x] 11.1 `npm test` 全部通过
- [x] 11.2 PR review
- [x] 11.3 `/opsx:archive test-hooks`
