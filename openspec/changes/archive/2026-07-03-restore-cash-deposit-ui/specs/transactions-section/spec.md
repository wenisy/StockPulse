## ADDED Requirements

### Requirement: 交易时间线渲染

Transactions SHALL 以时间倒序渲染所有 `stockTransactions` 与 `cashTransactions` 事件；每条事件 SHALL 至少显示：日期、类型（买入/卖出/存入/取出）、股票名或 `Cash`、金额、股数（若股票事件）。类型 SHALL 用颜色徽标区分（买入 = success，卖出 = danger，现金 = info）。

#### Scenario: 无交易

- **WHEN** 所有年度都无交易
- **THEN** 渲染 EmptyState

---

### Requirement: 筛选

SHALL 支持年度与事件类型筛选。筛选 SHALL 在客户端完成，不请求后端。

#### Scenario: 类型筛选

- **WHEN** 用户选择「现金」类型筛选
- **THEN** 仅显示 deposit/withdraw 类现金记录

---

### Requirement: 不修改数据

Transactions section MUST NOT 提供编辑或删除已有交易的功能（编辑交易发生在 Holdings 抽屉内）。SHALL 允许通过既有 `callbacks.addCashTransaction` 追加新的现金存入/取出记录；该操作 MUST NOT 直接调用 `setYearData`，SHALL 走 PortfolioContext 注入的 callback 链路。

#### Scenario: 增加删除按钮

- **WHEN** PR 给每条历史交易加垃圾桶按钮
- **THEN** code review 拒绝

#### Scenario: 添加入金

- **WHEN** 用户在 Transactions 页点击「添加入金」并提交有效金额
- **THEN** `callbacks.addCashTransaction` 被调用，新现金记录出现在流水列表

---

### Requirement: 添加入金入口

Transactions 的 `PageHeader` SHALL 提供「添加入金」按钮，点击后展开与 Holdings 共用的 `CashTransactionForm`。

#### Scenario: 展开表单

- **WHEN** 用户点击「添加入金」
- **THEN** 现金操作表单显示在筛选器下方、流水列表上方