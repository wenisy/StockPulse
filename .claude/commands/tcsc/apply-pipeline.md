---
name: "TCSC: Apply Pipeline"
description: "/opsx:apply 的前置守门 + 完成态约束统一入口——review-result gate、pair-feature sentinel gate、代码任务边界识别、完成态触发 review-pipeline、完成态输出禁令。由 openspec-config-awareness.md 索引在 apply 时调起，也可手动执行。"
argument-hint: "<change-id>"
---

# TCSC Apply Pipeline

本命令体是 `/opsx:apply` 的外层门禁与完成态约束统一入口。`openspec-config-awareness.md` 仅负责索引到本文件；下列 Phase 是 apply 阶段约束的唯一权威来源。

## Phase 1 · review-result gate

## propose-review 评分检查（apply gate）

执行 `/opsx:apply <change-id>` 前，在 `.pair-pending-review` sentinel 检查**之前**，AI MUST 先检查 change 目录是否存在 `review-result.yaml`：

- **不存在** → 拒绝 apply。输出：
  `⛔ 未发现 review-result.yaml。请先运行 /tcsc:propose-review <change-id> 生成提案评分报告。`
  流程终止，不进入后续 apply。
- **存在但 `result == "return_to_step1"`**（评分 < 50）→ 拒绝 apply。输出提案评分未通过、列出 issues 清单，并提示修订 proposal/design/tasks 后重新运行 `/opsx:propose`，再跑 `/tcsc:propose-review`。流程终止。
- **存在且 `result == "pass"`**（评分 ≥ 50）→ 放行。继续后续 apply 流程：`.pair-pending-review` sentinel 检查（跨端衔接反问）→ 代码任务识别 + review-pipeline。

**重要**：本 gate 检查在 `.pair-pending-review` sentinel 检查**之前**执行（确保需求质量守门优先于跨端隔离守门）。

## Phase 1.2 · 编码评分 gate（apply 前置）

在 `/opsx:apply` 开始前，检查 change 目录是否存在 `coding-score-result.yaml`：

- **不存在** → 说明是首次 apply（无历史编码评分），跳过本 gate。评审将在本次 apply 完成后的 review-pipeline 中完成。
- **存在且 `result == "return_to_step1"`**（总分 < 50）→ ⛔ 阻断 apply。
  输出：
  ```
  ⛔ 编码评分未通过（<total_score>/100），请修复以下问题后重新 apply：

  ### 高风险问题
  <逐条列出 issues 中 severity=high 的项，含 evidence + suggestion>

  ### 中风险问题
  <逐条列出 issues 中 severity=medium 的项>
  ```
  流程终止，不进入后续 apply。
- **存在且 `result == "pass"`**（总分 ≥ 50）→ ✅ 放行。继续后续 apply 流程。

**重要**：本 gate 检查在测试存在性 gate **之前**执行（确保编码质��守门优先于测试存在性守门）。阻断时 MUST 输出上次的 issues 清单（含高风险/中风险项、evidence、suggestion），为研发提供修复指引。

## Phase 1.5 · 测试存在性 gate

本 gate 是**代码任务完成态 gate**，不是 apply 刚开始时立即判定。

每次准备将任一【功能/逻辑类代码任务】从 `- [ ]` 改为 `- [x]` 前，AI MUST 先执行本 gate；未通过时 SHALL NOT 修改该 checkbox。

当 AI 准备将任一【功能/逻辑类代码任务】标记为 `[x]`，或所有代码任务即将进入完成态时，AI MUST 检查本次变更涉及的功能/逻辑文件是否有对应测试文件/测试用例改动：

- **缺失配套测试**（且不属于例外类）→ ⛔ 拦截，提示补测试后再继续；对应功能/逻辑任务 SHALL NOT 标记为 `[x]`
- **已有配套测试** → 放行，进入 Phase 2 sentinel gate

测试存在性启发式（满足任一即可视为有配套测试，禁止机械要求每个功能文件都新增测试文件）：
- 本次变更新增或修改了测试文件
- 已有同模块测试文件被更新
- 同目录或约定测试目录已有覆盖该模块的测试，并且本次更新了相关测试用例
- 用户明确说明复用已有测试，且 verifier 能跑过相关测试

