# Delta Spec: portfolio-domain（shares=0 展示过滤规则）

## ADDED Requirements

### Requirement: shares=0 持仓不得出现在任何用户可见的展示层

系统在渲染以下任何 UI 时，SHALL 过滤掉当年 `shares = 0` 的股票条目，使其不出现在用户可见的内容中：

1. **持仓列表**（HoldingsSection）：仅展示历史上至少有过一年 shares > 0 的股票
2. **折线图/柱状图**（StockCharts / lineChartData）：latestYear 股票集合仅收录 shares > 0
3. **年报弹窗 ReportDialog**：
   - 饼图数据 preparePieChartData：过滤 shares = 0
   - 柱图数据 prepareBarChartData：过滤 shares = 0
   - 持仓排名 prepareTopPerformers：过滤 shares = 0
4. **GrowthInfo**：持仓价值计算 reduce 过滤 shares = 0（不影响数值，但语义明确）

#### Scenario: 2026 年 Amazon shares=0

- **GIVEN** yearData["2026"].stocks 包含 `{ name: "Amazon", shares: 0, price: 200 }`
- **WHEN** 用户打开 2026 年投资报告弹窗
- **THEN** 报告中的饼图、柱图、持仓排名均不含 Amazon
- **AND** Amazon 在持仓列表的"历史持仓"区域可见（因其在历史年份有过 shares > 0）

#### Scenario: 新增股票但从未有持仓

- **GIVEN** yearData["2026"].stocks 包含 `{ name: "TestStock", shares: 0 }`
- **AND** 该股票在所有年份 shares 均为 0
- **WHEN** 用户查看持仓列表
- **THEN** TestStock 不在持仓列表的任何区域显示
