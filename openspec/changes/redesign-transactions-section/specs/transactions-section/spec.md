## ADDED Requirements

### Requirement: 交易时间线渲染

Transactions SHALL 以时间倒序渲染所有 `stockTransactions` 与 `cashTransactions` 事件；每条事件 SHALL 至少显示：日期、类型（买入/卖出/存入/取出）、股票名或 `Cash`、金额、股数（若股票事件）。类型 SHALL 用颜色徽标区分（买入 = success，卖出 = danger，现金 = info）。

#### Scenario: 无交易

- **WHEN** 所有年度都无交易
- **THEN** 渲染 EmptyState

---

### Requirement: 筛选

SHALL 支持 3 个筛选维度：年度（多选）、事件类型（多选）、股票名（单选，空值 = 全部）。筛选 SHALL 在客户端完成，不请求后端。筛选条件 SHALL 持久化到 URL（如 `?txYear=2024,2025`）。

#### Scenario: 清空筛选

- **WHEN** 用户点击"重置"
- **THEN** 筛选条件回到默认，URL 中的筛选参数被移除

---

### Requirement: 不修改数据

Transactions section MUST NOT 提供编辑或删除交易的功能（编辑交易发生在 Holdings 抽屉内）；MUST NOT 调 setYearData 或任何 mutator。

#### Scenario: 增加删除按钮

- **WHEN** PR 给每条交易加垃圾桶按钮
- **THEN** code review 拒绝
