## ADDED Requirements

### Requirement: 添加入金入口

Holdings 的 `PageHeader` SHALL 在「添加交易」旁提供「添加入金」按钮。点击后 SHALL 展开现金操作表单，包含：交易年份、类型（存入/取出）、金额、当前年度现金余额提示。

#### Scenario: 展开现金表单

- **WHEN** 用户点击「添加入金」
- **THEN** 显示现金操作表单，含年份下拉、类型选择（默认存入）、金额输入

#### Scenario: 提交存入成功

- **WHEN** 用户选择「存入」、输入有效金额并点击「添加现金交易」
- **THEN** `callbacks.addCashTransaction` 被调用，对应年度 `cashBalance` 增加，流水追加 deposit 记录

#### Scenario: 与股票表单互斥展示

- **WHEN** 现金表单已展开
- **THEN** 股票交易表单不同时显示（同一时刻仅一种录入模式）