## Context

legacy `ControlPanel` 同时承载年份管理、现金交易、股票交易三类操作。重构为 Section 架构后，`HoldingsSection` 只迁移了股票交易表单；`TransactionsSection` 只做了只读流水展示。现金交易的业务逻辑仍由 `useTrackerCallbacks.addCashTransaction` → `useYearData.addCashTransaction` 链路处理，无需新 hook。

## Goals / Non-Goals

**Goals:**

- 恢复用户可记录的「存入/取出」现金操作入口
- 复用现有 callback 与 state，零后端改动
- 持仓页与流水页均可触达，降低发现成本

**Non-Goals:**

- 不新增 hook 或 API
- 不在流水页支持编辑/删除历史交易
- 不重构 QuickActions 或其他 Section

## Decisions

### 1. 抽取 `CashTransactionForm` 共享组件

**选择**：单一表单组件，Holdings 与 Transactions 各放一个入口按钮。

**理由**：两处 UI 字段完全一致（年份、类型、金额、余额提示），避免重复；与 legacy ControlPanel 现金区块字段对齐。

**备选**：仅在 Holdings 添加入口 —— 拒绝，用户可能在流水页查找入金记录。

### 2. 复用 `trackerState` 而非局部 state

**选择**：金额/类型/loading 继续用 `useTrackerState` 已有字段。

**理由**：`addCashTransaction` callback 已绑定这些 state；局部 state 会导致与 callback 脱节。

### 3. 修改 `transactions-section` 规格

**选择**：将「不修改数据」细化为「禁止编辑/删除历史流水；允许通过 `addCashTransaction` 追加现金记录」。

**理由**：流水页添加入金是合理 UX，但与旧 spec 字面冲突，需 delta 更新。

## Risks / Trade-offs

- **[Risk] 用户同时在两个页面打开现金表单** → 同一 `trackerState` 共享，后打开的会覆盖输入；可接受，与 legacy 行为一致。
- **[Risk] 表单提交后无论成功与否都关闭** → 与 legacy `addCashTransaction` 弹窗提示并存；失败时用户需重新打开表单。后续可改为仅在成功时关闭。