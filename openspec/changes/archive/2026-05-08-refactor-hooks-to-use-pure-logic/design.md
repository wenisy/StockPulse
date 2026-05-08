## Context

提案 1 为了安全过渡选择"双份共存"——lib 抽出后 hook 内部不动。提案 3 是这个过渡的终点：完成切换并清理冗余。

## Goals / Non-Goals

**Goals:**
- hook 内部不再有"业务计算"代码，只剩 useState/setState、useCallback 编排、IO（fetch/localStorage/alert）
- 删除 `updateStockInternal` 这类与 lib 等价的重复实现
- hook 对外签名（props/return）保持不变，组件层零改动

**Non-Goals:**
- 不改 hook 对外契约（提案 4 才会从 hook 测试角度审视契约）
- 不重构 hook 之间的依赖关系（如果 useStockOperations 还需要 usePortfolioData 的 setter，照旧）
- 不引入新状态库

## Decisions

### 决策：替换以"语义对等"为准，不追求"行数最少"

例如原 hook：
```ts
setYearData(prev => {
  const updated = { ...prev };
  if (!updated[year]) updated[year] = {...};
  updated[year].cashBalance += amount;
  ...
});
```
改造后：
```ts
setYearData(prev => applyCashTransactionToYear(prev, year, amount, type, currentUser?.uuid));
```

### 决策：lib 函数边界外的"alert 弹窗"留在 hook

`confirmAddNewStock` 中的"现金不足确认"逻辑涉及 `setAlertInfo` 异步回调，**不抽到 lib**。lib 只提供"该不该弹"的判定函数（如 `shouldWarnInsufficientCash(yearData, year, txCost): boolean`），由 hook 决定弹窗时机与回调编排。

### 决策：旧的 `usePortfolioData.updateStock` 与 `useStockOperations.updateStockInternal` 合并方案

两者实际上几乎一致。处理方式：
- `useStockOperations` 删除 `updateStockInternal`
- `useStockOperations` 通过 props 接收 `updateStock`（已由 `usePortfolioData` 暴露给 `StockPortfolioTracker`）
- 或更简洁：让两个 hook 都直接调 `applyStockTransactionToYear`，根本不再有 hook 间相互调用

倾向后者。最终方案在实现时确定。

## Risks / Trade-offs

- **风险：替换过程引入行为差异** → 缓解：每次替换前后跑 `npm run test:coverage` 验证 lib 测试仍 100%；如果发现 lib 行为与 hook 原行为不一致，优先在本提案内修订 lib（并补单测）。
- **风险：hook 间的调用关系被破坏导致 React 重渲染异常** → 缓解：保留 `useCallback` 包装；本提案不优化重渲染性能，只做语义替换。
- **风险：删除 `updateStockInternal` 后某处仍在引用** → 缓解：依赖 TypeScript 编译错误。

## Open Questions

1. `useStockOperations` 表单状态（`newStockName` 等 6 个 useState）是否要拆出去？建议**不拆**，它们是"UI 状态"不属于领域，留在 hook 内合理。
2. 是否在本提案内同时把 hook 的 IO（fetch）也抽出？建议**不抽**，IO 抽离是另一种重构（依赖注入），范围爆炸。
