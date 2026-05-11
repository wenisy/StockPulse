## Why

`src/components/sections/` 下 13 个核心业务组件完全没有测试覆盖（0%）。用户每天使用的关键交互——持仓卡片显示已清仓状态、KPI 数字渲染、添加交易表单流程——一旦回归完全无测试拦截。

本次聚焦最高价值的 3 个场景：
1. `KpiCards`：渲染验证（5 张卡片均显示、数字不为 NaN/undefined）
2. `StockHoldingCard`：已清仓状态（shares=0）展示正确 + 历史持仓可见
3. `HoldingsSection`：添加交易表单展开/关闭流程

## What Changes

仅新增测试文件，不改源代码：

- 新建 `src/components/sections/__tests__/KpiCards.test.tsx`
- 新建 `src/components/sections/__tests__/StockHoldingCard.test.tsx`
- 新建 `src/components/sections/__tests__/HoldingsSection.test.tsx`

## Capabilities

**Modified Capabilities**:
- `component-structure`：核心 section 组件须有渲染验证测试

## Impact

- 仅新增测试，不改源代码
- 预期 +12 测试用例
- sections 层从 0% 提升到有基础覆盖