例外（无需配套测试）：纯文档（`*.md`）、纯配置（json/yaml/toml）、纯样式、纯移动/重命名（不改逻辑），或 `openspec/.tcsc-test.yml` 中 `skip: true` 的仓库。

注：本 gate 只做轻量「测试存在性」检查（看有没有测试文件/测试用例）；覆盖率的实测判定太重，不在 apply gate 做，放到 review-pipeline 的 verifier。

**重要**：gate 顺序 MUST 保持为 Phase 1 review-result gate → Phase 1.2 coding-score gate → Phase 1.5 测试存在性 gate → Phase 2 sentinel gate。

## Phase 2 · sentinel gate

## pair-feature sentinel 检查（apply gate）

执行 `/opsx:apply <change-id>` 前，AI MUST 检查 change 目录是否存在 `.pair-pending-review` 文件：

- **不存在**（99% 单端 change 走此路径）→ 跳过本段，直接进入后续 apply 流程（代码任务识别 + review-pipeline 等），0 行为干扰
- **存在**（跨端 feature，由 `/tcsc:pair-feature` Phase 4/Phase 6 自动创建）→ AI MUST 在执行实际 tasks 前反问用户：
  ```
  检测到 <change-id> 是跨端 feature 的一部分（由 /tcsc:pair-feature 编排），apply 后将自动衔接对端流程。继续 apply？
  ```
  - 用户回答 **yes** → ① 删除 `.pair-pending-review` 文件；② 读取 sentinel 中的 `pair_context_path`，写回 `.pair-context.yml.stages.<end>.proposal_locked = true` + `proposal_locked_at = <ISO8601>`（审计记录）；③ 继续正常 apply 流程
  - 用户回答 **no** → 中止 apply，0 文件改动，sentinel 保持不变

**重要**：sentinel 不存在时 MUST 直接跳过以上全部逻辑，不得反问、不得输出任何 pair-feature 相关提示。此设计保证单端 change 行为与 v1.5.0 字节级一致。


> post-apply 命令（review-pipeline）由 `openspec-config-awareness.md` 的 alwaysApply 强制执行，此处不再赘述。

## Phase 3 · 完成态硬约束

## apply 完成态硬约束

为避免该规则在实际执行中被忽略，以下约束 MUST 严格遵守：

1. **完成态定义**：所有【代码任务】（见下"边界识别"段）标记为 `[x]` 的瞬间即视为编码完成态。该瞬间是 `rules.apply` 的唯一触发时机。**忽略元任务是否完成**——元任务（如：创建 MR、push、archive、手工验证等。彼此**并列**无依赖，详见"元任务真实依赖真表"）可在 review 通过后由用户**按任意顺序**继续推进。

2. **执行优先级**：在编码完成态，MUST 先完成 `rules.apply` 指定的全部审查流水线动作（含 review-pipeline 产出的 coding-score-result.yaml），**然后**才允许给出任何 `/opsx:archive` 建议。审查流水线未返回结果之前，SHALL NOT 提议、暗示或主动调用归档操作。

3. **反面禁令**：不得以任何理由跳过 `rules.apply`，包括但不限于："改动看起来很小" / "只改了单行" / "改动显而易见" / "tasks 都是 trivial" / "审查上一次刚跑过" / "时间紧"。只要 `rules.apply` 存在，就 MUST 执行；只要 pipeline 未返回，就 MUST 不建议 archive。

4. **审查未返回时禁止建议 archive**：当审查流水线尚未给出最终结论（无论是因为正在运行、被暂停、还是失败），SHALL NOT 输出任何"建议执行 /opsx:archive""可以归档"等表述。

如果 `openspec/config.yaml` 不存在或没有对应的 `rules` 字段，则跳过。

## Phase 4 · 代码任务边界识别

## 代码任务 vs 元任务边界识别（简版）

`/opsx:apply` 完成态判定 MUST NOT 依赖 "tasks 全 [x]"。AI MUST 把 tasks.md 中的每一项分类：

- **代码任务**（本次 apply 必须完成）：文件创建/修改/删除、测试编写/运行、命令执行、配置变更
- **元任务**（本次 apply 跳过）：包含以下关键词**任意一个**即视为元任务（彼此**并列**，命中其一即匹配）：
  - `创建 MR` / `create PR`
  - `push` / `推送`
  - `archive` / `归档` / `/opsx:archive`
  - `手工验证` / `在真实环境跑`
  - `merge 之后`

