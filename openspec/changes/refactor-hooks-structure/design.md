## Context

经过提案 1-5 的积累，`src/lib/portfolio/` 已有 100% 覆盖的纯函数层，hooks 已经调用 lib 而非自行实现业务逻辑。现在 hooks 的主要职责是：**状态管理 + 副作用编排**。

拆分的前提条件已满足：
- lib 测试 100%：拆分过程中如果不小心改变了业务逻辑，lib 测试会立刻报错
- hooks 测试 79%+：拆分后可以直接验证新 hook 的行为
- StockPortfolioTracker 组件通过聚合 hook 调用，接口不变则组件不需要动

当前大 hook 的职责混杂示意：

```
usePortfolioData（611 行）
├── 状态：yearData / years / filteredYears / selectedYear / comparisonYear
├── 状态：isLoading / priceData / exchangeRates / lastRefreshTime
├── 状态：incrementalChanges
├── IO：fetchJsonData（含 legacy 回退 + 后台加载剩余年份）
├── IO：refreshPrices（调后端更新价格）
├── IO：saveDataToBackend（同步到 Notion）
├── 操作：addNewYear / addCashTransaction / updateStock
├── 工具：handleTokenExpired / getBasePath
└── 工具：convertToCurrency / formatLargeNumber

useStockOperations（438 行）
├── 表单状态：6 个 useState（stockName/shares/price/yearEndPrice/symbol/type）
├── 编辑状态：editingStockName / editedRowData
├── 操作：commitStockTransaction / confirmAddNewStock（含弹窗链）
├── 编辑：handleEditRow / handleSaveRow / handleInputChange
└── 操作：handleDeleteStock（含弹窗链）
```

## Goals / Non-Goals

**Goals:**
- `usePortfolioData` 拆为 `useYearData`（状态 + 操作）和 `usePortfolioSync`（IO）
- `useStockOperations` 拆为 `useStockForm`（表单 + 交易）和 `useStockRowEdit`（行编辑 + 删除）
- 每个新 hook 不超过 200 行，职责用一句话描述清楚
- 原 `usePortfolioData` 和 `useStockOperations` 保留为聚合 hook，对外 API 完全不变
- 4 个新 hook 各有配套测试文件
- hooks 覆盖率整体不低于当前水平

**Non-Goals:**
- 不引入 Zustand / Redux 等状态库
- 不修改 `src/components/` 中任何组件
- 不修改 `src/lib/portfolio/` 纯函数层
- 不修改其他已存在的 hook（useCalculations / useChartData 等）

## Decisions

### 决策 1：聚合 hook 模式（向下兼容）

不删除 `usePortfolioData`，而是将其改为：

```ts
// 改造后的 usePortfolioData（~30 行）
export function usePortfolioData(props: UsePortfolioDataProps): UsePortfolioDataReturn {
  const yearData = useYearData({ currentUser: props.currentUser });
  const sync = usePortfolioSync({
    yearData: yearData.yearData,
    setYearData: yearData.setYearData,
    setIncrementalChanges: yearData.setIncrementalChanges,
    setAlertInfo: props.setAlertInfo,
  });

  return {
    ...yearData,
    ...sync,
    // 解决命名冲突（如两者都有 isLoading）
    isLoading: sync.isLoading,
  };
}
```

**为何选聚合而非删除**：组件调用侧零改动，重构风险降到最低。未来有需要时，组件可以逐步迁移到直接使用 `useYearData` 或 `usePortfolioSync`。

### 决策 2：useYearData 的边界

管理"年度投资组合数据"的全部本地状态和操作，不涉及任何网络 IO：

```
状态：yearData / years / filteredYears / selectedYear / comparisonYear / incrementalChanges
操作：addNewYear / addCashTransaction / updateStock
工具：convertToCurrency / formatLargeNumber（直接 wrap lib 函数，放在这里是因为它们依赖 exchangeRates 状态）
状态：exchangeRates（属于"本地汇率配置"，归 yearData 管）
```

### 决策 3：usePortfolioSync 的边界

负责所有后端通信和副作用，不持有任何业务数据状态：

```
状态：isLoading / priceData / lastRefreshTime
操作（IO）：fetchJsonData / saveDataToBackend / refreshPrices
工具：handleTokenExpired / getBasePath
props：需要接收 setYearData / setYears / setFilteredYears / setSelectedYear /
       setComparisonYear / setIncrementalChanges / setAlertInfo
      （这些来自 useYearData，sync 只调用 setter，不持有 state）
```

**依赖方向**：useYearData（状态层）← usePortfolioSync（IO 层）。IO 层通过 props 接收 setter，不反向依赖状态层。

### 决策 4：useStockForm 的边界

管理"添加股票交易"的表单生命周期：

```
状态：newStockName / newShares / newPrice / newYearEndPrice / newStockSymbol / transactionType
操作：resetForm / confirmAddNewStock（含现金不足弹窗、卖超持仓拒绝等逻辑）
props：yearData / setYearData / setIncrementalChanges / setAlertInfo / currentUser
```

### 决策 5：useStockRowEdit 的边界

管理"行编辑"和"删除股票"两个操作，它们共享"遍历所有年份"的上下文：

```
状态：editingStockName / editedRowData
操作：handleEditRow / handleSaveRow / handleInputChange / handleDeleteStock
props：yearData / setYearData / setIncrementalChanges / setAlertInfo / currentUser / years
```

### 决策 6：交易提交逻辑（commitStockTransaction）的归属

`commitStockTransaction` 是 `useStockForm` 内部调用的私有函数（不对外暴露），不单独提取为 hook。它调用 lib 的 `applyStockTransactionToYear` + `appendStockTxIncremental`，属于 `useStockForm` 内部的状态变换编排。

### 决策 7：测试策略

- 4 个新 hook 各写 `__tests__/*.test.ts`
- 聚合 hook（`usePortfolioData` / `useStockOperations`）的现有测试不删，继续作为集成测试
- 新 hook 的单元测试聚焦"更小的职责边界"，减少 mock 复杂度

## Risks / Trade-offs

- **风险：setter props 传递链**：`usePortfolioSync` 需要接收来自 `useYearData` 的多个 setter，props 列表较长 → 缓解：把相关 setter 打包成 `YearDataActions` 类型对象传入
- **风险：isLoading 命名冲突**：`useYearData` 和 `usePortfolioSync` 都可能需要 `isLoading` → 缓解：聚合时明确用 `sync.isLoading` 覆盖，保持 `UsePortfolioDataReturn` 接口不变
- **风险：拆分后 hook 测试文件数量增加**：从 2 个大文件的测试变成 4+2 个测试文件 → 接受，更小的文件覆盖率更容易提升
- **权衡：聚合 hook 是"临时过渡"还是"长期保留"**：建议长期保留，它作为组件调用的稳定门面，子 hook 可以自由重构而不影响调用方

## Migration Plan

1. 新建 4 个子 hook 文件（内容从大 hook 提取）
2. 改写聚合 hook（调用子 hook + 保持返回接口）
3. 跑 CI（`npm run test:coverage` + `npm run build`）
4. 为 4 个新 hook 补写测试
5. merge + 归档

## Open Questions

1. `getBasePath` 函数依赖 `window.location`，归入 `usePortfolioSync` 还是单独提取？建议留在 sync，因为它是"确定后端请求路径"的辅助工具，与 IO 逻辑相关。
2. `priceData` 状态是否应该移到 `useYearData`（因为它是业务数据）？暂时留在 `usePortfolioSync`，因为它目前只被价格刷新逻辑使用。
