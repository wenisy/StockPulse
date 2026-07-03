# holdings-section Specification

## Purpose
TBD - created by archiving change redesign-holdings-section. Update Purpose after archive.
## Requirements
### Requirement: 持仓表列集合

`HoldingsTable` SHALL 至少渲染以下列（顺序固定）：股票名（Symbol）、持仓数、成本价、现价、市值、收益（金额 + 百分比）、年度切换下拉。

#### Scenario: 空持仓

- **WHEN** 当年无持仓
- **THEN** 渲染 EmptyState 而非空表

---

### Requirement: 行交互

表格行 SHALL 支持：

- hover 高亮（`hover:bg-accent/5`）
- 点击打开 `HoldingDetailDrawer`
- 右侧操作按钮区：编辑、删除（菜单或图标按钮）

MUST NOT 在单元格里直接 `<input>` 做行内编辑；所有编辑操作 SHALL 在抽屉内完成。

#### Scenario: 点击行

- **WHEN** 用户点击某一行
- **THEN** 右侧抽屉滑入，显示该股票详情 + 编辑表单

---

### Requirement: 详情抽屉

`HoldingDetailDrawer` SHALL 使用 Radix Dialog 的 side 变体（从右侧滑入），宽度 `max-w-md`，移动端占满宽度；保存逻辑 SHALL 复用 `useStockRowEdit`。

#### Scenario: 保存编辑

- **WHEN** 用户改动价格后点保存
- **THEN** `useStockRowEdit.handleSaveRow` 被调用，抽屉关闭，表格数值更新

---

### Requirement: 添加交易入口

Holdings 的 `PageHeader` SHALL 包含"+ 添加交易"按钮；点击后打开添加交易表单（对话框或抽屉），功能 SHALL 与 legacy 完全一致（类型、股数、价格、年度、symbol、yearEndPrice 等字段）。

#### Scenario: 添加成功

- **WHEN** 用户填完表单确认
- **THEN** `useStockForm.confirmAddNewStock` 被调用，新持仓出现在表格中

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

