# Delta Spec: portfolio-domain（数值边界保护必须测试）

## ADDED Requirements

### Requirement: 数值计算的边界保护必须有断言型测试

所有涉及除法、log、pow 等可能产生 NaN/Infinity 的纯函数和 hook，MUST 在对应测试文件中包含至少一个"边界输入 → 安全返回值"的断言。

涵盖范围：

1. **lib/portfolio/portfolio-metrics.ts**：computeReturnRate / computeYearlyGrowth / computeAllocation / computeYearNetReturnRate / computeYearGrowthRate
2. **hooks/useChartData.ts**：getLatestYearGrowthRate / lineChartData / barChartData / calculateInvestmentReturn
3. **hooks/useCalculations.ts**：getLatestYearGrowthRate / prepareLineChartData / preparePercentageBarChartData

#### Scenario: NaN/Infinity 输入

- **GIVEN** 任意函数收到 `NaN` 或 `Infinity` 作为输入
- **THEN** 返回值 SHALL 是有限数（包括 0、null、空字符串）
- **AND NOT** 是 NaN / Infinity / -Infinity

#### Scenario: 空数据集

- **GIVEN** `yearData={}` 或 `years=[]`
- **THEN** 所有计算函数 SHALL 不抛异常
- **AND** 返回合理的默认值（0、null、空数组、空字符串等）

#### Scenario: 除零保护

- **GIVEN** 除数为 0 或负数
- **THEN** 函数 SHALL 通过 `<= 0` 之类的早返回保护
- **AND** 测试 SHALL 显式断言早返回行为
