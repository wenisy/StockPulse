## Why

前 7 个 redesign sub-change 全部落地后，legacy 分支（`?legacy=1` 入口、`StockPortfolioTracker.tsx` 及相关 tracker/ 目录）不再需要。清理掉可减少 bundle、移除重复代码。

## What Changes

- **BREAKING（内部）**：删除以下文件
  - `src/components/StockPortfolioTracker.tsx`
  - `src/components/tracker/`（AlertDialog、hooks/useTrackerState 等 —— 其逻辑已在各 section 中被新 UI 复用）
  - `src/components/LegacyTrackerEntry.tsx`
  - `src/components/__tests__/StockPortfolioTracker.test.tsx`
- 清理 `src/app/page.tsx` 的 `?legacy=1` 分支
- 清理无用的 legacy 展示组件：`InvestmentOverview.tsx`、`PortfolioOverview.tsx`、`PortfolioHeader.tsx`、`ControlPanel.tsx`、`StockTable.tsx`、`StockCharts.tsx`、`RetirementCalculator.tsx`、`ProfitLossCalendar.tsx`、`ReportDialog.tsx`、`GrowthInfo.tsx`、`CompoundGrowthDialog.tsx`（若新版本已完整替代；否则保留被复用的）
- 保留：`src/components/ui/*`、`src/components/user/*Dialog.tsx`（改版后继续用）、`src/components/sections/*`、`src/components/shell/*`、`src/components/calendar/*`（若 CalendarCard 复用其子组件）
- 测试：删除/改写依赖 legacy 组件的测试

## Capabilities

### Modified Capabilities
- `app-shell`：移除 legacy 回退条款（本提案 archive 后，`?legacy=1` 不再是要求）

## Impact

- 删除约 2000 行代码
- 净减少 bundle size
- 风险：如前 7 个 sub-change 有任何功能缺失，此清理会暴露问题
