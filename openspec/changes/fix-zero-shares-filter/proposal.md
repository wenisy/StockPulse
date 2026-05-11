## Why

之前修复了持仓列表和折线图中展示 shares=0 空壳股票的问题，但 ReportDialog（投资年报弹窗）和 GrowthInfo 组件未做同步过滤，导致用户在打开 2026 年报告时仍能看到 Amazon 等已清仓（shares=0）的股票出现在饼图、柱图和持仓排名中。数据一致性在所有展示层需要统一。

## What Changes

- `src/components/ReportDialog.tsx`：三处 `preparePieChartData` / `prepareBarChartData` / `prepareTopPerformers` 过滤逻辑加 `&& stock.shares > 0`，清除 shares=0 的空壳条目
- `src/components/GrowthInfo.tsx`：持仓计算 reduce 加 `shares > 0` 过滤（数学上不影响结果，但语义更明确）
- 统一约定：所有组件在展示或计算"当年持仓"时都应过滤 shares=0

## Capabilities

**New Capabilities**: 无

**Modified Capabilities**:
- `portfolio-domain`：持仓展示过滤规则 —— shares=0 条目不得出现在任何面向用户的展示层（列表、图表、报告弹窗）

## Impact

- `src/components/ReportDialog.tsx`（3 处过滤）
- `src/components/GrowthInfo.tsx`（2 处过滤）
- 无 API 变更、无 breaking change
- 视觉影响：已清仓股票不再出现在年报饼图 / 柱图 / 排名列表
