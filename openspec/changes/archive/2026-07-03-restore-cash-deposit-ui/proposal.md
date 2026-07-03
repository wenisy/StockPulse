## Why

UI 重构时删除了 legacy `ControlPanel.tsx`，现金入金表单未迁移到新 Section。后端逻辑（`addCashTransaction`、`useTrackerState` 现金表单状态）仍完整，但用户只能在持仓页添加股票交易，无法记录入金/出金，导致现金余额无法正确维护。

## What Changes

- 新增共享组件 `CashTransactionForm.tsx`，复用现有 `callbacks.addCashTransaction` 与 `trackerState` 表单状态
- 在 `HoldingsSection` 的 `PageHeader` 增加「添加入金」入口，与「添加交易」并列
- 在 `TransactionsSection` 增加「添加入金」入口，便于在流水页直接记录现金操作
- 补全 `HoldingsSection` 组件测试与 `testHelpers` mock 字段

## Capabilities

### New Capabilities

（无——本次为恢复既有能力，不引入新 capability）

### Modified Capabilities

- `holdings-section`：扩展 PageHeader 入口，要求提供现金入金/出金表单
- `transactions-section`：放宽「不修改数据」约束，允许通过既有 callback 添加现金交易（仍禁止编辑/删除历史流水）

## Impact

- **新增**：`src/components/sections/CashTransactionForm.tsx`
- **修改**：`src/components/sections/holdings/HoldingsSection.tsx`、`src/components/sections/TransactionsSection.tsx`、`src/components/sections/testHelpers.ts`、`src/components/sections/__tests__/HoldingsSection.test.tsx`
- **不涉及**：hooks（`useYearData` / `useTrackerCallbacks` 逻辑不变）、后端 API