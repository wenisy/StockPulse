---
name: "TCSC: Review Pipeline"
description: "触发完整的 Team Agent 审查流水线（verify + code-review），支持 serial/parallel 两种模式。可在 /opsx:apply 未自动触发审查时手动执行。"
argument-hint: "<change-name>"
---

手动触发完整的审查流水线。通过 Team Agent 编排 `/opsx:verify`（需求验收）+ `/tcsc:code-review`（代码审查），两个审查员在独立上下文中运行，看不到编码过程。

---

**调用方式**：`/tcsc:review-pipeline <change-name>`

**Steps**

## Phase 0：代码任务边界识别（前置必须）

进入 Step 1 之前，AI MUST 先做一次"代码任务 vs 元任务"边界识别——确认是否真的进入审查阶段。本阶段是 `rules.apply` v2 触发条件的精准判定层。

### 0.1 启发式判别规则

把 tasks.md 中的每一项分类为以下两类之一：

**【代码任务】**（本次 apply 必须完成）：
1. **文件操作类**：文件创建 / 修改 / 删除（任何编辑器可执行的）
2. **测试类**：测试编写 / 测试运行 / 测试修复
3. **命令执行类**：`npm install` / `openspec validate` / `pip install` / `make build` 等 AI 能直接 Bash 跑的命令
4. **配置变更类**：json / yaml / toml / ini / .env 等配置文件修改
5. **凡是「在本次会话内 AI 能直接做完」的任务**

**【元任务】**（本次 apply 跳过，等用户后续完成）：
- 命中以下关键词之一即视为元任务（不区分大小写，模糊匹配）：

  | 关键词 | 典型出现场景 |
  |-------|-------------|
  | `创建 MR` / `create PR` / `提交合并请求` | git 流程,需要 push 后在 web 创建 |
  | `push` / `推送到远端` | git push 操作 |
  | `archive` / `归档` / `/opsx:archive` | OpenSpec 归档(本次 apply 之后) |
  | `手工验证` / `在真实环境跑` / `在 X repo 跑` | 需要用户跨环境真机验证 |
  | `MR merge 后` / `merge 之后` / `等待 review` | 需要等待 MR/PR 流程完成 |

- 凡是「需要等外部事件 / 需要用户手动操作」的任务

### 0.2 边缘情况兜底

模糊语义任务（如"在测试环境跑一次冒烟测试"——既能 AI bash 跑也可能需要人工）：
- **默认按代码任务处理**——宁可多触发审查也不漏触发
- 关键词覆盖度优先：先看是否命中元任务关键词，没命中就归入代码任务

### 0.3 触发判定

- 所有【代码任务】标 `[x]` → **立即进入 Step 1**，不等元任务完成
- 仍有【代码任务】未完成 → AI 应继续编码，不该已经在跑 review-pipeline
- 全部任务（代码 + 元）都 `[x]` → 同样进入 Step 1（向后兼容）

### 0.4 输出禁令（与 bridge rule 简版一致）

进入审查阶段后，AI 的输出 MUST NOT 包含以下任何降级表达：

- `现在可以执行 /opsx:archive` / `你可以归档本次变更`
- `或先用 /verify / /tcsc:code-review`
- `All tasks complete! You can archive...` / `Implementation Complete`
- 任何把审查表述为"或者"、"也可以"、"建议"的句式

输出第一行 MUST 以以下之一开头：

- `🔍 启动审查流水线...`
- `📋 调用 verifier + reviewer...`
- 或等价的"立即执行审查"声明

违反禁令即视为 hallucination，等同于跳过 `rules.apply` 硬约束。

---

## Step 1：确定变更名称

从参数获取 `<change-name>`。如果未提供：
- 通过 `openspec list --json` 列出活跃变更
- 提示用户选择

## Step 2：读取审查模式

读取 `openspec/config.yaml` 中的 `review_mode` 字段：
- `parallel`（默认）— 同时启动 verifier 和 reviewer
- `serial` — 先 verifier，通过后再 reviewer

如果 config.yaml 中没有 `review_mode` 字段，默认使用 `parallel`。

## Step 3：执行审查流水线

### 并行模式（review_mode: parallel）

1. 调用 `team_create("review-pipeline")` 创建审查团队

2. **同时** spawn 两个 agent：

   **verifier agent：**
   - name: "verifier"
   - 读取 `.codebuddy/rules/verifier-protocol.md` 的内容，注入为系统指令
   - prompt: "你是 verifier agent。按照 verifier-protocol.md 执行 /opsx:verify <change-name>，通过 send_message 将结果发送给 main。"
   - run_in_background: true

   **reviewer agent：**
   - name: "reviewer"
   - 读取 `.codebuddy/rules/reviewer-protocol.md` 的内容，注入为系统指令
   - prompt: "你是 reviewer agent。按照 reviewer-protocol.md 执行 /tcsc:code-review <change-name>，通过 send_message 将结果发送给 main。"
   - run_in_background: true

3. 等待两者均通过 send_message 返回结果

4. 调用 `team_delete("review-pipeline")`

5. 生成汇总报告

### 串行模式（review_mode: serial）

1. 调用 `team_create("review-pipeline")` 创建审查团队

2. spawn verifier agent（同并行模式步骤 2 的 verifier，run_in_background: true）

3. 等待 verifier 的 send_message：
   - 收到"需求验收未通过"（有 CRITICAL）→ 执行暂停路径
   - 收到"需求验收通过"（无 CRITICAL）→ 继续

4. **暂停路径**（verifier 有 CRITICAL）：
   - 调用 `team_delete("review-pipeline")`
   - 向用户展示 verifier 的完整报告
   - 提示："存在 CRITICAL 需求问题，建议先修复再审查代码。"
   - **流程终止，不启动 reviewer**

5. **继续路径**（verifier 无 CRITICAL）：
   - spawn reviewer agent（同并行模式步骤 2 的 reviewer，额外传入 verifier 的 WARNING 列表）
   - 等待 reviewer 的 send_message

6. 调用 `team_delete("review-pipeline")`

7. 生成汇总报告

## Step 4：输出汇总报告

```
## 📋 需求验收
<verifier 报告摘要：通过/未通过，CRITICAL 和 WARNING 数量，关键问题列表>

## 🔍 代码审查
<reviewer 报告摘要：CRITICAL/WARNING/SUGGESTION 数量，各维度状态，关键问题列表>

## 📊 结论
```

**结论规则：**
- 两者均无 CRITICAL → "✅ 全部通过，建议执行 /opsx:archive"
- 任一有 CRITICAL → "❌ 存在 CRITICAL 问题，需先修复"，列出所有 CRITICAL
- 并行模式且 verifier 有 CRITICAL → 额外注明"⚠️ 建议优先修复需求问题再关注代码质量"
