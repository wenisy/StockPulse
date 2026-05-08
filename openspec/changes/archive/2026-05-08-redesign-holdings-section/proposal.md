## Why

Holdings 是核心视图，当前 `StockTable.tsx` 行内编辑信息密度高但视觉老旧。需要重设计为现代数据表，支持排序、行高亮、精致的编辑态。

## What Changes

- 新增 `src/components/sections/holdings/HoldingsSection.tsx` 真实实现
- 新增 `HoldingsTable.tsx`：基于 semantic HTML `<table>`、粘性表头、行 hover 态、点击行展开详情抽屉
- 新增 `HoldingDetailDrawer.tsx`（Radix Dialog 的 side 变体）：显示单只股票的年度详情与编辑表单，复用 `useStockRowEdit`
- 新增 `AddTransactionButton`：放在 `PageHeader` 右侧，点开后复用 legacy `StockForm` dialog（或本地新建表单、复用 `useStockForm`）
- 保留现有 `StockTable.tsx`、`StockForm.ts` 在 legacy 路径；新 section 只复用 hook，不引用旧组件

## Capabilities

### New Capabilities
- `holdings-section`：持仓页面布局、表格契约、详情抽屉契约、快速添加交易的入口规范

## Impact

- 新增 `src/components/sections/holdings/*`
- 不改 hooks
