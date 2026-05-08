## Why

当前 legacy 视图没有独立的"交易流水"页，交易记录只能在 PortfolioOverview 里看到。新版把"Transactions"升格为一级 section，让用户能按时间线浏览全部交易。

## What Changes

- 新增 `src/components/sections/transactions/TransactionsSection.tsx` 真实实现
- 新增 `TransactionTimeline.tsx`：按时间倒序的卡片列表（买/卖/现金三种事件类型），含筛选（年度、类型、股票）
- 新增 `TransactionFilters.tsx`：多条件筛选 UI
- 数据来源：聚合所有年度的 `stockTransactions` + `cashTransactions`，就地在客户端过滤、排序；不新增 hook

## Capabilities

### New Capabilities
- `transactions-section`：交易流水页面契约

## Impact

- 新增 `src/components/sections/transactions/*`
- 不改 hooks
