# Delta Spec: portfolio-domain（扩展 shares=0 过滤覆盖 + 测试约束）

## MODIFIED Requirements

### Requirement: shares=0 持仓不得出现在任何用户可见的展示层

系统在渲染以下任何 UI 时，SHALL 过滤掉当年 `shares = 0` 的股票条目：

1. **持仓列表**（HoldingsSection）
2. **折线图**（StockCharts/lineChartData）—— useChartData.lineChartData 收集 latestStocks 时
3. **柱状图**（StockCharts/barChartData）—— useChartData.barChartData 收集 latestStocks 时
4. **prepareLineChartData**（useCalculations.ts）—— 收集 stockNames 时
5. **年报弹窗 ReportDialog**（preparePieChartData / prepareBarChartData / prepareTopPerformers）
6. **GrowthInfo**：持仓价值 reduce 前
7. **StockTable tfoot 合计行**：年度总市值 reduce 前

#### Scenario: 任意展示层含 shares=0 条目

- **GIVEN** yearData["2026"].stocks 含 `{ name: "Amazon", shares: 0 }`
- **WHEN** 用户访问任何上述列出的展示层
- **THEN** Amazon 不出现在该展示层中
- **AND** 即使 hiddenStocks["Amazon"] === false（未被手动隐藏）也不出现

## ADDED Requirements

### Requirement: shares=0 过滤必须有单元测试防回归

为防止本类 bug 反复出现，所有已实现 shares=0 过滤的 hook/工具函数 MUST 在对应测试文件中包含至少一个 shares=0 场景：

- `useChartData.test.ts`：覆盖 lineChartData / barChartData 在含 shares=0 输入时的行为
- `useCalculations.test.ts`：覆盖 prepareLineChartData 在含 shares=0 输入时的行为

#### Scenario: useChartData lineChartData 防回归

- **GIVEN** mock yearData 含 `[{ shares: 100 }, { shares: 0 }]`
- **WHEN** 调用 useChartData，读取 lineChartData
- **THEN** 数据点中只有 shares > 0 的股票作为 key 出现

#### Scenario: useCalculations prepareLineChartData 防回归

- **GIVEN** mock yearData 含 `[{ shares: 100 }, { shares: 0 }]`
- **WHEN** 调用 prepareLineChartData
- **THEN** 返回的 stockNames 不包含 shares=0 股票
