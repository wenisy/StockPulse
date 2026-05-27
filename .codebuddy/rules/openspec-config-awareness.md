---
description: OpenSpec 配置感知规则。AI 在执行 OpenSpec 操作时，MUST 先读取 openspec/config.yaml 中的 rules 配置并遵循其中的指令。
alwaysApply: true
---

# OpenSpec 配置感知

当你执行以下 OpenSpec 操作时，你 MUST 先读取项目中的 `openspec/config.yaml` 文件，检查 `rules` 字段中是否有与当前操作对应的规则，并按规则逐条执行：

| 操作 | 对应 rules 字段 | 触发时机 |
|------|----------------|---------|
| `/opsx:apply` 编码完成 | `rules.apply` | **所有"代码任务"标记为 [x] 后**（不依赖元任务） |
| `/opsx:archive` 归档 | `rules.archive` | 执行归档前和归档后 |
| `/opsx:propose` 提案 | `rules.proposal` | 创建 proposal.md 时 |
| `/opsx:continue` 产出 | `rules.tasks` | 创建 tasks.md 时 |

**关键：`/opsx:apply` "代码任务"完成后，MUST 检查 `rules.apply` 是否存在。如果存在，按其指令触发审查流水线（verify + code-review）。这是强制步骤，不可跳过。**

## apply 完成态硬约束

为避免该规则在实际执行中被忽略，以下约束 MUST 严格遵守：

1. **完成态定义**：所有【代码任务】（见下"边界识别"段）标记为 `[x]` 的瞬间即视为编码完成态。该瞬间是 `rules.apply` 的唯一触发时机。**忽略元任务是否完成**——元任务（创建 MR / push / archive / 手工验证等）可在 review 通过后由用户继续推进。

2. **执行优先级**：在编码完成态，MUST 先完成 `rules.apply` 指定的全部审查流水线动作，**然后**才允许给出任何 `/opsx:archive` 建议。审查流水线未返回结果之前，SHALL NOT 提议、暗示或主动调用归档操作。

3. **反面禁令**：不得以任何理由跳过 `rules.apply`，包括但不限于："改动看起来很小" / "只改了单行" / "改动显而易见" / "tasks 都是 trivial" / "审查上一次刚跑过" / "时间紧"。只要 `rules.apply` 存在，就 MUST 执行；只要 pipeline 未返回，就 MUST 不建议 archive。

4. **审查未返回时禁止建议 archive**：当审查流水线尚未给出最终结论（无论是因为正在运行、被暂停、还是失败），SHALL NOT 输出任何"建议执行 /opsx:archive""可以归档"等表述。

如果 `openspec/config.yaml` 不存在或没有对应的 `rules` 字段，则跳过。

## 代码任务 vs 元任务边界识别（简版）

`/opsx:apply` 完成态判定 MUST NOT 依赖 "tasks 全 [x]"。AI MUST 把 tasks.md 中的每一项分类：

- **代码任务**（本次 apply 必须完成）：文件创建/修改/删除、测试编写/运行、命令执行、配置变更
- **元任务**（本次 apply 跳过，含以下关键词之一即视为元任务）：`创建 MR` / `create PR` / `push` / `推送` / `archive` / `归档` / `/opsx:archive` / `手工验证` / `在真实环境跑` / `merge 之后`

**触发条件**：所有【代码任务】标 `[x]` 的瞬间立即触发 `rules.apply`，**忽略元任务是否完成**。详细启发式由 `/tcsc:review-pipeline` Phase 0 维护。

## 完成态输出禁令

当 AI 进入"代码任务完成"瞬间触发审查时，输出 MUST NOT 包含以下任何降级表达：

- `现在可以执行 /opsx:archive` / `你可以归档本次变更`
- `或先用 /verify / /tcsc:code-review`
- `All tasks complete! You can archive...` / `Implementation Complete`
- 任何把审查表述为"或者"、"也可以"、"建议"的句式

输出第一行 MUST 以"🔍 启动审查流水线..."或"📋 调用 verifier + reviewer..."等执行声明开头。违反禁令即视为 hallucination。
