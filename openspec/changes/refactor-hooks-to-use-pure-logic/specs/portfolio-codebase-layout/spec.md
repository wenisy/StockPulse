## ADDED Requirements

### Requirement: hooks 必须通过 lib 完成领域计算

`src/hooks/**` 下的代码 SHALL NOT 内联实现以下任何领域计算（必须改为调用 `src/lib/portfolio/` 的对应函数）：

- 加权成本价、卖出剩余成本、实现盈亏的算式
- 现金交易后年度状态的不可变更新
- 股票交易后年度状态的不可变更新
- 新建年份的结转
- 跨年股票删除
- 行编辑合并保存
- 现金交易去重判定
- 货币换算与大数格式化
- 投资组合总价值、回报率、占比、年度增长率

#### Scenario: hook 内部出现等价于 lib 的算式

- **WHEN** 任何 hook 文件中出现 `(oldShares × oldCost + ...) / (oldShares + ...)` 这类加权成本价的本地实现
- **THEN** code review SHALL 拒绝合入并要求改为 `computeWeightedCostPrice(...)`

#### Scenario: hook 通过 lib 完成状态更新

- **WHEN** `addCashTransaction` 内部调用 `applyCashTransactionToYear`
- **THEN** 视为合规；hook 的 `setYearData(prev => applyCashTransactionToYear(prev, ...))` 是允许的标准范式

---

### Requirement: 删除 hook 间的重复实现

`useStockOperations.ts` 中的 `updateStockInternal` SHALL 被删除。`usePortfolioData.ts` 中的 `updateStock` 与 `useStockOperations.ts` 中之前的 `updateStockInternal` 这两份语义重复的实现 SHALL 收敛为同一条路径——即"由 hook 调用 lib 的 `applyStockTransactionToYear`"。

#### Scenario: 文件中仍存在 updateStockInternal

- **WHEN** 本提案合入后的 `useStockOperations.ts` 仍有 `updateStockInternal` 函数定义
- **THEN** 视为本提案未完成

#### Scenario: 两个 hook 都正确通过 lib 完成股票交易状态更新

- **WHEN** `usePortfolioData.updateStock` 与 `useStockOperations` 各自的交易处理路径都调用 `applyStockTransactionToYear`
- **THEN** 视为重复实现已收敛
