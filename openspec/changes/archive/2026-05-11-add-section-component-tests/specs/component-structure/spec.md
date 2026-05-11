# Delta Spec: component-structure（section 组件须有基础渲染测试）

## ADDED Requirements

### Requirement: 核心 section 组件须有渲染验证测试

以下组件 MUST 在对应 `__tests__/` 目录下有测试文件，覆盖至少以下场景：

**KpiCards**：
- 渲染时 5 张卡片标签均出现
- 无数据时不崩溃（yearData={}）

**StockHoldingCard**：
- shares=0（已清仓）时显示"已清仓"标签，不显示正数市值
- shares>0 时显示当前市值

**HoldingsSection**：
- 初始状态不显示添加交易表单
- 点击"添加交易"按钮后表单展开

#### Scenario: KpiCards 空数据

- **GIVEN** yearData={}, years=[], totalValues={}
- **WHEN** KpiCards 渲染
- **THEN** 不抛异常，5 张卡片标签仍渲染

#### Scenario: StockHoldingCard 已清仓

- **GIVEN** latestYear 的该股票 shares=0，历史年份 shares>0
- **WHEN** 渲染 StockHoldingCard
- **THEN** 显示"已清仓"，不显示正数市值大字
