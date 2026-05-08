## Why

提案 3 完成后，hooks 已经退化为薄壳。本提案给 10 个 hook 各写一个 renderHook 测试，覆盖：
- hook 的 useState 初值与状态变换是否符合预期
- IO 边界（fetch / localStorage / alert）的 happy path 与失败路径
- hook 间的协作（如 `useStockOperations` 通过 props 接收的 setter 行为）

与提案 2 不同：这里允许 mock（fetch、localStorage），因为 hook 天然带 IO。

## What Changes

- 新增目录 `src/hooks/__tests__/`
- 为 10 个 hook 各创建 `<HookName>.test.ts`，使用 `@testing-library/react` 的 `renderHook`
- 关键 mock：`global.fetch`、`localStorage`（jest.setup.js 已有部分）
- 在 `jest.config.js` 为 `src/hooks/**` 添加覆盖率阈值 line 80% / branch 70% / function 80%

## Capabilities

### Modified Capabilities

- `portfolio-test-coverage`: 扩展阈值配置范围，新增 `src/hooks/**` 层的阈值条款。

### New Capabilities

无。

## Impact

- 新增：`src/hooks/__tests__/{usePortfolioData,useStockOperations,useCalculations,useChartData,useCalendarData,usePriceData,useStockData,useTableData,useUserManagement,useUserSettings}.test.ts`
- 修改：`jest.config.js`（hooks 目录的 coverageThreshold）
- 可能修改：`jest.setup.js`（如果现有 mock 不足以支持 renderHook）
- 不改：lib 源代码、hook 源代码、components