### 元任务并列性硬约束（避免编造依赖）

元任务彼此**并列**，**互无强制顺序**。在 `tasks.md §6 元任务` 段中，AI **SHALL NOT** 编造任何元任务之间的依赖。下列编造模式均为**禁止**：

- ❌ "MR review 通过后 archive 本 change"（archive 不依赖 MR review，见下文真表）
- ❌ "push 后必须建 MR 才能 archive"（archive 不依赖 MR 存在）
- ❌ "merge 后再 archive"（merge 是 MR 流程的终点，archive 之前无需 MR）
- ❌ "手工验证完成后 push"（手工验证可任意顺序进行）

### 元任务真实依赖真表（**唯一**权威清单）

| 元任务 | 真实前置 | 备注 |
|---|---|---|
| 创建 MR | git push 分支到远端 | git/平台基础约束 |
| git push | 有本地 commit | git 基础约束 |
| `/opsx:archive` / `archive` / `归档` | **所有代码任务完成（tasks.md 全 [x]）** | archive 只需 tasks 全完成，不依赖 push / MR / PR / merge / review |
| 手工验证 / 在真实环境跑 | 无 | 用户自由决定时机 |
| merge 之后 | MR review 通过 + 平台合规检查 | 由 Gongfeng 平台决定，不由本规则约束 |

**触发条件**：所有【代码任务】标 `[x]` 的瞬间立即触发 `rules.apply`，**忽略元任务是否完成**。详细启发式由 `/tcsc:review-pipeline` Phase 0 维护。

### 测试左移约束（编码时强制）

apply 实现 tasks 时，对每一个【功能/逻辑类代码任务】，AI MUST 同步产出配套测试：

- 新增函数/方法/接口/组件 → MUST 有对应单元测试或集成测试
- 修改既有逻辑 → MUST 更新或补充覆盖该改动的测试
- “写了功能但未写测试” → 该任务 SHALL NOT 标记为 `[x]`，视为未完成

例外（无需配套测试）：纯文档（`*.md`）、纯配置（json/yaml/toml）、纯样式、纯移动/重命名（不改逻辑），或 `openspec/.tcsc-test.yml` 中 `skip: true` 的仓库。

测试存在性判断必须结合变更语义和项目测试约定；不得仅凭文件名机械判定，也不得为了绕过 gate 编造“已有测试覆盖”。

## Phase 5 · 完成态输出禁令

## 完成态输出禁令

当 AI 进入"代码任务完成"瞬间触发审查时，输出 MUST NOT 包含以下任何降级表达：

- `现在可以执行 /opsx:archive` / `你可以归档本次变更`
- `或先用 /verify / /tcsc:code-review`
- `All tasks complete! You can archive...` / `Implementation Complete`
- 任何把审查表述为"或者"、"也可以"、"建议"的句式

输出第一行 MUST 以"🔍 启动审查流水线..."或"📋 调用 verifier + reviewer..."等执行声明开头。违反禁令即视为 hallucination。

## 测试透明度报告（强制）

在输出"🔍 启动审查流水线..."执行声明之前，AI MUST 输出一行测试透明度报告，让用户知道本次变更的测试情况。

**格式**（三选一，根据 Phase 1.5 和 Phase 4 的实际判定）：

| 路径 | 格式 | 示例 |
|---|---|---|
| **豁免** | `📋 [测试: 豁免] 本次变更归类为 <类型>，无需配套测试。` | `📋 [测试: 豁免] 本次变更归类为纯模板/纯样式，无需配套测试。` |
| **新增测试** | `🧪 [测试: 新增] <N> 个测试用例，覆盖 <函数/组件名>。` | `🧪 [测试: 新增] 3 个测试用例，覆盖 formatDate/getStatus。` |
| **复用既有** | `✅ [测试: 复用] 复用已有 <N> 个测试用例，无需新增。` | `✅ [测试: 复用] 复用已有 12 个测试用例，无需新增。` |

- 豁免路径：命中 Phase 1.5 例外（纯文档/纯配置/纯样式/纯移动重命名/skip:true）
- 新增路径：测试存在性 gate 拦截后补写了测试
- 复用路径：既有测试文件已覆盖本次变更的函数/组件

违反本报告 = 视为输出禁令违规。
