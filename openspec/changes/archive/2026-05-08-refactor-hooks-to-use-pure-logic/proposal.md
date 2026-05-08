## Why

提案 1+2 完成后，lib 函数已经独立可用、100% 覆盖。但 hook 内部仍是"双份共存"——既有自己的实现，也可调用 lib。本提案完成切换：让 hook 内部全部改用 lib 函数，删除冗余实现，使 hook 真正退化为"useState + 副作用编排"的薄壳。

这一步是用户原始诉求"重构时不出问题"的兑现：lib 测试已经成为护栏，现在动 hook 是安全的。

## What Changes

- `usePortfolioData.ts`：内部的 `addNewYear` / `addCashTransaction` / `updateStock` / `convertToCurrency` / `formatLargeNumber` 改调 lib 函数
- `useStockOperations.ts`：删除 `updateStockInternal`（与 `usePortfolioData.updateStock` 重复），`confirmAddNewStock` / `handleEditRow` / `handleSaveRow` / `handleDeleteStock` 内部改调 lib 函数
- 其他 hooks（`useCalculations` / `useChartData` 等）：检查是否有等价于 lib 的本地实现，若有则替换
- hook 对外签名（导出的函数名、返回值结构）SHALL 保持不变，避免触发组件层修改

## Capabilities

### Modified Capabilities

- `portfolio-codebase-layout`: 增加约束"hooks MUST 通过 lib 完成所有领域计算与状态变换"，禁止 hook 内部再出现 lib 已有的等价实现。

### New Capabilities

无。

## Impact

- 修改：`src/hooks/{usePortfolioData,useStockOperations,useCalculations,useChartData,useCalendarData}.ts`
- 不改：lib 源代码、lib 测试、components、API 契约
- hook 对外行为：保持不变（由保留的旧集成测试 + 即将到来的 hook 测试共同保护）
