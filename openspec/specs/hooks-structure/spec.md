# hooks-structure Specification

## Purpose
TBD - created by archiving change refactor-hooks-structure. Update Purpose after archive.
## Requirements
### Requirement: 单职责 hook 边界定义

每个子 hook SHALL 遵守以下职责边界，不得跨越：

| Hook | 单一职责 | 允许的状态 | 允许的 IO |
|------|---------|-----------|----------|
| `useYearData` | 本地投资组合数据的状态管理与操作 | yearData / years / filteredYears / selectedYear / comparisonYear / incrementalChanges / exchangeRates | 无（不发 fetch，不读 localStorage） |
| `usePortfolioSync` | 后端数据同步与 IO | isLoading / priceData / lastRefreshTime | fetch（fetchJsonData / saveDataToBackend / refreshPrices） |
| `useStockForm` | 股票交易表单的生命周期 | newStockName / newShares / newPrice / newYearEndPrice / newStockSymbol / transactionType | 无（通过 props 接收 setYearData 等 setter） |
| `useStockRowEdit` | 表格行编辑与删除操作 | editingStockName / editedRowData | 无（通过 props 接收 setter） |

#### Scenario: useYearData 内出现 fetch 调用

- **WHEN** `useYearData.ts` 中出现 `fetch(...)` 调用
- **THEN** code review SHALL 拒绝并要求移到 `usePortfolioSync`

#### Scenario: usePortfolioSync 持有 yearData 状态

- **WHEN** `usePortfolioSync.ts` 内部出现 `const [yearData, setYearData] = useState(...)`
- **THEN** code review SHALL 拒绝，yearData 状态 MUST 由 `useYearData` 持有

---

### Requirement: 聚合 hook 向下兼容策略

`usePortfolioData` 和 `useStockOperations` SHALL 保留为聚合 hook，其返回类型 `UsePortfolioDataReturn` 和 `UseStockOperationsReturn` 中的所有字段 MUST 保持与重构前完全一致（字段名、类型、语义三者均不变）。

#### Scenario: 组件调用聚合 hook 行为不变

- **WHEN** `StockPortfolioTracker` 调用 `usePortfolioData({ currentUser, isLoggedIn, setAlertInfo })`
- **THEN** 返回的所有字段（yearData, addNewYear, fetchJsonData 等）与重构前行为一致，组件无需任何修改

#### Scenario: 聚合 hook 缺少原有字段

- **WHEN** 重构后的 `usePortfolioData` 返回值中缺少任何原有字段（如 `incrementalChanges`）
- **THEN** TypeScript 编译 SHALL 报错，CI MUST 失败

---

### Requirement: 每个子 hook 不超过 200 行

单个子 hook 源文件（不含测试）SHALL 不超过 200 行（含注释和类型定义）。超出时应进一步拆分或提取纯函数到 lib 层。

#### Scenario: 新子 hook 文件超过 200 行

- **WHEN** `useYearData.ts` 或其他子 hook 文件行数超过 200
- **THEN** code review SHALL 要求说明原因或进一步拆分

#### Scenario: 通过提取 lib 函数控制行数

- **WHEN** 某个操作可以抽成纯函数
- **THEN** SHALL 优先提取到 `src/lib/portfolio/` 而非让 hook 文件变大

---

### Requirement: 子 hook 各有对应测试文件

每个新建的子 hook SHALL 在 `src/hooks/__tests__/` 下有同名测试文件，每个测试文件 SHALL 至少覆盖：happy path + 一条边界用例 + 一条错误路径（如果 hook 有 IO）。

#### Scenario: 新子 hook 无测试文件

- **WHEN** 提案合入后 `src/hooks/__tests__/useYearData.test.ts` 不存在
- **THEN** CI 的 `test:coverage` MUST 因为 hooks 覆盖率下降而失败

#### Scenario: hooks 覆盖率不低于重构前

- **WHEN** 重构完成后运行 `npm run test:coverage`
- **THEN** hooks 层覆盖率 MUST 不低于重构前水平（lines ≥ 79%, stmts ≥ 79%, funcs ≥ 75%, branches ≥ 55%）

