## 1. 共享表单组件

- [x] 1.1 新增 `CashTransactionForm.tsx`，绑定 `trackerState` 与 `callbacks.addCashTransaction`
- [x] 1.2 表单包含年份、类型（存入/取出）、金额、余额提示与提交按钮

## 2. Section 入口

- [x] 2.1 `HoldingsSection` PageHeader 增加「添加入金」按钮，与股票表单互斥展示
- [x] 2.2 `TransactionsSection` PageHeader 增加「添加入金」按钮并嵌入 `CashTransactionForm`

## 3. 测试

- [x] 3.1 更新 `testHelpers`：补全 `cashTransactionAmount`、`addCashTransaction` 等 mock
- [x] 3.2 `HoldingsSection.test.tsx` 增加「点击添加入金后表单展开」用例
- [x] 3.3 运行 `HoldingsSection` 测试通过

## 4. 元任务

- [x] 4.1 执行 `/tcsc:review-pipeline restore-cash-deposit-ui` 完成审查
- [x] 4.2 审查通过后执行 `/opsx:archive restore-cash-deposit-ui`