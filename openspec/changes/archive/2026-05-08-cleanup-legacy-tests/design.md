## Context

本提案是整个"测试基础建设"计划的最后一步。前 4 个提案构建了新的测试防线，本提案拆除旧的脚手架。

## Goals / Non-Goals

**Goals:**
- 物理删除 6 个旧前端集成测试 + 2 个根目录调试脚本
- 建立 `portfolio-codebase-hygiene` capability 作为未来的"禁止臃肿集成测试"约束锚点

**Non-Goals:**
- 不删除 `Combobox.test.tsx`（它是合理的独立 UI 组件测试）
- 不删除 `jest.config.js` / `jest.setup.js` 中的任何配置（它们仍被新的 lib/hooks 测试依赖）
- 不调整 CI 流水线（删除后 `npm test` 自然变快，无需改 CI）

## Decisions

### 决策：删除前必须验证的前置条件

本提案 SHALL 仅在以下条件全部满足时执行：
1. 提案 1–4 全部已归档
2. `npm run test:coverage` 报告 lib 100% + hooks ≥ 80%
3. 最近一次手动 E2E 回归（由人工跑过一遍主流程）通过

### 决策：为什么保留 Combobox.test.tsx

它测的是 `src/components/ui/combobox.tsx`（shadcn 的 UI primitive），与领域计算、hook、状态管理完全解耦。属于"独立 UI 组件测试"，与本次重构方向无冲突。

### 决策：根目录 `test-*.js` 是后端探针，直接删

`test-cash-transaction-duplicate.js` 与 `test-holdings-calculation.js` 都是对后端 Notion 同步 / 日内收益逻辑的调试脚本。它们的业务规则要么已写入 `portfolio-domain` spec（现金去重契约），要么属于后端独占（日内收益）。前端代码库保留它们只会造成误解。

## Risks / Trade-offs

- **风险：某些旧测试里隐藏了未被发现的业务规则** → 缓解：本提案 PR 合入前，reviewer MUST 逐文件扫一遍，任何发现的"新规则"必须先补到 `portfolio-domain` spec 并同步补 lib 测试（作为本提案的附带改动）。
- **权衡：删除比保留简单，但 git 历史里仍能找回** → `git log --follow` 可恢复，删除决定可回滚。

## Open Questions

1. 是否把 `portfolio-codebase-hygiene` 扩展为"lint 规则禁止 `StockPortfolioTracker.*.test.tsx` 再次出现"？建议作为 follow-up 考虑，本提案仅做声明式约束。
