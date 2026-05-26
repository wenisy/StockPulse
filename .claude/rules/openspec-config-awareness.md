---
description: OpenSpec 配置感知规则。AI 在执行 OpenSpec 操作时，MUST 先读取 openspec/config.yaml 中的 rules 配置并遵循其中的指令。
alwaysApply: true
---

# OpenSpec 配置感知

当你执行以下 OpenSpec 操作时，你 MUST 先读取项目中的 `openspec/config.yaml` 文件，检查 `rules` 字段中是否有与当前操作对应的规则，并按规则逐条执行：

| 操作 | 对应 rules 字段 | 触发时机 |
|------|----------------|---------|
| `/opsx:apply` 编码完成 | `rules.apply` | 所有 tasks.md 任务标记为 [x] 后 |
| `/opsx:archive` 归档 | `rules.archive` | 执行归档前和归档后 |
| `/opsx:propose` 提案 | `rules.proposal` | 创建 proposal.md 时 |
| `/opsx:continue` 产出 | `rules.tasks` | 创建 tasks.md 时 |

**关键：`/opsx:apply` 编码完成后，MUST 检查 `rules.apply` 是否存在。如果存在，按其指令触发审查流水线（verify + code-review）。这是强制步骤，不可跳过。**

## 懒加载 skill 强制约束

当 `rules.proposal` 中的跨端检测指令判定命中 `pair_feature.trigger_signals` 时，AI MUST 通过 Read 工具加载 `pair_feature.skill_path` 路径下的 `SKILL.md` 完整内容。

- MUST NOT 仅凭 `config.yaml` 中的极简 `pair_feature` 段独自完成 5 步流程
- MUST NOT 跳过 Read SKILL.md 直接生成 proposal
- 加载失败时 MUST 提示用户，不得静默退化

## apply 完成态硬约束

为避免该规则在实际执行中被忽略，以下约束 MUST 严格遵守：

1. **完成态定义**：所有 `tasks.md` 中的任务标记为 `[x]` 的瞬间即视为编码完成态。该瞬间是 `rules.apply` 的唯一触发时机。

2. **执行优先级**：在编码完成态，MUST 先完成 `rules.apply` 指定的全部审查流水线动作，**然后**才允许给出任何 `/opsx:archive` 建议。审查流水线未返回结果之前，SHALL NOT 提议、暗示或主动调用归档操作。

3. **反面禁令**：不得以任何理由跳过 `rules.apply`，包括但不限于：
   - "改动看起来很小"
   - "只改了单行 / 只改了一个文件"
   - "改动显而易见、无需审查"
   - "tasks 都是 trivial"
   - "审查上一次刚跑过"
   - "时间紧"

   只要 `rules.apply` 存在，就 MUST 执行；只要 pipeline 未返回，就 MUST 不建议 archive。

4. **审查未返回时禁止建议 archive**：当审查流水线尚未给出最终结论（无论是因为正在运行、被暂停、还是失败），SHALL NOT 输出任何"建议执行 /opsx:archive""可以归档"等表述。

如果 `openspec/config.yaml` 不存在或没有对应的 `rules` 字段，则跳过。
