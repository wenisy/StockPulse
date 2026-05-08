## Why

当前 `usePortfolioData`（611 行）和 `useStockOperations`（438 行）两个 hook 各自承担了太多职责：前者把"年份/筛选状态管理"、"后端数据同步 IO"、"价格刷新 IO"、"现金交易操作"、"股票操作"、"货币格式化"全部揉在一起；后者把"交易表单状态"和"行编辑状态"以及"股票 CRUD 操作"一并管理。

这带来的具体问题：

- **可读性差**：想了解"如何添加现金交易"需要在 600 行文件里找到对应片段
- **不好扩展**：想加新功能（如批量导入、撤销操作）需要改这两个巨型文件
- **测试覆盖不足**：两个大 hook 的整体覆盖率分别只有 46% 和 68%，很多分支难以触达
- **职责不清晰**：IO 操作（fetch / localStorage）和业务状态管理（yearData / years）混在一起，没有分层

现有的测试安全网（lib 100% 覆盖 + hooks 79%+）已经就位，是拆分的好时机。

## What Changes

将两个大 hook 按**业务领域**拆分为多个单职责 hook：

- `usePortfolioData` → 拆为：
  - `useYearData`：管理 yearData / years / filteredYears / selectedYear / comparisonYear / incrementalChanges 状态 + addNewYear / addCashTransaction / updateStock 操作
  - `usePortfolioSync`：负责所有后端 IO —— fetchJsonData / saveDataToBackend / handleTokenExpired / refreshPrices（价格刷新从 usePriceData 整合过来）

- `useStockOperations` → 拆为：
  - `useStockForm`：交易表单状态（newStockName / newShares / newPrice / newYearEndPrice / newStockSymbol / transactionType）+ resetForm + confirmAddNewStock
  - `useStockRowEdit`：行编辑状态（editingStockName / editedRowData）+ handleEditRow / handleSaveRow / handleInputChange + handleDeleteStock

- `usePortfolioData` 保留为**薄的聚合 hook**（向下兼容）：组合 useYearData + usePortfolioSync，保持现有调用接口不变（`StockPortfolioTracker` 组件零改动）

- 新 hook 全部有对应的 `__tests__` 文件

## Capabilities

### New Capabilities

- `hooks-structure`: 定义拆分后的 hook 目录结构、每个 hook 的单一职责边界、以及聚合 hook 的向下兼容策略

### Modified Capabilities

- `portfolio-codebase-layout`: 新增"聚合 hook 模式"约定——职责单一的子 hook 通过聚合 hook 向外暴露，避免大 hook 反模式

## Impact

- 新增：`src/hooks/useYearData.ts`、`src/hooks/usePortfolioSync.ts`、`src/hooks/useStockForm.ts`、`src/hooks/useStockRowEdit.ts`
- 修改：`src/hooks/usePortfolioData.ts`（改为聚合 useYearData + usePortfolioSync）、`src/hooks/useStockOperations.ts`（改为聚合 useStockForm + useStockRowEdit）
- 新增：4 个新 hook 对应的 `__tests__/` 测试文件
- 不改：`src/components/StockPortfolioTracker.tsx`（对外 API 不变）
- 不改：`src/lib/portfolio/`（纯函数层不动）
- CI：hooks 覆盖率阈值在新 hook 上同样适用
