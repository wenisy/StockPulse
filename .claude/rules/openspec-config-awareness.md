---
description: OpenSpec 配置感知规则。AI 在执行 OpenSpec 操作时，MUST 先读取 openspec/config.yaml 中的 rules 配置并遵循其中的指令。
alwaysApply: true
---

# OpenSpec 配置感知

当你执行 OpenSpec 操作时，你 MUST 先读取项目中的 `openspec/config.yaml` 文件，检查 `rules` 字段中是否有与当前操作对应的规则，并按规则逐条执行。

## 各操作的 pipeline 索引

以下索引表保留 **pre-action**（开始前/动手前）的文件读取指引；
**post-action** 命令直接在本规则中强制执行，不依赖"回到命令体"的回查。

| OpenSpec 操作 | 阶段 | AI MUST |
|---|---|---|---|
| `/opsx:propose` |
|  | 开始前 | 先读 `.codebuddy/commands/tcsc/propose-pipeline.md`（或 `.claude/...`）的 pre-propose clarify gate + docs 读取段，按其中规则执行 clarify 判定与 docs 读取 |
| `/opsx:apply` |
|  | 动手前 | 先读 `.codebuddy/commands/tcsc/apply-pipeline.md`（或 `.claude/...`）Phase 1~2（review-result gate + 测试存在性 gate + sentinel gate），按 gate 顺序逐项判定并执行 |
| `/opsx:archive` | 归档时（单阶段） | 执行 `/tcsc:archive-pipeline <change-name>` 走完 4 步 + 测试兜底流程 |
| `/opsx:continue` | 创建 tasks.md 时 | 读取 `openspec/config.yaml` 中的 `rules.tasks`（如存在）并遵循 |

---

## Post-propose 自动化（强制·不可跳过）

> 此规则在 `alwaysApply: true` 上下文始终生效。

`/opsx:propose <change-name>` 完成并写出 proposal/design/tasks/specs 后，你 MUST 立即在同一轮对话中依次执行：

1. `/tcsc:proposal-emit <change-name>` → 产出 `metadata.yaml`
2. `/tcsc:propose-review <change-name>` → 产出 `review-result.yaml`

不执行 = 合规违规，会导致 metadata.yaml 与 review-result.yaml 缺失，后续 apply 将被 gate 拒绝。

---

## Post-apply 自动化（强制·不可跳过）

> 此规则在 `alwaysApply: true` 上下文始终生效。

当 `/opsx:apply` 的所有代码任务标记为 `[x]` 后（忽略元任务：push/MR/archive/手工验证），你 MUST 立即触发：

1. `/tcsc:review-pipeline <change-name>` → verifier + code-review + test-result.yaml

不执行 = 合规违规，会导致 verifier 未运行、test-result.yaml 缺失，后续 archive 将被测试守门兜底拒绝。
