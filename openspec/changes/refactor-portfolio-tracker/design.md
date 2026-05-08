## Context

StockPortfolioTracker 是应用入口，聚合了 usePortfolioData / useStockOperations / useChartData / useTableData / useUserSettings 等所有业务 hook，并且自己持有大量 UI 级状态。

## Goals / Non-Goals

**Goals:**
- 主文件 ≤ 300 行
- 3 个新 hook 按职责（state / effects / callbacks）切分
- 7 个集成测试零修改继续通过
- 不改业务行为

**Non-Goals:**
- 不拆子组件（已经有 PortfolioHeader/ControlPanel/InvestmentOverview 等）
- 不抽象 useTrackerContext 之类的全局 state（避免引入 Context 复杂度）

## Decisions

### 决策 1：useTrackerState — 16 个 useState 按业务域分组

```ts
{
  auth: { isLoggedIn, setIsLoggedIn, currentUser, setCurrentUser, saveTimeoutRef },
  alert: { alertInfo, setAlertInfo },
  form: { newYear, setNewYear, cashTransactionAmount, setCashTransactionAmount,
          cashTransactionType, setCashTransactionType,
          isCashTransactionLoading, setIsCashTransactionLoading },
  chart: { showPositionChart, setShowPositionChart,
           hiddenSeries, setHiddenSeries,
           hiddenStocks, setHiddenStocks },
  report: { isReportDialogOpen, setIsReportDialogOpen,
            selectedReportYear, setSelectedReportYear },
  misc: { stockSymbols, setStockSymbols, currency, setCurrency },
}
```

主组件通过解构拿到所有字段，props 传递给子组件。

### 决策 2：useTrackerEffects — 副作用集中管理

接收从 useTrackerState 和业务 hook 来的所需依赖，内部注册 6 个 useEffect：
- 初始化数据（localStorage token + fetchJsonData）
- localStorage 保存 yearData
- debounced save to backend
- window focus 价格刷新
- selectedYear 变化监听
- 其他

### 决策 3：useTrackerCallbacks — 业务 callback 集中

封装 onAddStock / handleReportClick / handleLegendClick 等。主组件只 import 使用。

### 决策 4：主组件的"组合"模式

```ts
const trackerState = useTrackerState();
const portfolioData = usePortfolioData({...});
const stockOps = useStockOperations({...});
// ...
useTrackerEffects({trackerState, portfolioData, ...});
const callbacks = useTrackerCallbacks({trackerState, portfolioData, ...});

return (
  <>
    <PortfolioHeader ... />
    <ControlPanel ... />
    ...
  </>
);
```

## Risks / Trade-offs

- **风险：hook 间依赖成环**（state 传给 effects，effects 又需要 callbacks）→ 缓解：按 state → callbacks → effects 单向依赖顺序
- **风险：拆分后 useEffect 依赖数组容易写错** → 缓解：保持现有依赖列表不变，只是把 effect 搬过去

## Migration Plan

1. 新建目录
2. 写 useTrackerState（最独立）
3. 写 useTrackerCallbacks
4. 写 useTrackerEffects
5. 改写 StockPortfolioTracker
6. 跑测试
7. review-pipeline + archive

## Open Questions

无。
