---
name: "TCSC: Review Pipeline"
description: "触发完整的 Team Agent 审查流水线（verify + code-review），支持 serial/parallel 两种模式。可在 /opsx:apply 未自动触发审查时手动执行。"
argument-hint: "<change-name>"
---

手动触发完整的审查流水线。通过 Team Agent 编排 `/opsx:verify`（需求验收）+ `/tcsc:code-review`（代码审查），两个审查员在独立上下文中运行，看不到编码过程。

---

**调用方式**：`/tcsc:review-pipeline <change-name>`

**Steps**

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
